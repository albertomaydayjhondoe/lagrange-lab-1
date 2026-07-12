import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getArchitectPrompt } from "./_shared/architectPrompt.ts";
import { validateAcademyMembership, formatAxesForPrompt, validateEje } from "./_shared/academyValidation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation
const VALID_ACTIONS = ['generate_batch', 'enhance', 'connect'];
// VALID_EJES now dynamically fetched from academy
const MAX_COUNT = 10;
const MAX_CONTEXT_LENGTH = 2000;

async function verifyAuth(req: Request): Promise<{ user: any; isAdmin: boolean; error?: string }> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return { user: null, isAdmin: false, error: 'Authentication required' };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: { user }, error } = await supabaseClient.auth.getUser();
  if (error || !user) {
    return { user: null, isAdmin: false, error: 'Invalid or expired token' };
  }

  // Check if user is admin
  const { data: isAdminData } = await supabaseClient.rpc('is_admin_user');
  const isAdmin = isAdminData === true;

  return { user, isAdmin };
}

function validateInput(body: unknown): {
  action: string;
  eje?: string;
  nivel?: number;
  count?: number;
  context?: string;
} {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be an object');
  }

  const input = body as Record<string, unknown>;

  // Validate action (required)
  if (!input.action || typeof input.action !== 'string') {
    throw new Error('action is required and must be a string');
  }
  if (!VALID_ACTIONS.includes(input.action)) {
    throw new Error(`action must be one of: ${VALID_ACTIONS.join(', ')}`);
  }

  const result: ReturnType<typeof validateInput> = {
    action: input.action
  };

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

  // Validate nivel
  if (input.nivel !== undefined) {
    const nivel = Number(input.nivel);
    if (isNaN(nivel) || !Number.isInteger(nivel) || nivel < 1 || nivel > 3) {
      throw new Error('nivel must be an integer between 1 and 3');
    }
    result.nivel = nivel;
  }

  // Validate count
  if (input.count !== undefined) {
    const count = Number(input.count);
    if (isNaN(count) || !Number.isInteger(count) || count < 1 || count > MAX_COUNT) {
      throw new Error(`count must be an integer between 1 and ${MAX_COUNT}`);
    }
    result.count = count;
  }

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

  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication - admin only for AI question operations
    const { user, isAdmin, error: authError } = await verifyAuth(req);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: authError || 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse and validate input
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
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

    const { action, eje, nivel, count, context } = validatedInput;
    
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

    // Build system prompt using shared architect prompt
    const basePrompt = getArchitectPrompt();
    const SYSTEM_PROMPT = `${basePrompt}

## INSTRUCCIÓN ESPECÍFICA: Generador Socrático
Eres el Generador Socrático del Sistema Lagrange. Creas preguntas que provocan "fricción cognitiva" - incomodidad productiva.

## Ejes Temáticos:
${axesList}

## Estado actual del banco:
${existingByEje}

## Reglas para preguntas:
- Niveles: 1 (introductorio), 2 (intermedio), 3 (profundo)
- Tensión: 0.0-1.0 (intensidad de la incomodidad, mínimo 0.6)
- Nunca ofrezcas respuestas, solo preguntas
- Evita moralizar; cuestiona estructuras
- Las preguntas deben ser incómodas pero productivas
- Si la tensión es baja, regenera

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

    console.log(`AI Questions - Admin: ${user.id}, Action: ${action}, Eje: ${eje || "N/A"}, Count: ${count || 1}`);

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
