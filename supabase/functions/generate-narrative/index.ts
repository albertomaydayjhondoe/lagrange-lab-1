import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getArchitectPrompt } from "../_shared/architectPrompt.ts";
import { fetchCorpusContext } from "../_shared/corpusRetrieval.ts";
import { resolveAcademyId } from "../_shared/academyContext.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation
const VALID_SOURCE_TYPES = ['dialogue', 'prompt', 'custom'];
const VALID_LENGTHS = ['short', 'medium', 'long'];
const VALID_EJES = ['Miedo', 'Control', 'SaludMental', 'Legitimidad', 'Responsabilidad'];
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ID_LENGTH = 100;
const MAX_CUSTOM_TEXT_LENGTH = 5000;

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
  sourceType: string;
  dialogueId?: string;
  promptId?: string;
  customText?: string;
  eje?: string;
  length?: string;
  academyId?: string;
} {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be an object');
  }

  const input = body as Record<string, unknown>;

  // Validate sourceType (required)
  if (!input.sourceType || typeof input.sourceType !== 'string') {
    throw new Error('sourceType is required and must be a string');
  }
  if (!VALID_SOURCE_TYPES.includes(input.sourceType)) {
    throw new Error(`sourceType must be one of: ${VALID_SOURCE_TYPES.join(', ')}`);
  }

  const result: ReturnType<typeof validateInput> = {
    sourceType: input.sourceType
  };

  // Validate dialogueId
  if (input.dialogueId !== undefined) {
    if (typeof input.dialogueId !== 'string') {
      throw new Error('dialogueId must be a string');
    }
    if (!UUID_REGEX.test(input.dialogueId)) {
      throw new Error('dialogueId must be a valid UUID');
    }
    result.dialogueId = input.dialogueId;
  }

  // Validate promptId
  if (input.promptId !== undefined) {
    if (typeof input.promptId !== 'string') {
      throw new Error('promptId must be a string');
    }
    if (input.promptId.length > MAX_ID_LENGTH) {
      throw new Error(`promptId must be less than ${MAX_ID_LENGTH} characters`);
    }
    result.promptId = input.promptId.trim();
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

  // Validate length
  if (input.length !== undefined) {
    if (typeof input.length !== 'string') {
      throw new Error('length must be a string');
    }
    if (!VALID_LENGTHS.includes(input.length)) {
      throw new Error(`length must be one of: ${VALID_LENGTHS.join(', ')}`);
    }
    result.length = input.length;
  }

  // Validate academyId
  if (input.academyId !== undefined) {
    if (typeof input.academyId !== 'string') {
      throw new Error('academyId must be a string');
    }
    if (!UUID_REGEX.test(input.academyId)) {
      throw new Error('academyId must be a valid UUID');
    }
    result.academyId = input.academyId;
  }

  // Validate customText
  if (input.customText !== undefined) {
    if (typeof input.customText !== 'string') {
      throw new Error('customText must be a string');
    }
    if (input.customText.length > MAX_CUSTOM_TEXT_LENGTH) {
      throw new Error(`customText must be less than ${MAX_CUSTOM_TEXT_LENGTH} characters`);
    }
    result.customText = input.customText.trim();
  }

  // Ensure required IDs are present based on sourceType
  if (result.sourceType === 'dialogue' && !result.dialogueId) {
    throw new Error('dialogueId is required when sourceType is "dialogue"');
  }
  if (result.sourceType === 'prompt' && !result.promptId) {
    throw new Error('promptId is required when sourceType is "prompt"');
  }
  if (result.sourceType === 'custom' && !result.customText) {
    throw new Error('customText is required when sourceType is "custom"');
  }

  return result;
}

