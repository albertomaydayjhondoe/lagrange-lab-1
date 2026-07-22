import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.run/@supabase/supabase-js@2";
import { getAcademyContext } from "../_shared/academyContext.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_GATEWAY_URL = (Deno.env.get("AI_GATEWAY_URL") ?? "https://api.openai.com/v1").replace(/\/$/, "");
const AI_CHAT_MODEL = Deno.env.get("AI_CHAT_MODEL") ?? "gpt-4o-mini";

// Rate limiting config
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_REGENERATIONS_PER_WINDOW = 3;

// In-memory rate limiting (in production, use Redis or Supabase)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

interface TopologyDelta {
  nodes_to_add: Array<{
    id: string;
    label: string;
    description: string;
    axis: string;
    type: string;
    x: number;
    y: number;
    weight: number;
    color: string;
    is_generated: boolean;
  }>;
  edges_to_add: Array<{
    id: string;
    source: string;
    target: string;
    tension: number;
    label: string;
    type: string;
  }>;
  nodes_to_attenuate: Array<{
    id: string;
    vitality_score: number;
    reason: string;
  }>;
  nodes_to_boost: Array<{
    id: string;
    vitality_score: number;
    pulse_intensity: number;
  }>;
  metadata: {
    regeneration_id: string;
    timestamp: string;
    active_axis: string;
    nodes_added: number;
    edges_added: number;
    nodes_attenuated: number;
  };
}

async function verifyAuth(req: Request): Promise<{ user: any; supabase: any; error?: string }> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return { user: null, supabase: null, error: 'Authentication required' };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: { user }, error } = await supabaseClient.auth.getUser();
  if (error || !user) {
    return { user: null, supabase: null, error: 'Invalid or expired token' };
  }

  return { user, supabase: supabaseClient };
}

