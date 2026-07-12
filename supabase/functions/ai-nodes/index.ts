import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { 
  buildAcademySystemPrompt,
  verifyAcademyMembership,
  getAcademyRole,
  checkRateLimit
} from "./_shared/architectPrompt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_ACTIONS = ['analyze', 'suggest', 'describe'];
const MAX_ID_LENGTH = 100;
const MAX_CONTEXT_LENGTH = 2000;

async function verifyAuth(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return { user: null, supabaseClient: null, error: 'Authentication required' };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: { user }, error } = await supabaseClient.auth.getUser();
  if (error || !user) {
    return { user: null, supabaseClient, error: 'Invalid or expired token' };
  }

  return { user, supabaseClient };
}

function validateInput(body: unknown) {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be an object');
  }

  const input = body as Record<string, unknown>;

  if (!input.action || typeof input.action !== 'string') {
    throw new Error('action is required and must be a string');
  }
  if (!VALID_ACTIONS.includes(input.action)) {
    throw new Error(`action must be one of: ${VALID_ACTIONS.join(', ')}`);
  }

  if (!input.academyId || typeof input.academyId !== 'string') {
    throw new Error('academyId is required');
  }

  const result: { academyId: string; action: string; nodeId?: string; context?: string } = {
    academyId: input.academyId,
    action: input.action
  };

  if (input.nodeId !== undefined) {
    if (typeof input.nodeId !== 'string') {
      throw new Error('nodeId must be a string');
    }
    if (input.nodeId.length > MAX_ID_LENGTH) {
      throw new Error(`nodeId must be less than ${MAX_ID_LENGTH} characters`);
    }
    result.nodeId = input.nodeId.trim();
  }

  if (input.context !== undefined) {
    if (typeof input.context !== 'string') {
      throw new Error('context must be a string');
    }
    if (input.context.length > MAX_CONTEXT_LENGTH) {
      throw new Error(`context must be less than ${MAX_CONTEXT_LENGTH} characters`);
    }
    result.context = input.context.trim();
  }

  if ((input.action === 'analyze' || input.action === 'describe') && !result.nodeId) {
    throw new Error(`nodeId is required for action: ${input.action}`);
  }

  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user, supabaseClient, error: authError } = await verifyAuth(req);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: authError || 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    const { academyId, action, nodeId, context } = validatedInput;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Rate limiting
    const rateLimitKey = `ai-nodes:${user.id}:${academyId}`;
    const rateLimit = checkRateLimit(rateLimitKey, { windowMs: 60000, maxRequests: 10 });
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ error: "Demasiadas peticiones. Espera un momento." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar membresía
    const isMember = await verifyAcademyMembership(supabaseClient, academyId, user.id);
    if (!isMember) {
      return new Response(
        JSON.stringify({ error: 'No eres miembro de esta academia' }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Obtener rol y verificar admin
    const role = await getAcademyRole(supabaseClient, academyId, user.id);
    const isAdmin = role === 'owner' || role === 'admin';

    // Obtener oracle_persona_prompt de la academia
    const { data: academy } = await supabaseClient
      .from('academies')
      .select('oracle_persona_prompt')
      .eq('id', academyId)
      .single();

    // Fetch nodes filtered by academy
    const [nodesRes, axesRes, edgesRes] = await Promise.all([
      supabaseClient.from("topology_nodes").select("*").eq("academy_id", academyId),
      supabaseClient.from("thematic_axes").select("*").eq("academy_id", academyId).eq("is_active", true),
      supabaseClient.from("topology_edges").select("*").eq("academy_id", academyId),
    ]);

    if (nodesRes.error) throw new Error(nodesRes.error.message);
    if (axesRes.error) throw new Error(axesRes.error.message);
    if (edgesRes.error) throw new Error(edgesRes.error.message);

    const nodes = nodesRes.data || [];
    const axes = axesRes.data || [];
    const edges = edgesRes.data || [];

    const axesList = axes.map((a: any) => `- **${a.label}**: ${a.description || a.id}`).join("\n");
    const nodesList = nodes.map((n: any) => `- ${n.label} (${n.axis}): ${n.description}`).join("\n");

    const SYSTEM_PROMPT = buildAcademySystemPrompt(
      academy?.oracle_persona_prompt || undefined,
      `## INSTRUCCIÓN ESPECÍFICA: Arquitecto Topológico
Eres el Arquitecto Topológico del Sistema Lagrange. Analizas y generas contenido sobre la red conceptual de tensiones.

## Ejes Temáticos Activos:
${axesList}

## Nodos Actuales:
${nodesList}

Tu misión es:
- Analizar conexiones entre conceptos
- Sugerir nuevos nodos o modificaciones
- Explorar tensiones latentes
- Generar descripciones profundas
- Mantener la incomodidad: los nodos deben generar fricción cognitiva

Responde siempre en JSON estructurado según la acción solicitada.`
    );

    let userPrompt = "";

    switch (action) {
      case "analyze":
        const targetNode = nodes.find((n: any) => n.id === nodeId);
        const nodeEdges = edges.filter((e: any) => e.source === nodeId || e.target === nodeId);
        userPrompt = `Analiza el nodo "${targetNode?.label || nodeId}":
- Descripción actual: ${targetNode?.description || "Sin descripción"}
- Conexiones: ${nodeEdges.map((e: any) => `${e.source}→${e.target} (${e.label})`).join(", ")}
- Contexto adicional: ${context || "ninguno"}

Genera un análisis profundo con:
1. Tensiones detectadas
2. Conexiones potenciales faltantes
3. Preguntas de fricción asociadas

Responde en JSON: { "analisis": string, "tensiones": string[], "conexiones_sugeridas": [{source, target, label}], "preguntas": string[] }`;
        break;

      case "suggest":
        userPrompt = `Basándote en la topología actual, sugiere un nuevo nodo conceptual que:
- Conecte tensiones existentes de forma novedosa
- Aporte fricción cognitiva
- Se relacione con: ${context || "los ejes principales"}

Responde en JSON: { "id": string, "label": string, "description": string, "axis": string, "type": "core"|"mechanism", "suggested_edges": [{target, label, tension}] }`;
        break;

      case "describe":
        const node = nodes.find((n: any) => n.id === nodeId);
        userPrompt = `Genera una descripción narrativa profunda para el nodo "${node?.label || nodeId}":
- Descripción actual: ${node?.description || "Sin descripción"}
- Eje: ${node?.axis || "Sin eje"}

La descripción debe:
- Explorar la naturaleza del concepto
- Conectar con otros nodos relacionados
- Provocar reflexión crítica

Responde en JSON: { "description_short": string (max 100 chars), "description_full": string (300+ palabras), "key_tensions": string[] }`;
        break;
    }

    console.log(`AI Nodes - User: ${user.id}, Academy: ${academyId}, Action: ${action}, IsAdmin: ${isAdmin}`);

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

    return new Response(JSON.stringify({ action, nodeId, result: parsed, isAdmin }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("AI Nodes error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
