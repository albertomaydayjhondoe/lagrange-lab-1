import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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

Genera textos que exploren estos temas con profundidad y matiz. Basa tu narrativa exclusivamente en el contenido fuente proporcionado.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sourceType, dialogueId, promptId, eje, length } = await req.json();
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

    let sourceContent = '';
    let sourceContext = '';

    // Fetch source content based on type
    if (sourceType === 'dialogue' && dialogueId) {
      const { data: dialogue, error } = await supabase
        .from('saved_dialogues')
        .select('title, dialogue_content, eje, summary')
        .eq('id', dialogueId)
        .single();

      if (error || !dialogue) {
        throw new Error('Diálogo no encontrado');
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
        .single();

      if (error || !question) {
        throw new Error('Pregunta no encontrada');
      }

      sourceContent = question.texto;
      sourceContext = `Pregunta socrática del eje "${question.eje}" (Nivel: ${question.nivel}, Tensión: ${question.tension})`;

    } else {
      throw new Error('Debes seleccionar una fuente válida (diálogo o pregunta)');
    }

    const wordCount = length === 'short' ? 150 : length === 'long' ? 500 : 300;
    
    const userPrompt = `
## Fuente
${sourceContext}

## Contenido fuente
${sourceContent}

${eje ? `## Eje temático principal: ${eje}` : ''}

## Instrucciones
Genera un texto narrativo de aproximadamente ${wordCount} palabras que explore y expanda las ideas presentes en el contenido fuente. El texto debe mantener coherencia con los temas discutidos y profundizar en las tensiones identificadas, usando la perspectiva crítica del Sistema Lagrange.
`;

    console.log(`Generating narrative from ${sourceType}: "${sourceContext.substring(0, 50)}..."`);

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
