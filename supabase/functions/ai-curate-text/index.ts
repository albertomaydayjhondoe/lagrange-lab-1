import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { dialogueContent, targetWordCount = 500 } = await req.json();

    if (!dialogueContent || !Array.isArray(dialogueContent)) {
      return new Response(
        JSON.stringify({ error: 'dialogueContent is required and must be an array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    const systemPrompt = `Eres un editor experto en filosofía socrática y narrativa reflexiva. Tu tarea es transformar diálogos socráticos en textos narrativos fluidos para podcast.

INSTRUCCIONES:
1. Convierte el diálogo en una narrativa fluida de aproximadamente ${targetWordCount} palabras
2. Mantén la esencia filosófica y las preguntas clave
3. Elimina redundancias y respuestas cortas sin contenido
4. Crea transiciones suaves entre ideas
5. El texto debe ser apropiado para ser leído en voz alta
6. Mantén un tono reflexivo y profundo
7. NO incluyas metadatos, timestamps o información técnica
8. Escribe en español, con un estilo elegante y accesible

FORMATO DE SALIDA:
Devuelve SOLO el texto curado, sin explicaciones adicionales.`;

    console.log('Processing dialogue with AI, target word count:', targetWordCount);

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