function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const userLimit = rateLimitStore.get(userId);
  
  if (!userLimit || now > userLimit.resetAt) {
    rateLimitStore.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: MAX_REGENERATIONS_PER_WINDOW - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }
  
  if (userLimit.count >= MAX_REGENERATIONS_PER_WINDOW) {
    return { 
      allowed: false, 
      remaining: 0, 
      resetIn: userLimit.resetAt - now 
    };
  }
  
  userLimit.count++;
  return { 
    allowed: true, 
    remaining: MAX_REGENERATIONS_PER_WINDOW - userLimit.count, 
    resetIn: userLimit.resetAt - now 
  };
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function calculateNodePosition(
  existingNodes: Array<{ x: number; y: number }>,
  centerX = 400,
  centerY = 300
): { x: number; y: number } {
  // Try to find a position that doesn't overlap with existing nodes
  const minDistance = 80;
  let attempts = 0;
  let x: number, y: number;
  
  do {
    const angle = Math.random() * 2 * Math.PI;
    const distance = 100 + Math.random() * 150;
    x = centerX + Math.cos(angle) * distance;
    y = centerY + Math.sin(angle) * distance;
    attempts++;
  } while (
    attempts < 20 &&
    existingNodes.some(n => {
      const dx = n.x - x;
      const dy = n.y - y;
      return Math.sqrt(dx * dx + dy * dy) < minDistance;
    })
  );
  
  return { x: Math.round(x), y: Math.round(y) };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const { user, supabase: authSupabase, error: authError } = await verifyAuth(req);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: authError || 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse academy_id from request body
    let requestedAcademyId: string | undefined;
    try {
      const body = await req.json();
      requestedAcademyId = body?.academy_id;
    } catch {
      // academy_id is optional, defaults to genesis
    }

    // Validate membership and get academy context
    const academyContext = await getAcademyContext(authSupabase, user.id, requestedAcademyId);

    // Check if user has admin/owner role in the academy
    const isAcademyAdmin = academyContext.role === 'owner' || academyContext.role === 'admin';
    if (!isAcademyAdmin) {
      return new Response(
        JSON.stringify({ error: 'Academy admin access required' }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const academyId = academyContext.academyId;

    // Check rate limit (keyed by user+academy for multi-tenant isolation)
    const rateKey = `${user.id}:${academyId}`;
    const rateCheck = checkRateLimit(rateKey);
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded',
          retryAfterMs: rateCheck.resetIn,
          message: `Demasiadas regeneraciones. Espera ${Math.ceil(rateCheck.resetIn / 1000)} segundos.`
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const AI_API_KEY = Deno.env.get("AI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!AI_API_KEY) throw new Error("AI_API_KEY not configured");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase config missing");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch current topology state filtered by academy_id
    const [nodesRes, edgesRes, axesRes, questionsRes, dialoguesRes, interactionsRes] = await Promise.all([
      supabase.from("topology_nodes").select("*").eq("academy_id", academyId),
      supabase.from("topology_edges").select("*").eq("academy_id", academyId),
      supabase.from("thematic_axes").select("*").eq("is_active", true).eq("academy_id", academyId),
      supabase.from("socratic_questions").select("*").eq("academy_id", academyId).order("created_at", { ascending: false }).limit(10),
      supabase.from("saved_dialogues").select("*").order("created_at", { ascending: false }).limit(5),
      supabase.from("user_interactions").select("node_id, created_at").eq("academy_id", academyId).order("created_at", { ascending: false }).limit(50),
    ]);

    if (nodesRes.error) throw new Error(`Error fetching nodes: ${nodesRes.error.message}`);
    if (edgesRes.error) throw new Error(`Error fetching edges: ${edgesRes.error.message}`);
    if (axesRes.error) throw new Error(`Error fetching axes: ${axesRes.error.message}`);

    const nodes = nodesRes.data || [];
    const edges = edgesRes.data || [];
    const axes = axesRes.data || [];
    const questions = questionsRes.data || [];
    const dialogues = dialoguesRes.data || [];
    const interactions = interactionsRes.data || [];

    // Calculate which nodes need attention based on interactions
    const nodeInteractionCounts = new Map<string, number>();
    interactions.forEach(i => {
      nodeInteractionCounts.set(i.node_id, (nodeInteractionCounts.get(i.node_id) || 0) + 1);
    });

    // Identify nodes to attenuate (no interactions, already generated, not core)
    const nodesToAttenuate: TopologyDelta['nodes_to_attenuate'] = nodes
      .filter(n => n.is_generated && !nodeInteractionCounts.has(n.id))
      .map(n => ({
        id: n.id,
        vitality_score: Math.max(0.1, (n.vitality_score || 0.5) - 0.1),
        reason: 'Sin interacciones recientes'
      }));

    // Identify nodes to boost (high interaction count)
    const nodesToBoost: TopologyDelta['nodes_to_boost'] = nodes
      .filter(n => (n.interaction_count || 0) > 3)
      .map(n => ({
        id: n.id,
        vitality_score: Math.min(1, (n.vitality_score || 0.5) + 0.1),
        pulse_intensity: Math.min(1, (n.interaction_count || 0) / 10)
      }));

    // Determine active axis based on recent interactions
    const axisInteractionCounts = new Map<string, number>();
    interactions.forEach(i => {
      const node = nodes.find(n => n.id === i.node_id);
      if (node) {
        axisInteractionCounts.set(node.axis, (axisInteractionCounts.get(node.axis) || 0) + 1);
      }
    });
    
    let activeAxis = axes[0]?.id || 'miedo';
    let maxAxisCount = 0;
    axisInteractionCounts.forEach((count, axis) => {
      if (count > maxAxisCount) {
        maxAxisCount = count;
        activeAxis = axis;
      }
    });

    // Build context for AI from recent content
    const recentQuestions = questions.slice(0, 3).map(q => `- "${q.texto}" (${q.eje})`).join('\n');
    const recentDialogueSnippets = dialogues
      .slice(0, 2)
      .map(d => `- ${d.title || 'Sin título'}: ${(d.summary || '').substring(0, 100)}...`)
      .join('\n');

    // Check if we should generate new content
    const shouldGenerateNodes = Math.random() > 0.3; // 70% chance to generate
    const shouldGenerateEdges = Math.random() > 0.5; // 50% chance to generate

    const delta: TopologyDelta = {
      nodes_to_add: [],
      edges_to_add: [],
      nodes_to_attenuate: nodesToAttenuate,
      nodes_to_boost: nodesToBoost,
      metadata: {
        regeneration_id: generateId('regen'),
        timestamp: new Date().toISOString(),
        active_axis: activeAxis,
        nodes_added: 0,
        edges_added: 0,
        nodes_attenuated: nodesToAttenuate.length
      }
    };

    // Generate new nodes using AI if appropriate
    if (shouldGenerateNodes) {
      const SYSTEM_PROMPT = `Eres el Arquitecto Topológico del Sistema Lagrange. Analizas y generas contenido sobre la red conceptual de tensiones.

## Ejes Temáticos Activos:
${axes.map(a => `- ${a.label}: ${a.description || a.id}`).join('\n')}

## Nodos Actuales:
${nodes.map(n => `- ${n.label} (${n.axis}): ${n.description?.substring(0, 100) || ''}`).join('\n')}

## Preguntas Socráticas Recientes:
${recentQuestions || 'Ninguna reciente'}

## Diálogos Recientes:
${recentDialogueSnippets || 'Ninguno reciente'}

Tu misión es generar NUEVOS nodos conceptuales derivados de las tensiones y preguntas actuales.
Cada nodo debe:
- Conectar lógicamente con conceptos existentes
- Representar una tensión o perspectiva nueva
- Tener un ID único, label corto, y descripción provocadora
- Especificar el eje temático al que pertenece

Responde SIEMPRE en JSON válido con este formato:
{
  "nodes": [
    {
      "id": "node_descripcion_corta",
      "label": "Label del Nodo",
      "description": "Descripción provocadora de 1-2 oraciones",
      "axis": "nombre_del_eje",
      "type": "core|mechanism"
    }
  ]
}
Máximo 2 nodos por respuesta.`;

      const userPrompt = `Basándote en la actividad reciente del sistema:
- Preguntas socráticas activas: ${questions.length > 0 ? 'Hay preguntas recientes' : 'No hay preguntas recientes'}
- Diálogos guardados: ${dialogues.length > 0 ? dialogues.length + ' diálogos' : 'Sin diálogos'}
- Eje más activo: ${activeAxis}

Sugiere nodos que expandan la conversación actual de forma significativa.`;

      console.log(`Generating topology delta for user ${user.id}, academy ${academyId}`);

      const aiResponse = await fetch(`${AI_GATEWAY_URL}/chat/completions`, {
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
          max_tokens: 800,
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const aiContent = aiData.choices?.[0]?.message?.content || "";

        try {
          const jsonMatch = aiContent.match(/```json\n?([\s\S]*?)\n?```/) || [null, aiContent];
          const parsed = JSON.parse(jsonMatch[1] || aiContent);
          
          if (parsed.nodes && Array.isArray(parsed.nodes)) {
            for (const suggestedNode of parsed.nodes.slice(0, 2)) {
              const position = calculateNodePosition(nodes.map(n => ({ x: n.x, y: n.y })));
              const axisData = axes.find(a => 
                a.id === suggestedNode.axis || 
                a.label?.toLowerCase() === suggestedNode.axis?.toLowerCase()
              );
              
              const newNode = {
                id: generateId('gen_node'),
                label: suggestedNode.label || 'Nodo Nuevo',
                description: suggestedNode.description || 'Concepto derivado de la actividad reciente',
                axis: axisData?.id || activeAxis,
                type: suggestedNode.type || 'mechanism',
                x: position.x,
                y: position.y,
                weight: 0.5,
                color: axisData?.color || '#6366f1',
                is_generated: true
              };
              
              delta.nodes_to_add.push(newNode);
            }
          }
        } catch (parseError) {
          console.error('Error parsing AI response for nodes:', parseError);
        }
      }

      // Generate new edges if we have nodes
      if (shouldGenerateEdges && delta.nodes_to_add.length > 0) {
        const SYSTEM_PROMPT_EDGES = `Eres el Analizador de Tensiones del Sistema Lagrange. Tu trabajo es generar conexiones (edges) entre conceptos.

Tipos de conexión válidos: causal, consequence, enabler, tension, mechanism, cycle

Responde SIEMPRE en JSON válido:
{
  "edges": [
    {
      "source": "id_nodo_origen",
      "target": "id_nodo_destino", 
      "label": "Etiqueta narrativa de la conexión",
      "type": "tipo_de_conexion",
      "tension": 0.0-1.0
    }
  ]
}`;

        const newNodeIds = delta.nodes_to_add.map(n => n.id);
        const targetNodes = nodes.slice(0, 5);
        
        const userPromptEdges = `Genera conexiones desde los nuevos nodos hacia nodos existentes:
Nuevos nodos: ${newNodeIds.join(', ')}
Nodos existentes: ${targetNodes.map(n => `${n.id}: ${n.label}`).join(', ')}

Las conexiones deben expresar tensiones significativas y ser coherentes con el sistema.`;

        const edgesResponse = await fetch(`${AI_GATEWAY_URL}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${AI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: AI_CHAT_MODEL,
            messages: [
              { role: "system", content: SYSTEM_PROMPT_EDGES },
              { role: "user", content: userPromptEdges },
            ],
            max_tokens: 500,
          }),
        });

        if (edgesResponse.ok) {
          const edgesData = await edgesResponse.json();
          const edgesContent = edgesData.choices?.[0]?.message?.content || "";

          try {
            const jsonMatch = edgesContent.match(/```json\n?([\s\S]*?)\n?```/) || [null, edgesContent];
            const parsed = JSON.parse(jsonMatch[1] || edgesContent);
            
            if (parsed.edges && Array.isArray(parsed.edges)) {
              for (const suggestedEdge of parsed.edges.slice(0, 3)) {
                // Validate source and target exist
                const validSource = newNodeIds.includes(suggestedEdge.source) || 
                  nodes.some(n => n.id === suggestedEdge.source);
                const validTarget = newNodeIds.includes(suggestedEdge.target) || 
                  nodes.some(n => n.id === suggestedEdge.target);
                
                if (validSource && validTarget) {
                  delta.edges_to_add.push({
                    id: generateId('gen_edge'),
                    source: suggestedEdge.source,
                    target: suggestedEdge.target,
                    tension: Math.min(1, Math.max(0, suggestedEdge.tension || 0.5)),
                    label: suggestedEdge.label || 'Conexión emergente',
                    type: suggestedEdge.type || 'tension'
                  });
                }
              }
            }
          } catch (parseError) {
            console.error('Error parsing AI response for edges:', parseError);
          }
        }
      }
    }

    // Update metadata with actual counts
    delta.metadata.nodes_added = delta.nodes_to_add.length;
    delta.metadata.edges_added = delta.edges_to_add.length;

    // Insert generated content into database (with academy_id for multi-tenant isolation)
    if (delta.nodes_to_add.length > 0) {
      const insertResult = await supabase
        .from("topology_nodes")
        .insert(delta.nodes_to_add.map(n => ({
          id: n.id,
          label: n.label,
          description: n.description,
          axis: n.axis,
          type: n.type,
          x: n.x,
          y: n.y,
          weight: n.weight,
          color: n.color,
          is_generated: n.is_generated,
          academy_id: academyId
        })));

      if (insertResult.error) {
        console.error('Error inserting nodes:', insertResult.error);
      }
    }

    if (delta.edges_to_add.length > 0) {
      const insertResult = await supabase
        .from("topology_edges")
        .insert(delta.edges_to_add.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
          tension: e.tension,
          label: e.label,
          type: e.type,
          academy_id: academyId
        })));

      if (insertResult.error) {
        console.error('Error inserting edges:', insertResult.error);
      }
    }

    // Update vitality scores for attenuated nodes (filter by academy_id)
    if (delta.nodes_to_attenuate.length > 0) {
      for (const node of delta.nodes_to_attenuate) {
        await supabase
          .from("topology_nodes")
          .update({ vitality_score: node.vitality_score })
          .eq("id", node.id)
          .eq("academy_id", academyId);
      }
    }

    return new Response(JSON.stringify({
      ...delta,
      rate_limit: {
        remaining: rateCheck.remaining,
        reset_in_ms: rateCheck.resetIn
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Regenerate topology delta error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
