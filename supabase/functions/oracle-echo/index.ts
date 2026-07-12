import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting for echoes
const ECHO_COOLDOWN_MS = 30000; // 30 seconds between echoes

const VALID_EJES = ['Miedo', 'Control', 'SaludMental', 'Legitimidad', 'Responsabilidad'];

async function verifyAuth(req: Request): Promise<{ user: any; error?: string }> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return { user: null, error: 'Authentication required' };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: { user }, error } = await supabaseClient.auth.getUser();
  if (error || !user) {
    return { user: null, error: 'Invalid or expired token' };
  }

  return { user };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user, error: authError } = await verifyAuth(req);
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
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const input = body as Record<string, unknown>;
    
    const lastQuestion = input.lastQuestion as string | undefined;
    const silenceDuration = input.silenceDuration as number | undefined;
    const eje = input.eje as string | undefined;
    const selectedNodeId = input.selectedNodeId as string | undefined;
    const conversationHistory = input.conversationHistory as Array<{role: string; content: string}> | undefined;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Supabase config missing");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Fetch context: selected node and recent questions
    let nodeContext = '';
    let questionsContext = '';
    
    if (selectedNodeId) {
      const { data: node } = await supabase
        .from("topology_nodes")
        .select("label, description, axis")
        .eq("id", selectedNodeId)
        .single();
      
      if (node) {
        nodeContext = `El usuario está explorando el concepto "${node.label}" (${node.axis}). Descripción: ${node.description || 'Sin descripción'}.`;
      }
    }

    // Get recent questions from this conversation
    if (conversationHistory && conversationHistory.length > 0) {
      const recentOracleQuestions = conversationHistory
        .filter(m => m.role === 'oracle')
        .slice(-3)
        .map(m => `- "${m.content}"`)
        .join('\n');
      questionsContext = recentOracleQuestions ? `Preguntas ya hechas:\n${recentOracleQuestions}` : '';
    }

    // Calculate echo type based on silence duration
    const echoType = silenceDuration && silenceDuration > 60000 ? 'deep_probe' : 'gentle_nudge';
    
    const SYSTEM_PROMPT = `Eres el Oráculo Socrático del Sistema Lagrange. Tu misión es generar "ecos" - preguntas cortas e incisivas que responden al silencio del usuario.

## ¿Qué es un eco?
Un eco es una pregunta de seguimiento que se genera cuando el usuario no ha respondido o ha permanecido en silencio. A diferencia de una pregunta normal, el eco debe ser:
- **Corto**: Máximo 15 palabras
- **Incisivo**: Va directo al grano
- **Provocador**: Toca el nervio de la pregunta anterior
- **No es un reintento**: No repitas la pregunta, profundiza en una dirección inesperada

## Tipos de eco:
1. **gentle_nudge** (< 60s de silencio): Un recordatorio suave, una reformulación que invita
2. **deep_probe** (> 60s de silencio): Una pregunta que ataca la resistencia directamente

## Los 5 Ejes de Tensión:
1. **Miedo**: El miedo como herramienta de control y su neutralización
2. **Control**: Mecanismos de dominación social, institucional y autoimpuesto
3. **SaludMental**: La patologización del malestar legítimo
4. **Legitimidad**: Fabricación de legitimidad y control de la narrativa
5. **Responsabilidad**: Distribución asimétrica de consecuencias

## Reglas:
- NUNCA repitas la pregunta anterior
- El eco debe ofrecer UN ángulo nuevo, no reformular el mismo
- Si la pregunta anterior era sobre el QUÉ, el eco pregunta el POR QUÉ o el PARA QUÉ
- Si era teórica, hazla personal
- Si era personal, hazla estructural
- El tono es urgente pero no agresivo

## Formato de respuesta:
Responde SOLO con JSON válido:
{
  "echo": "La pregunta eco (máximo 15 palabras)",
  "type": "gentle_nudge | deep_probe",
  "direction": "Breve explicación de por qué esta pregunta eco",
  "tension_shift": "Cómo se mueve la tensión con este eco (aumenta | mantiene | suaviza)"
}`;

    let userPrompt = `El usuario ha permanecido en silencio`;
    
    if (silenceDuration) {
      userPrompt += ` durante ${Math.round(silenceDuration / 1000)} segundos`;
    }
    
    if (lastQuestion) {
      userPrompt += ` después de la pregunta: "${lastQuestion}"`;
    }
    
    if (nodeContext) {
      userPrompt += `. ${nodeContext}`;
    }
    
    if (questionsContext) {
      userPrompt += `. ${questionsContext}`;
    }
    
    userPrompt += `\n\nGenera un eco ${echoType} que responda a este silencio de manera inteligente.`;

    console.log(`Oracle Echo - User: ${user.id}, Type: ${echoType}, Silence: ${silenceDuration}s`);

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
        temperature: 0.9,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Demasiados ecos. Espera un momento." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("Error en AI gateway");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No se recibió respuesta del modelo");
    }

    // Parse JSON response
    let parsed;
    try {
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || [null, content];
      parsed = JSON.parse(jsonMatch[1] || content);
    } catch {
      // Fallback if parsing fails
      parsed = {
        echo: content.replace(/[{}"]/g, '').trim().substring(0, 100),
        type: echoType,
        direction: "Eco generado",
        tension_shift: "mantiene"
      };
    }

    return new Response(JSON.stringify({
      ...parsed,
      silenceDuration,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in oracle-echo function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
