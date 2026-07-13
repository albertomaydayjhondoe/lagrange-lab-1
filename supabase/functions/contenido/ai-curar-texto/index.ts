import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getArchitectPrompt } from "../../_shared/architectPrompt.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_DIALOGUE_ENTRIES = 100;
const MAX_WORD_COUNT = 2000;

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

function validateInput(body: unknown): { dialogueContent: any[]; targetWordCount: number } {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be an object');
  }

  const input = body as Record<string, unknown>;

  // Validate dialogueContent (required)
  if (!input.dialogueContent || !Array.isArray(input.dialogueContent)) {
    throw new Error('dialogueContent is required and must be an array');
  }
  
  if (input.dialogueContent.length > MAX_DIALOGUE_ENTRIES) {
    throw new Error(`dialogueContent must have at most ${MAX_DIALOGUE_ENTRIES} entries`);
  }

  // Validate targetWordCount (optional)
  let targetWordCount = 500;
  if (input.targetWordCount !== undefined) {
    const count = Number(input.targetWordCount);
    if (isNaN(count) || !Number.isInteger(count) || count < 50 || count > MAX_WORD_COUNT) {
      throw new Error(`targetWordCount must be an integer between 50 and ${MAX_WORD_COUNT}`);
    }
    targetWordCount = count;
  }

  return { dialogueContent: input.dialogueContent, targetWordCount };
}

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

    const { dialogueContent, targetWordCount } = validatedInput;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Build the dialogue text for AI processing
    let rawText = '';
    for (const entry of dialogueContent) {
      if (entry.type === 'oracle') {
        rawText += `ORÁCULO: ${entry.content}\n\n`;
      } else {
        rawText += `USUARIO: ${entry.content}\n\n`;
      }
    }

    const systemPrompt = `${getArchitectPrompt(`Eres un editor experto en filosofía socrática y narrativa reflexiva. Tu tarea es transformar diálogos socráticos en textos narrativos fluidos para podcast.\n\nINSTRUCCIONES:\n1. Convierte el diálogo en una narrativa fluida de aproximadamente ${targetWordCount} palabras\n2. Mantén la esencia filosófica y las preguntas clave\n3. Elimina redundancias y respuestas cortas sin contenido\n4. Crea transiciones suaves entre ideas\n5. El texto debe ser apropiado para ser leído en voz alta\n6. Mantén un tono reflexivo y profundo\n7. NO incluyas metadatos, timestamps o información técnica\n8. Escribe en español, con un estilo elegante y accesible\n\nFORMATO DE SALIDA:\nDevuelve SOLO el texto curado, sin explicaciones adicionales.`)}`;

    console.log(`Processing dialogue for user ${user.id} with AI, target word count:`, targetWordCount);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Transforma este diálogo socrático en un texto narrativo de aproximadamente ${targetWordCount} palabras:\n\n${rawText}` }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded, please try again later' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required, please add credits' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const curatedText = data.choices?.[0]?.message?.content || '';
    const wordCount = curatedText.split(/\s+/).filter((w: string) => w.length > 0).length;

    console.log('Text curated successfully, word count:', wordCount);

    return new Response(
      JSON.stringify({ 
        curatedText, 
        wordCount,
        originalLength: rawText.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Curate text error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
