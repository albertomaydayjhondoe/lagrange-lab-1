import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DialogueEntry {
  type: 'oracle' | 'user';
  content: string;
  question?: {
    pregunta: string;
    eje: string;
    nivel: number;
    tension: number;
    conexion: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { dialogueId } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch the dialogue
    const { data: dialogue, error: fetchError } = await supabase
      .from('saved_dialogues')
      .select('*')
      .eq('id', dialogueId)
      .single();

    if (fetchError || !dialogue) {
      throw new Error('Diálogo no encontrado');
    }

    const dialogueContent = dialogue.dialogue_content as DialogueEntry[];

    // Build conversation text for summary
    let conversationText = '';
    dialogueContent.forEach((entry, index) => {
      if (entry.type === 'oracle') {
        const q = entry.question;
        conversationText += `[Oráculo - Eje: ${q?.eje || 'Reflexión'}, Nivel: ${q?.nivel || 1}]\n`;
        conversationText += `"${entry.content}"\n\n`;
      } else {
        conversationText += `[Usuario]\n${entry.content}\n\n`;
      }
    });

    const systemPrompt = `Eres un analista filosófico especializado en diálogos socráticos. Tu tarea es generar un resumen conciso pero profundo de un diálogo entre un usuario y un oráculo socrático.

El resumen debe:
1. Identificar los temas principales explorados
2. Destacar las tensiones o contradicciones que emergieron
3. Resumir la evolución del pensamiento del usuario
4. Mencionar los ejes temáticos predominantes (Miedo, Control, Salud Mental, Legitimidad, Responsabilidad)
5. Ser escrito en español, en tercera persona, máximo 3-4 oraciones

Responde SOLO con el resumen, sin introducciones ni explicaciones adicionales.`;

    console.log('Generating summary for dialogue:', dialogueId);

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
          { role: 'user', content: `Analiza y resume el siguiente diálogo socrático:\n\n${conversationText}` }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Límite de solicitudes excedido. Intenta más tarde.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos insuficientes.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI Gateway error:', errorText);
      throw new Error('Error al generar resumen');
    }

    const aiResponse = await response.json();
    const summary = aiResponse.choices?.[0]?.message?.content?.trim();

    if (!summary) {
      throw new Error('No se pudo generar el resumen');
    }

    // Update the dialogue with the summary
    const { error: updateError } = await supabase
      .from('saved_dialogues')
      .update({ summary })
      .eq('id', dialogueId);

    if (updateError) {
      console.error('Error updating dialogue:', updateError);
      throw new Error('Error al guardar el resumen');
    }

    console.log('Summary generated successfully');

    return new Response(
      JSON.stringify({ summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Summary generation error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