const SYSTEM_PROMPT = `${getArchitectPrompt(`Eres un ensayista crítico del Sistema Lagrange. Tu misión es generar textos narrativos que exploren las tensiones entre poder, miedo, control y legitimidad.\n\n## Estilo\n- Escribe en un tono filosófico pero accesible\n- Usa metáforas y ejemplos concretos\n- Mantén una postura crítica pero no panfletaria\n- Los textos deben provocar reflexión, no adoctrinamiento\n\n## Estructura\n- Párrafos cortos y contundentes\n- Preguntas retóricas ocasionales\n- Citas o referencias cuando sean relevantes\n\n## Ejes temáticos disponibles:\n1. Miedo: El miedo como herramienta de control\n2. Control: Mecanismos de dominación institucional\n3. Salud Mental: Patologización del malestar legítimo\n4. Legitimidad: Construcción de autoridad\n5. Responsabilidad: Distribución asimétrica de consecuencias\n\nGenera textos que exploren estos temas con profundidad y matiz. Basa tu narrativa exclusivamente en el contenido fuente proporcionado.`)}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const { user, error: authError } = await verifyAuth(req);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: authError || 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate input
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let validatedInput;
    try {
      validatedInput = validateInput(body);
    } catch (validationError) {
      return new Response(
        JSON.stringify({ error: (validationError as Error).message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { sourceType, dialogueId, promptId, customText, eje, length, academyId } = validatedInput;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const resolvedAcademyId = await resolveAcademyId(supabase, academyId);

    let sourceContent = '';
    let sourceContext = '';

    // Fetch source content based on type
    if (sourceType === 'dialogue' && dialogueId) {
      const { data: dialogue, error } = await supabase
        .from('saved_dialogues')
        .select('title, dialogue_content, eje, summary, user_id')
        .eq('id', dialogueId)
        .eq('academy_id', resolvedAcademyId)
        .single();

      if (error || !dialogue) {
        throw new Error('Diálogo no encontrado');
      }

      // Verify user owns this dialogue
      if (dialogue.user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Access denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Parse dialogue content
      const content = dialogue.dialogue_content as { type: string; content: string }[];
      const dialogueText = content
        .map((entry) => {
          if (entry.type === 'oracle') return `Oráculo: ${entry.content}`;
          if (entry.type === 'user') return `Usuario: ${entry.content}`;
          return entry.content;
        })
        .join('\n\n');

      sourceContent = dialogueText;
      sourceContext = `Diálogo: "${dialogue.title}"${dialogue.eje ? ` (Eje: ${dialogue.eje})` : ''}`;
      
      if (dialogue.summary) {
        sourceContext += `\nResumen: ${dialogue.summary}`;
      }

    } else if (sourceType === 'prompt' && promptId) {
      const { data: question, error } = await supabase
        .from('socratic_questions')
        .select('texto, eje, nivel, tension')
        .eq('id', promptId)
        .eq('academy_id', resolvedAcademyId)
        .single();

      if (error || !question) {
        throw new Error('Pregunta no encontrada');
      }

      sourceContent = question.texto;
      sourceContext = `Pregunta socrática del eje "${question.eje}" (Nivel: ${question.nivel}, Tensión: ${question.tension})`;

    } else if (sourceType === 'custom' && customText) {
      sourceContent = customText;
      sourceContext = `Reflexión personalizada${eje ? ` sobre ${eje}` : ''}`;

    } else {
      throw new Error('Debes seleccionar una fuente válida (diálogo, pregunta o texto personalizado)');
    }

    const wordCount = length === 'short' ? 150 : length === 'long' ? 500 : 300;

    let corpusContext = '';
    try {
      const { context } = await fetchCorpusContext(supabase, resolvedAcademyId, eje, 4);
      corpusContext = context;
    } catch (corpusError) {
      console.warn('No se pudo cargar corpus para generate-narrative', corpusError);
    }
    
    const userPrompt = `
## Fuente
${sourceContext}

## Contenido fuente
${sourceContent}

${eje ? `## Eje temático principal: ${eje}` : ''}${corpusContext}

## Instrucciones
Genera un texto narrativo de aproximadamente ${wordCount} palabras que explore y expanda las ideas presentes en el contenido fuente. El texto debe mantener coherencia con los temas discutidos y profundizar en las tensiones identificadas, usando la perspectiva crítica del Sistema Lagrange.
`;

    console.log(`Generating narrative for user ${user.id} from ${sourceType}: "${sourceContext.substring(0, 50)}..."`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Límite de solicitudes excedido, intenta más tarde.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos de IA agotados.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI Gateway error:', errorText);
      throw new Error('Error generating narrative');
    }

    const data = await response.json();
    const narrative = data.choices?.[0]?.message?.content || '';

    console.log('Narrative generated successfully');

    return new Response(
      JSON.stringify({ 
        narrative, 
        eje, 
        sourceType,
        wordCount: narrative.split(/\s+/).length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Narrative generation error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
