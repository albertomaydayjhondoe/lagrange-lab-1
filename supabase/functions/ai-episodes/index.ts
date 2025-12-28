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
    const { action, eje, questionIds, context } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("Supabase config missing");

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const [episodesRes, questionsRes, axesRes, nodesRes] = await Promise.all([
      supabase.from("podcast_episodes").select("*"),
      supabase.from("socratic_questions").select("*"),
      supabase.from("thematic_axes").select("*").eq("is_active", true),
      supabase.from("topology_nodes").select("id, label, axis"),
    ]);

    if (episodesRes.error) throw new Error(episodesRes.error.message);
    if (questionsRes.error) throw new Error(questionsRes.error.message);

    const episodes = episodesRes.data || [];
    const questions = questionsRes.data || [];
    const axes = axesRes.data || [];
    const nodes = nodesRes.data || [];

    const existingTitles = episodes.map((e: any) => e.title).join(", ");
    const axesList = axes.map((a: any) => `- ${a.label}: ${a.description || ""}`).join("\n");

    const SYSTEM_PROMPT = `Eres el Director de Podcast del Sistema Lagrange. Diseñas episodios que exploran tensiones conceptuales a través del diálogo socrático.

## Ejes Temáticos:
${axesList}

## Episodios existentes:
${existingTitles || "Ninguno aún"}

## Estilo del podcast:
- Narrativo pero provocador
- Preguntas que incomodan productivamente
- Conexiones inesperadas entre conceptos
- Duración típica: 20-45 minutos

Responde siempre en JSON estructurado.`;

    let userPrompt = "";

    switch (action) {
      case "generate":
        const targetQuestions = questionIds 
          ? questions.filter((q: any) => questionIds.includes(q.id))
          : questions.filter((q: any) => q.eje === eje).slice(0, 5);
        
        const questionsText = targetQuestions.map((q: any) => `- "${q.texto}" (nivel ${q.nivel})`).join("\n");
        const axisNodes = nodes.filter((n: any) => n.axis === eje);

        userPrompt = `Genera un concepto de episodio de podcast para el eje "${eje}":

Preguntas a explorar:
${questionsText || "Generar nuevas preguntas"}

Nodos relacionados: ${axisNodes.map((n: any) => n.label).join(", ")}
Contexto: ${context || "ninguno"}

El episodio debe:
- Tener un título provocador
- Una descripción que enganche
- Estructura narrativa clara
- Duración estimada

Responde en JSON: { "title": string, "description": string, "duration_minutes": number, "sections": [{ "name": string, "duration_minutes": number, "content": string }], "suggested_question_ids": string[] }`;
        break;

      case "script":
        const episode = episodes.find((e: any) => e.eje === eje) || { title: context, eje };
        const episodeQuestions = questions.filter((q: any) => 
          episode.question_ids?.includes(q.id) || q.eje === eje
        ).slice(0, 7);

        userPrompt = `Genera un guión narrativo para el episodio "${episode.title || 'Nuevo episodio'}":

Eje: ${eje}
Preguntas base:
${episodeQuestions.map((q: any) => `- "${q.texto}"`).join("\n")}

El guión debe:
- Tener una apertura impactante
- Desarrollar tensiones progresivamente
- Incluir pausas reflexivas
- Cerrar con una pregunta abierta

Responde en JSON: { "intro": string (1-2 párrafos), "desarrollo": [{ "pregunta": string, "narrativa": string }], "cierre": string, "duracion_estimada_minutos": number }`;
        break;

      case "suggest_series":
        userPrompt = `Diseña una serie de 5 episodios que explore sistemáticamente los ejes del Sistema Lagrange:

Ejes disponibles: ${axes.map((a: any) => a.label).join(", ")}

La serie debe:
- Tener un arco narrativo coherente
- Conectar episodios entre sí
- Aumentar la tensión progresivamente
- Culminar en una síntesis provocadora

Responde en JSON: { "titulo_serie": string, "descripcion_serie": string, "episodios": [{ "numero": number, "titulo": string, "eje_principal": string, "ejes_secundarios": string[], "descripcion": string, "conexion_con_anterior": string }] }`;
        break;

      default:
        throw new Error(`Acción no reconocida: ${action}`);
    }

    console.log(`AI Episodes - Action: ${action}, Eje: ${eje || "N/A"}`);

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
    console.error("AI Episodes error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
