import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { 
  getArchitectPrompt, 
  validarPregunta, 
  getRefuerzoPrompt,
  formatCorpusContext,
  CorpusFragment
} from "./_shared/architectPrompt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schemas
const VALID_EJES = ['Miedo', 'Control', 'SaludMental', 'Legitimidad', 'Responsabilidad'];
const MAX_CONTEXT_LENGTH = 2000;
const MAX_HISTORY_LENGTH = 50;
const MAX_MESSAGE_LENGTH = 3000;
const MAX_INTENTS = 2; // Máximo intentos para generar pregunta válida

async function verifyAuth(req: Request): Promise<{ user: any; error?: string }> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return { user: null, error: 'Authentication required' };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: { user }, error } = await supabaseClient.auth.getUser();
  if (error || !user) {
    return { user: null, error: 'Invalid or expired token' };
  }

  return { user };
}

function validateInput(body: unknown): { 
  context?: string; 
  eje?: string; 
  nivel?: number; 
  conversationHistory?: { role: string; content: string }[];
  includeCorpus?: boolean;
} {
  if (!body || typeof body !== 'object') {
    return {};
  }

  const input = body as Record<string, unknown>;
  const result: ReturnType<typeof validateInput> = {};

  // Validate context
  if (input.context !== undefined) {
    if (typeof input.context !== 'string') {
      throw new Error('context must be a string');
    }
    if (input.context.length > MAX_CONTEXT_LENGTH) {
      throw new Error(`context must be less than ${MAX_CONTEXT_LENGTH} characters`);
    }
    result.context = input.context.trim();
  }

  // Validate eje
  if (input.eje !== undefined) {
    if (typeof input.eje !== 'string') {
      throw new Error('eje must be a string');
    }
    if (!VALID_EJES.includes(input.eje)) {
      throw new Error(`eje must be one of: ${VALID_EJES.join(', ')}`);
    }
    result.eje = input.eje;
  }

  // Validate nivel
  if (input.nivel !== undefined) {
    const nivel = Number(input.nivel);
    if (isNaN(nivel) || !Number.isInteger(nivel) || nivel < 1 || nivel > 3) {
      throw new Error('nivel must be an integer between 1 and 3');
    }
    result.nivel = nivel;
  }

  // Validate conversationHistory
  if (input.conversationHistory !== undefined) {
    if (!Array.isArray(input.conversationHistory)) {
      throw new Error('conversationHistory must be an array');
    }
    if (input.conversationHistory.length > MAX_HISTORY_LENGTH) {
      throw new Error(`conversationHistory must have at most ${MAX_HISTORY_LENGTH} entries`);
    }
    
    result.conversationHistory = input.conversationHistory.map((entry, index) => {
      if (!entry || typeof entry !== 'object') {
        throw new Error(`conversationHistory[${index}] must be an object`);
      }
      const e = entry as Record<string, unknown>;
      if (typeof e.role !== 'string' || !['oracle', 'user'].includes(e.role)) {
        throw new Error(`conversationHistory[${index}].role must be 'oracle' or 'user'`);
      }
      if (typeof e.content !== 'string') {
        throw new Error(`conversationHistory[${index}].content must be a string`);
      }
      if (e.content.length > MAX_MESSAGE_LENGTH) {
        throw new Error(`conversationHistory[${index}].content must be less than ${MAX_MESSAGE_LENGTH} characters`);
      }
      return { role: e.role, content: e.content.trim() };
    });
  }

  // Validate includeCorpus
  if (input.includeCorpus !== undefined) {
    result.includeCorpus = Boolean(input.includeCorpus);
  }

  return result;
}

// Fetch corpus fragments for context
async function fetchCorpusFragments(
  supabase: any, 
  eje: string | undefined,
  limit: number = 2
): Promise<CorpusFragment[]> {
  try {
    let query = supabase
      .from('corpus_fragments')
      .select('*')
      .order('tension', { ascending: false })
      .limit(limit * 2); // Fetch extra to filter by eje
    
    if (eje) {
      // Map eje to standard names
      const ejeMap: Record<string, string[]> = {
        'Miedo': ['Miedo', 'miedo'],
        'Control': ['Control', 'control'],
        'SaludMental': ['Salud Mental', 'SaludMental', 'salud mental'],
        'Legitimidad': ['Legitimidad', 'legitimidad'],
        'Responsabilidad': ['Responsabilidad', 'responsabilidad'],
      };
      const axisFilters = ejeMap[eje] || [eje.toLowerCase()];
      query = query.overlaps('axis', axisFilters);
    }

    const { data, error } = await query;
    
    if (error || !data || data.length === 0) {
      return [];
    }

    // Return up to limit fragments
    return data.slice(0, limit);
  } catch (error) {
    console.error('Error fetching corpus fragments:', error);
    return [];
  }
}

