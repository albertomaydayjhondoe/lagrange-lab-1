import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, eje, nivel, count, context } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("Supabase config missing");

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const [questionsRes, axesRes, nodesRes] = await Promise.all([
      supabase.from("socratic_questions").select("*"),
      supabase.from("thematic_axes").select("*").eq("is_active", true),
      supabase.from("topology_nodes").select("id, label, description, axis"),
    ]);

    if (questionsRes.error) throw new Error(questionsRes.error.message);
    if (axesRes.error) throw new Error(axesRes.error.message);

    const questions = questionsRes.data || [];
    const axes = axesRes.data || [];
    const nodes = nodesRes.data || [];

    const axesList = axes.map((a: any) => `- **${a.id}** (${a.label}): ${a.description || ""}`).join("\n");
    const existingByEje = axes.map((a: any) => {
      const qs = questions.filter((q: any) => q.eje === a.id);
      return `${a.label}: ${qs.length} preguntas (niveles: ${[...new Set(qs.map((q: any) => q.nivel))].join(", ")})`;
    }).join("\n");

    const SYSTEM_PROMPT = `Eres el Generador Socrático del Sistema Lagrange. Creas preguntas que provocan "fricción cognitiva" - incomodidad productiva.

## Ejes Temáticos:
${axesList}

## Estado actual del banco:
${existingByEje}

## Reglas para preguntas:
- Niveles: 1 (introductorio), 2 (intermedio), 3 (profundo)
- Tensión: 0.0-1.0 (intensidad de la incomodidad)
- Nunca ofrezcas respuestas, solo preguntas
- Evita moralizar; cuestiona estructuras
- Las preguntas deben ser incómodas pero productivas

Responde siempre en JSON estructurado.`;

    let userPrompt = "";

    switch (action) {
      case "generate_batch":
        const targetEje = eje || axes[Math.floor(Math.random() * axes.length)]?.id;
        const targetCount = Math.min(count || 3, 10);
        userPrompt = `Genera ${targetCount} preguntas socráticas para el eje "${targetEje}":
${context ? `Contexto: ${context}` : ""}

Distribuye los niveles:
- Al menos 1 pregunta de nivel 1 (introductorio)
- Al menos 1 de nivel 2 (intermedio) si count >= 2
- Al menos 1 de nivel 3 (profundo) si count >= 3

Responde en JSON: { "preguntas": [{ "texto": string, "eje": string, "nivel": 1|2|3, "tension": number, "corpus_ref": string|null }] }`;
        break;

      case "enhance":
        const ejeQuestions = questions.filter((q: any) => q.eje === eje);
        const sample = ejeQuestions.slice(0, 5).map((q: any) => `- Nivel ${q.nivel}: "${q.texto}"`).join("\n");
        userPrompt = `Analiza las preguntas existentes del eje "${eje}" y genera ${count || 3} nuevas que:
- Sean distintas a las existentes
- Cubran ángulos no explorados
- Aumenten progresivamente la tensión

Ejemplos existentes:
${sample || "No hay preguntas previas"}

Contexto: ${context || "ninguno"}

Responde en JSON: { "preguntas": [{ "texto": string, "nivel": 1|2|3, "tension": number, "novedad": string }] }`;
        break;

      case "connect":
        const nodeForQuestion = nodes.find((n: any) => n.id === context || n.axis === eje);
        userPrompt = `Genera una pregunta socrática que conecte el nodo "${nodeForQuestion?.label || context}" con el eje "${eje}":

Nodo: ${nodeForQuestion?.description || "Sin descripción"}
Eje: ${axes.find((a: any) => a.id === eje)?.description || eje}

La pregunta debe:
- Crear un puente conceptual entre el nodo y el eje
- Revelar tensiones ocultas
- Provocar cuestionamiento estructural

Responde en JSON: { "pregunta": string, "nivel": 1|2|3, "tension": number, "conexion_explicita": string }`;
        break;

      default:
        throw new Error(`Acción no reconocida: ${action}`);
    }

    console.log(`AI Questions - Action: ${action}, Eje: ${eje || "N/A"}, Count: ${count || 1}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Límite de peticiones excedido" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos agotados" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("Error en AI gateway");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || [null, content];
      parsed = JSON.parse(jsonMatch[1] || content);
    } catch {
      parsed = { raw: content, action };
    }

    return new Response(JSON.stringify({ action, eje, result: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("AI Questions error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
