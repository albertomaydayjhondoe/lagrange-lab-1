import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Eres un ensayista crítico del Sistema Lagrange. Tu misión es generar textos narrativos que exploren las tensiones entre poder, miedo, control y legitimidad.

## Estilo
- Escribe en un tono filosófico pero accesible
- Usa metáforas y ejemplos concretos
- Mantén una postura crítica pero no panfletaria
- Los textos deben provocar reflexión, no adoctrinamiento

## Estructura
- Párrafos cortos y contundentes
- Preguntas retóricas ocasionales
- Citas o referencias cuando sean relevantes

## Ejes temáticos disponibles:
1. Miedo: El miedo como herramienta de control
2. Control: Mecanismos de dominación institucional
3. Salud Mental: Patologización del malestar legítimo
4. Legitimidad: Construcción de autoridad
5. Responsabilidad: Distribución asimétrica de consecuencias

Genera textos que exploren estos temas con profundidad y matiz.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, eje, length } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    if (!prompt) {
      throw new Error('Prompt is required');
    }

    const wordCount = length === 'short' ? 150 : length === 'long' ? 500 : 300;
    
    const userPrompt = `
${eje ? `Eje temático principal: ${eje}` : ''}

Tema o punto de partida: ${prompt}

Genera un texto narrativo de aproximadamente ${wordCount} palabras que explore este tema desde la perspectiva crítica del Sistema Lagrange.
`;

    console.log(`Generating narrative for: "${prompt.substring(0, 50)}..."`);

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
      JSON.stringify({ narrative, eje, wordCount: narrative.split(/\s+/).length }),
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