// Generate question with validation and retry
async function generateAndValidateQuestion(
  LOVABLE_API_KEY: string,
  systemPrompt: string,
  userPrompt: string,
  intento: number = 1
): Promise<any> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.85,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Límite de peticiones excedido. Intenta de nuevo más tarde.");
    }
    if (response.status === 402) {
      throw new Error("Créditos agotados. Añade más créditos a tu workspace.");
    }
    throw new Error("Error en AI gateway");
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No se recibió respuesta del modelo");
  }

  // Parse JSON response
  let parsedQuestion;
  try {
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || 
                      content.match(/```\n?([\s\S]*?)\n?```/) ||
                      [null, content];
    parsedQuestion = JSON.parse(jsonMatch[1] || content);
  } catch (parseError) {
    console.error("Error parsing AI response:", content);
    // Fallback: create structured response from raw text
    parsedQuestion = {
      pregunta: content.replace(/[{}"]/g, '').trim(),
      eje: "Miedo",
      nivel: 2,
      tension: 0.85,
      conexion: "Pregunta generada dinámicamente"
    };
  }

  // VALIDATE against Primer Mandamiento
  const validation = validarPregunta(parsedQuestion.tension, parsedQuestion.pregunta);
  
  if (!validation.valido && intento < MAX_INTENTS) {
    console.log(`Intento ${intento}: Pregunta rechazada - ${validation.razon}. Regenerando...`);
    const reinforcedPrompt = userPrompt + getRefuerzoPrompt(validation.razon);
    return generateAndValidateQuestion(LOVABLE_API_KEY, systemPrompt, reinforcedPrompt, intento + 1);
  }

  return {
    ...parsedQuestion,
    _validation: validation,
    _intentos: intento
  };
}

// Build system prompt for socratic oracle
function buildSystemPrompt(corpusContext?: string): string {
  const base = getArchitectPrompt();
  
  return `${base}

## INSTRUCCIÓN ESPECÍFICA: Generador de Preguntas Socráticas
Tu misión es generar preguntas que provoquen "fricción cognitiva" - incomodidad productiva que desafía asunciones y expone contradicciones.

${corpusContext || ''}

## Formato de respuesta:
Responde SOLO con un JSON válido con esta estructura:
{
  "pregunta": "La pregunta generada",
  "eje": "Uno de: Miedo, Control, SaludMental, Legitimidad, Responsabilidad",
  "nivel": 1-3 (1=introductorio, 2=intermedio, 3=profundo),
  "tension": 0.0-1.0 (intensidad de la fricción, mínimo 0.6),
  "conexion": "Breve explicación de por qué esta pregunta conecta con el contexto"
}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const { user, error: authError } = await verifyAuth(req);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: authError || 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse and validate input
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let validatedInput;
    try {
      validatedInput = validateInput(body);
    } catch (validationError) {
      return new Response(
        JSON.stringify({ error: (validationError as Error).message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { context, eje, nivel, conversationHistory, includeCorpus = true } = validatedInput;
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    
    // Fetch corpus fragments for context
    let corpusContext = '';
    if (includeCorpus && SUPABASE_URL && SUPABASE_ANON_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const fragments = await fetchCorpusFragments(supabase, eje);
      if (fragments.length > 0) {
        corpusContext = formatCorpusContext(fragments);
        console.log(`Socratic Oracle - Using ${fragments.length} corpus fragments`);
      }
    }

    // Build system prompt
    const systemPrompt = buildSystemPrompt(corpusContext);

    // Build user prompt
    let userPrompt: string;
    
    if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      // Dialogue continuation mode
      const historyText = conversationHistory.map(msg => {
        if (msg.role === 'oracle') {
          return `ORÁCULO: "${msg.content}"`;
        } else {
          return `USUARIO: "${msg.content}"`;
        }
      }).join('\n');

      userPrompt = `## Diálogo en curso:
${historyText}

## Instrucciones:
Basándote en el intercambio anterior, genera la siguiente pregunta socrática que:
- Continúe el diálogo de manera natural
- Aumente gradualmente la tensión y profundidad
- Cuestione las asunciones del usuario
- Exponga contradicciones en su razonamiento`;

      if (eje) {
        userPrompt += `\n- Enfócate en el eje: ${eje}`;
      }
    } else {
      // New question mode
      userPrompt = "Genera una pregunta socrática profunda para iniciar un diálogo";
      
      if (context) {
        userPrompt += ` basada en este contexto del usuario: "${context}"`;
      }
      
      if (eje) {
        userPrompt += `. Enfócate en el eje de tensión: ${eje}`;
      }
      
      if (nivel) {
        userPrompt += `. Nivel de profundidad: ${nivel} (1=introductorio, 2=intermedio, 3=profundo)`;
      }
    }

    console.log(`Socratic Oracle - User: ${user.id}, Eje: ${eje || 'N/A'}, Nivel: ${nivel || 'N/A'}, History: ${conversationHistory?.length || 0}, Corpus: ${includeCorpus}`);

    // Generate and validate question
    const result = await generateAndValidateQuestion(LOVABLE_API_KEY, systemPrompt, userPrompt);

    console.log(`Socratic Oracle - Generated in ${result._intentos} attempt(s), Valid: ${result._validation.valido}`);

    // Remove internal validation fields before returning
    const { _validation, _intentos, ...cleanResult } = result;

    return new Response(JSON.stringify(cleanResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in socratic-oracle function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
