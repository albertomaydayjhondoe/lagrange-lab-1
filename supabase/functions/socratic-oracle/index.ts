import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LAGRANGE_SYSTEM_PROMPT = `Eres el Oráculo Socrático del Sistema Lagrange. Tu misión es generar preguntas que provoquen "fricción cognitiva" - incomodidad productiva que desafía asunciones y expone contradicciones.

## Los 5 Ejes de Tensión:
1. **Miedo**: El miedo como herramienta de control y su neutralización
2. **Control**: Mecanismos de dominación social, institucional y autoimpuesto
3. **SaludMental**: La patologización del malestar legítimo
4. **Legitimidad**: Fabricación de legitimidad y control de la narrativa
5. **Responsabilidad**: Distribución asimétrica de consecuencias

## Reglas para generar preguntas:
- Las preguntas deben ser incómodas pero productivas
- Nunca ofrezcas respuestas, solo preguntas
- El tono es filosófico, no terapéutico
- Evita moralizar; cuestiona estructuras, no personas
- La tensión debe ser alta pero no agresiva
- Conecta con el contexto del usuario cuando lo haya

## Formato de respuesta:
Responde SOLO con un JSON válido con esta estructura:
{
  "pregunta": "La pregunta generada",
  "eje": "Uno de: Miedo, Control, SaludMental, Legitimidad, Responsabilidad",
  "nivel": 1-3 (1=introductorio, 2=intermedio, 3=profundo),
  "tension": 0.0-1.0 (intensidad de la fricción),
  "conexion": "Breve explicación de por qué esta pregunta conecta con el contexto"
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { context, eje, nivel } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let userPrompt = "Genera una pregunta socrática profunda";
    
    if (context) {
      userPrompt += ` basada en este contexto del usuario: "${context}"`;
    }
    
    if (eje) {
      userPrompt += `. Enfócate en el eje de tensión: ${eje}`;
    }
    
    if (nivel) {
      userPrompt += `. Nivel de profundidad: ${nivel} (1=introductorio, 2=intermedio, 3=profundo)`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: LAGRANGE_SYSTEM_PROMPT },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Límite de peticiones excedido. Intenta de nuevo más tarde." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos agotados. Añade más créditos a tu workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Error en AI gateway");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No se recibió respuesta del modelo");
    }

    // Parse JSON response from AI
    let parsedQuestion;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || 
                        content.match(/```\n?([\s\S]*?)\n?```/) ||
                        [null, content];
      parsedQuestion = JSON.parse(jsonMatch[1] || content);
    } catch (parseError) {
      console.error("Error parsing AI response:", content);
      // Fallback: create structured response from raw text
      parsedQuestion = {
        pregunta: content.replace(/[{}"]/g, '').trim(),
        eje: eje || "Miedo",
        nivel: nivel || 2,
        tension: 0.85,
        conexion: "Pregunta generada dinámicamente"
      };
    }

    return new Response(JSON.stringify(parsedQuestion), {
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
