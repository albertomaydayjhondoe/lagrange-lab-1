import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.run/@supabase/supabase-js@2";
import { getArchitectPrompt } from "../_shared/architectPrompt.ts";
import { getAcademyContext } from "../_shared/academyContext.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_GATEWAY_URL = (Deno.env.get("AI_GATEWAY_URL") ?? "https://api.openai.com/v1").replace(/\/$/, "");
const AI_CHAT_MODEL = Deno.env.get("AI_CHAT_MODEL") ?? "gpt-4o-mini";

// Input validation
const VALID_ACTIONS = ['analyze', 'suggest', 'describe'];
const MAX_ID_LENGTH = 100;
const MAX_CONTEXT_LENGTH = 2000;

async function verifyAuth(req: Request): Promise<{ user: any; supabase: any; isPlatformAdmin: boolean; error?: string }> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return { user: null, supabase: null, isPlatformAdmin: false, error: 'Authentication required' };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: { user }, error } = await supabaseClient.auth.getUser();
  if (error || !user) {
    return { user: null, supabase: null, isPlatformAdmin: false, error: 'Invalid or expired token' };
  }

  // Check if user is platform admin
  const { data: isAdminData } = await supabaseClient.rpc('is_admin_user');
  const isPlatformAdmin = isAdminData === true;

  return { user, supabase: supabaseClient, isPlatformAdmin };
}

function validateInput(body: unknown): {
  action: string;
  academyId?: string;
  nodeId?: string;
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

  // Validate academy_id (optional - validated later against membership)
  if (input.academy_id !== undefined) {
    if (typeof input.academy_id !== 'string') {
      throw new Error('academy_id must be a string');
    }
    result.academyId = input.academy_id;
  }

  // Validate nodeId
  if (input.nodeId !== undefined) {
    if (typeof input.nodeId !== 'string') {
      throw new Error('nodeId must be a string');
    }
    if (input.nodeId.length > MAX_ID_LENGTH) {
      throw new Error(`nodeId must be less than ${MAX_ID_LENGTH} characters`);
    }
    result.nodeId = input.nodeId.trim();
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

  // Validate required fields based on action
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
    // Verify authentication
    const { user, supabase: authSupabase, isPlatformAdmin, error: authError } = await verifyAuth(req);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: authError || 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    const { action, academyId: requestedAcademyId, nodeId, context } = validatedInput;
    
    const AI_API_KEY = Deno.env.get("AI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    
    if (!AI_API_KEY) throw new Error("AI_API_KEY not configured");
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("Supabase config missing");

    // Platform admins have full access, otherwise validate academy membership
    let academyId: string;
    if (!isPlatformAdmin) {
      const academyContext = await getAcademyContext(authSupabase, user.id, requestedAcademyId);
      const isAcademyAdmin = academyContext.role === 'owner' || academyContext.role === 'admin';
      if (!isAcademyAdmin) {
        return new Response(
          JSON.stringify({ error: 'Academy admin access required' }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      academyId = academyContext.academyId;
    } else {
      // Platform admin: use requested academy or genesis
      academyId = requestedAcademyId || '00000000-0000-0000-0000-000000000001';
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Fetch nodes and axes from Supabase filtered by academy_id
    const [nodesRes, axesRes, edgesRes] = await Promise.all([
      supabase.from("topology_nodes").select("*").eq("academy_id", academyId),
      supabase.from("thematic_axes").select("*").eq("is_active", true).eq("academy_id", academyId),
      supabase.from("topology_edges").select("*").eq("academy_id", academyId),
    ]);

    if (nodesRes.error) throw new Error(nodesRes.error.message);
    if (axesRes.error) throw new Error(axesRes.error.message);
    if (edgesRes.error) throw new Error(edgesRes.error.message);

    const nodes = nodesRes.data || [];
    const axes = axesRes.data || [];
    const edges = edgesRes.data || [];

    // Build dynamic system prompt from DB data
    const axesList = axes.map((a: any) => `- **${a.label}**: ${a.description || a.id}`).join("\n");
    const nodesList = nodes.map((n: any) => `- ${n.label} (${n.axis}): ${n.description}`).join("\n");

    const SYSTEM_PROMPT = `${getArchitectPrompt(`Eres el Arquitecto Topológico del Sistema Lagrange. Analizas y generas contenido sobre la red conceptual de tensiones.\n\n## Ejes Temáticos Activos:\n${axesList}\n\n## Nodos Actuales:\n${nodesList}\n\nTu misión es:\n- Analizar conexiones entre conceptos\n- Sugerir nuevos nodos o modificaciones\n- Explorar tensiones latentes\n- Generar descripciones profundas\n\nResponde siempre en JSON estructurado según la acción solicitada.`)}`;

    let userPrompt = "";
    const responseFormat = {};

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

      default:
        throw new Error(`Acción no reconocida: ${action}`);
    }

    console.log(`AI Nodes - User: ${user.id}, Academy: ${academyId}, Action: ${action}, PlatformAdmin: ${isPlatformAdmin}, Node: ${nodeId || "N/A"}`);

    const response = await fetch(`${AI_GATEWAY_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_CHAT_MODEL,
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

    // Parse JSON response
    let parsed;
    try {
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || [null, content];
      parsed = JSON.parse(jsonMatch[1] || content);
    } catch {
      parsed = { raw: content, action };
    }

    return new Response(JSON.stringify({ action, nodeId, result: parsed }), {
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
