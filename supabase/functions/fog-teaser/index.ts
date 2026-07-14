import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getArchitectPrompt } from "../_shared/architectPrompt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_GATEWAY_URL = (Deno.env.get("AI_GATEWAY_URL") ?? "https://api.openai.com/v1").replace(/\/$/, "");
const AI_CHAT_MODEL = Deno.env.get("AI_CHAT_MODEL") ?? "gpt-4o-mini";

// Rate limiting for teasers
const TEASER_CACHE_MINUTES = 30;

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
    const activeAxis = input.activeAxis as string | undefined;
    const proximityToCenter = input.proximityToCenter as number | undefined; // 0-1, closer to center = more transparent fog
    const dominantAxis = input.dominantAxis as string | undefined;

    const AI_API_KEY = Deno.env.get("AI_API_KEY");
    if (!AI_API_KEY) {
      throw new Error("AI_API_KEY is not configured");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase config missing");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check for cached teaser
    const cacheKey = `fog_teaser_${activeAxis || 'general'}_${Math.floor(Date.now() / (TEASER_CACHE_MINUTES * 60 * 1000))}`;
    const today = new Date().toISOString().split('T')[0];
    
    const { data: cachedTeaser } = await supabase
      .from('podcast_episodes')
      .select('title, description')
      .eq('title', cacheKey)
      .eq('eje', activeAxis || 'general')
      .gte('created_at', today)
      .single();

    if (cachedTeaser) {
      return new Response(JSON.stringify({
        teaser: cachedTeaser.description,
        source: 'cache',
        proximityToCenter
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch recent questions for this axis for context
    let questionsContext = '';
    if (activeAxis) {
      const { data: questions } = await supabase
        .from('socratic_questions')
        .select('texto')
        .eq('eje', activeAxis)
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (questions && questions.length > 0) {
        questionsContext = questions.map(q => `- ${q.texto}`).join('\n');
      }
    }

    // Calculate fog intensity based on proximity
    const fogIntensity = proximityToCenter !== undefined 
      ? Math.max(0.3, 1 - proximityToCenter * 0.5) // More transparent when closer to center
      : 0.7; // Default moderate fog

    const SYSTEM_PROMPT = `${getArchitectPrompt(`Eres el Vidente del Sistema Lagrange. Tu misión es generar "teasers poéticos" - frases cortas, misteriosas y provocadoras que sugieren lo que hay bajo la niebla.\n\n## ¿Qué es un teaser poético?\nUn teaser poético es una frase de 1-2 líneas que:\n- NO revela el contenido, solo lo sugiere\n- Usa metáforas y lenguaje evocador\n- Genera curiosidad sin dar respuestas\n- Conecta con la tensión del eje temático\n- Suena como un susurro, no como un anuncio\n\n## Los 5 Ejes de Tensión:\n1. **Miedo**: El miedo como herramienta de control\n2. **Control**: Mecanismos de dominación\n3. **SaludMental**: Patologización del malestar\n4. **Legitimidad**: Construcción de autoridad\n5. **Responsabilidad**: Distribución de consecuencias\n\n## Reglas:\n- Máximo 50 caracteres\n- No uses signos de interrogación\n- No reveles, sugiere\n- El tono es íntimo, casi secreto\n- Debe poder entenderse sin contexto pero ganar significado con él\n\n## Ejemplos:\n- \"Las raíces que no ves sostienen el peso que cargas\"\n- \"Hay preguntas que duelen más que sus respuestas\"\n- \"El silencio entre palabras guarda más verdad\"\n- \"Lo que nombras, lo fortaleces\"\n\n## Formato de respuesta:\nResponde SOLO con el teaser en texto plano, sin comillas, sin JSON.`)}`;

    let userPrompt = 'Genera un teaser poético';
    
    if (activeAxis) {
      userPrompt += ` para el eje de ${activeAxis}`;
    }
    
    if (questionsContext) {
      userPrompt += ` que conecte con estas tensiones:\n${questionsContext}`;
    }
    
    if (proximityToCenter !== undefined) {
      const proximityText = proximityToCenter > 0.7 
        ? 'muy cerca' 
        : proximityToCenter > 0.4 
          ? 'a media distancia' 
          : 'lejos';
      userPrompt += `. El usuario está ${proximityText} del centro narrativo.`;
    }

    console.log(`Fog Teaser - User: ${user.id}, Axis: ${activeAxis || 'general'}, Proximity: ${proximityToCenter}`);

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
        temperature: 0.95,
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        // Return fallback teaser
        return new Response(JSON.stringify({
          teaser: getFallbackTeaser(activeAxis),
          source: 'fallback',
          proximityToCenter
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("Error en AI gateway");
    }

    const data = await response.json();
    const teaser = data.choices?.[0]?.message?.content?.trim();

    if (!teaser) {
      throw new Error("No se recibió respuesta del modelo");
    }

    // Cache the teaser
    await supabase
      .from('podcast_episodes')
      .insert({
        title: cacheKey,
        description: teaser,
        eje: activeAxis || 'general',
        published: false,
        audio_url: '',
        is_ambient: true
      });

    return new Response(JSON.stringify({
      teaser,
      source: 'generated',
      proximityToCenter,
      fogIntensity
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in fog-teaser function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Error desconocido",
        teaser: getFallbackTeaser(undefined),
        source: 'fallback'
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function getFallbackTeaser(axis?: string): string {
  const fallbackTeasers: Record<string, string> = {
    'Miedo': 'El miedo que nombras ya no te owns.',
    'Control': 'Hay hilos que prefieres no ver.',
    'SaludMental': 'Lo que te llaman enfermedad tenía nombre antes.',
    'Legitimidad': 'La autoridad se construye o se usurpma.',
    'Responsabilidad': 'Siempre hay alguien más lejos del centro.',
  };
  
  if (axis && fallbackTeasers[axis]) {
    return fallbackTeasers[axis];
  }
  
  return 'Hay verdades que solo la niebla protege.';
}
