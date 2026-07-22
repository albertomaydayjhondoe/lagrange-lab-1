import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.run/@supabase/supabase-js@2";
import { 
  buildAcademySystemPrompt,
  getAcademyEjes,
  verifyAcademyMembership,
  validarPregunta, 
  getRefuerzoPrompt,
  checkRateLimit
} from "../_shared/architectPrompt.ts";
import { fetchCorpusFragments, fetchCorpusFragmentsWithRAG, formatCorpusContext } from "../_shared/corpusRetrieval.ts";
import { getEmbedding } from "../_shared/embeddings.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_GATEWAY_URL = (Deno.env.get("AI_GATEWAY_URL") ?? "https://api.openai.com/v1").replace(/\/$/, "");
const AI_CHAT_MODEL = Deno.env.get("AI_CHAT_MODEL") ?? "gpt-4o-mini";

// Constants
const MAX_CONTEXT_LENGTH = 2000;
const MAX_HISTORY_LENGTH = 50;
const MAX_MESSAGE_LENGTH = 3000;
const MAX_INTENTS = 2;
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minuto
const RATE_LIMIT_MAX = 10; // 10 requests por minuto

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

  return { user, supabaseClient };
}

function validateInput(body: unknown): { 
  academyId: string;
  context?: string; 
  eje?: string; 
  nivel?: number; 
  conversationHistory?: { role: string; content: string }[];
  includeCorpus?: boolean;
} {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body is required');
  }

  const input = body as Record<string, unknown>;
  
  // Validate academyId (required)
  if (!input.academyId || typeof input.academyId !== 'string') {
    throw new Error('academyId is required and must be a string');
  }
  
  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(input.academyId)) {
    throw new Error('academyId must be a valid UUID');
  }
  
  const result: { academyId: string; context?: string; eje?: string; nivel?: number; conversationHistory?: { role: string; content: string }[]; includeCorpus?: boolean } = {
    academyId: input.academyId
  };

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

  // Validate eje (string, validated later against academy axes)
  if (input.eje !== undefined) {
    if (typeof input.eje !== 'string') {
      throw new Error('eje must be a string');
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

// Generate question with validation and retry
async function generateAndValidateQuestion(
  AI_API_KEY: string,
  systemPrompt: string,
  userPrompt: string,
  intento: number = 1
): Promise<any> {
  const response = await fetch(`${AI_GATEWAY_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${AI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: AI_CHAT_MODEL,
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
    return generateAndValidateQuestion(AI_API_KEY, systemPrompt, reinforcedPrompt, intento + 1);
  }

  return {
    ...parsedQuestion,
    _validation: validation,
    _intentos: intento
  };
}

// Build system prompt for socratic oracle with academy-specific axes
function buildSystemPrompt(
  academyEjes: string[], 
  personaPrompt: string | null, 
  corpusContext?: string
): string {
  const ejeList = academyEjes.length > 0 
    ? academyEjes.join(', ') 
    : 'Miedo, Control, SaludMental, Legitimidad, Responsabilidad';
  
  const specificInstructions = `
## INSTRUCCIÓN ESPECÍFICA: Generador de Preguntas Socráticas
Tu misión es generar preguntas que provoquen "fricción cognitiva" - incomodidad productiva que desafía asunciones y expone contradicciones.

## Ejes de esta academia:
${ejeList}

${corpusContext || ''}

## Formato de respuesta:
Responde SOLO con un JSON válido con esta estructura:
{
  "pregunta": "La pregunta generada",
  "eje": "Uno de los ejes de esta academia",
  "nivel": 1-3 (1=introductorio, 2=intermedio, 3=profundo),
  "tension": 0.0-1.0 (intensidad de la fricción, mínimo 0.6),
  "conexion": "Breve explicación de por qué esta pregunta conecta con el contexto"
}`;

  return buildAcademySystemPrompt(personaPrompt || undefined, specificInstructions);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const { user, supabaseClient, error: authError } = await verifyAuth(req);
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

    const { academyId, context, eje, nivel, conversationHistory, includeCorpus = true } = validatedInput;
    
    const AI_API_KEY = Deno.env.get("AI_API_KEY");
    if (!AI_API_KEY) {
      throw new Error("AI_API_KEY is not configured");
    }

    // Rate limiting por (user_id, academy_id)
    const rateLimitKey = `oracle:${user.id}:${academyId}`;
    const rateLimit = checkRateLimit(rateLimitKey, {
      windowMs: RATE_LIMIT_WINDOW_MS,
      maxRequests: RATE_LIMIT_MAX
    });
    
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ 
          error: "Demasiadas peticiones. Espera un momento.",
          retryAfter: rateLimit.resetAt - Date.now()
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar membresía de la academia
    const isMember = await verifyAcademyMembership(supabaseClient, academyId, user.id);
    if (!isMember) {
      return new Response(
        JSON.stringify({ error: 'No eres miembro de esta academia' }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Obtener info de la academia (oracle_persona_prompt)
    const { data: academy } = await supabaseClient
      .from('academies')
      .select('oracle_persona_prompt')
      .eq('id', academyId)
      .single();

    // Obtener ejes de la academia
    const academyEjes = await getAcademyEjes(supabaseClient, academyId);

    // Validar eje contra los ejes de la academia
    if (eje && academyEjes.length > 0 && !academyEjes.includes(eje)) {
      return new Response(
        JSON.stringify({ error: `El eje "${eje}" no existe en esta academia` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Fetch corpus fragments for context (filtered by academy) with RAG
    let corpusContext = '';
    if (includeCorpus) {
      try {
        // Generate embedding for semantic search
        const contextText = [context, eje, nivel].filter(Boolean).join(' ');
        const queryEmbedding = await getEmbedding(
          contextText || "Genera una pregunta socrática sobre el eje especificado",
          AI_API_KEY
        );
        
        // Use RAG with vector similarity
        const fragments = await fetchCorpusFragmentsWithRAG(
          supabaseClient, 
          academyId, 
          queryEmbedding,
          eje
        );
        
        if (fragments.length > 0) {
          corpusContext = formatCorpusContext(fragments);
          console.log(`Socratic Oracle - Using ${fragments.length} corpus fragments with RAG`);
        } else {
          // Fallback to basic fetch if no RAG results
          const fallbackFragments = await fetchCorpusFragments(supabaseClient, academyId, eje);
          if (fallbackFragments.length > 0) {
            corpusContext = formatCorpusContext(fallbackFragments);
            console.log(`Socratic Oracle - Using ${fallbackFragments.length} corpus fragments (fallback)`);
          }
        }
      } catch (ragError) {
        console.warn('RAG fetch failed, using basic corpus:', ragError);
        // Fallback to basic fetch
        const fragments = await fetchCorpusFragments(supabaseClient, academyId, eje);
        if (fragments.length > 0) {
          corpusContext = formatCorpusContext(fragments);
          console.log(`Socratic Oracle - Using ${fragments.length} corpus fragments (basic)`);
        }
      }
    }

    // Build system prompt with academy-specific config
    const systemPrompt = buildSystemPrompt(academyEjes, academy?.oracle_persona_prompt || null, corpusContext);

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
    const result = await generateAndValidateQuestion(AI_API_KEY, systemPrompt, userPrompt);

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
