import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation
const VALID_ACTIONS = ['analyze', 'generate', 'suggest_missing'];
const MAX_ID_LENGTH = 100;
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
  sourceId?: string;
  targetId?: string;
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

  // Validate sourceId
  if (input.sourceId !== undefined) {
    if (typeof input.sourceId !== 'string') {
      throw new Error('sourceId must be a string');
    }
    if (input.sourceId.length > MAX_ID_LENGTH) {
      throw new Error(`sourceId must be less than ${MAX_ID_LENGTH} characters`);
    }
    result.sourceId = input.sourceId.trim();
  }

  // Validate targetId
  if (input.targetId !== undefined) {
    if (typeof input.targetId !== 'string') {
      throw new Error('targetId must be a string');
    }
    if (input.targetId.length > MAX_ID_LENGTH) {
      throw new Error(`targetId must be less than ${MAX_ID_LENGTH} characters`);
    }
    result.targetId = input.targetId.trim();
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
  if ((input.action === 'analyze' || input.action === 'generate') && (!result.sourceId || !result.targetId)) {
    throw new Error(`sourceId and targetId are required for action: ${input.action}`);
  }

  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication - admin only for AI edge operations
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

    const { action, sourceId, targetId, context } = validatedInput;
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("Supabase config missing");

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const [nodesRes, edgesRes] = await Promise.all([
      supabase.from("topology_nodes").select("*"),
      supabase.from("topology_edges").select("*"),
    ]);

    if (nodesRes.error) throw new Error(nodesRes.error.message);
    if (edgesRes.error) throw new Error(edgesRes.error.message);

    const nodes = nodesRes.data || [];
    const edges = edgesRes.data || [];

    const edgeTypes = ["causal", "consequence", "enabler", "tension", "mechanism", "cycle"];
    const edgesList = edges.map((e: any) => {
      const src = nodes.find((n: any) => n.id === e.source);
      const tgt = nodes.find((n: any) => n.id === e.target);
      return `${src?.label || e.source} → ${tgt?.label || e.target}: "${e.label}" (${e.type}, tensión: ${e.tension})`;
    }).join("\n");

    const SYSTEM_PROMPT = `Eres el Analizador de Tensiones del Sistema Lagrange. Tu trabajo es analizar y generar conexiones (edges) entre conceptos.

## Tipos de conexión válidos:
- **causal**: A causa B
- **consequence**: A tiene como consecuencia B  
- **enabler**: A habilita/permite B
- **tension**: A y B están en tensión
- **mechanism**: A es un mecanismo de B
- **cycle**: A y B forman un ciclo de retroalimentación

## Conexiones actuales:
${edgesList}

Tu misión es:
- Analizar la calidad de conexiones existentes
- Detectar conexiones faltantes
- Generar etiquetas narrativas para conexiones
- Calcular niveles de tensión apropiados

Responde siempre en JSON estructurado.`;

    let userPrompt = "";

    switch (action) {
      case "analyze":
        const edge = edges.find((e: any) => e.source === sourceId && e.target === targetId);
        const srcNode = nodes.find((n: any) => n.id === sourceId);
        const tgtNode = nodes.find((n: any) => n.id === targetId);
        userPrompt = `Analiza la conexión entre "${srcNode?.label || sourceId}" y "${tgtNode?.label || targetId}":
- Label actual: ${edge?.label || "Sin conexión directa"}
- Tipo: ${edge?.type || "N/A"}
- Tensión: ${edge?.tension || "N/A"}
- Contexto: ${context || "ninguno"}

Genera:
1. Análisis de la relación conceptual
2. Sugerencia de mejora para el label
3. Evaluación del tipo y tensión

Responde en JSON: { "analisis": string, "label_sugerido": string, "tipo_sugerido": string, "tension_sugerida": number, "alternativas": [{label, type, tension}] }`;
        break;

      case "generate":
        const source = nodes.find((n: any) => n.id === sourceId);
        const target = nodes.find((n: any) => n.id === targetId);
        userPrompt = `Genera una conexión conceptual entre:
- Origen: "${source?.label || sourceId}" (${source?.description || ""})
- Destino: "${target?.label || targetId}" (${target?.description || ""})
- Contexto: ${context || "ninguno"}

La conexión debe:
- Expresar una relación de tensión significativa
- Ser provocadora pero coherente
- Usar vocabulario del Sistema Lagrange

Responde en JSON: { "label": string, "type": string (uno de: ${edgeTypes.join(", ")}), "tension": number (0.0-1.0), "justificacion": string }`;
        break;

      case "suggest_missing":
        userPrompt = `Analiza la topología actual y detecta conexiones faltantes entre nodos.

Considera:
- Nodos sin conexiones bidireccionales
- Ejes temáticos sin interconexión
- Ciclos de retroalimentación implícitos

Responde en JSON: { "sugerencias": [{ "source": string, "target": string, "label": string, "type": string, "tension": number, "razon": string }] } (máximo 5 sugerencias)`;
        break;

      default:
        throw new Error(`Acción no reconocida: ${action}`);
    }

    console.log(`AI Edges - Admin: ${user.id}, Action: ${action}, Source: ${sourceId || "N/A"}, Target: ${targetId || "N/A"}`);

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

    return new Response(JSON.stringify({ action, sourceId, targetId, result: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("AI Edges error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
