import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getArchitectPrompt } from "../_shared/architectPrompt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Cache ambient narratives for a day
const AMBIENT_CACHE_MINUTES = 60 * 24; // 24 hours

async function verifyAuth(req: Request): Promise<{ user: any; error: string }> {
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase config missing");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check for cached ambient audio
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `ambient_${activeAxis || 'general'}_${today}`;
    
    const { data: cachedAmbient } = await supabase
      .from('podcast_episodes')
      .select('id, audio_url, description')
      .eq('title', cacheKey)
      .eq('is_ambient', true)
      .single();

    if (cachedAmbient && cachedAmbient.audio_url) {
      return new Response(JSON.stringify({
        audioUrl: cachedAmbient.audio_url,
        source: 'cache',
        cacheKey
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate narrative text using AI
    const SYSTEM_PROMPT = `${getArchitectPrompt(`Eres la Voz del Sistema Lagrange. Generas fragmentos narrativos cortos (10-20 segundos de audio) que funcionan como "voz de fondo" del sistema.\n\n## Características del fragmento:\n- Duración: aproximadamente 15 segundos de lectura\n- Tono: reflexivo, pausado, íntimo\n- Contenido: una reflexión breve sobre la condición humana, el poder, el miedo\n- No es una pregunta ni una afirmación dogmática\n- Debe poder entenderse solo pero ganar profundidad en contexto\n- Lenguaje poético pero accesible\n- Debe poder leerse en una sola respiración\n\n## Los 5 Ejes de Tensión:\n1. **Miedo**: El miedo como herramienta de control\n2. **Control**: Mecanismos de dominación\n3. **SaludMental**: Patologización del malestar\n4. **Legitimidad**: Construcción de autoridad\n5. **Responsabilidad**: Distribución de consecuencias\n\n## Reglas:\n- Exactamente 2-3 oraciones\n- No uses nombres propios ni referencias específicas\n- El tono es contemplativo, como un pensamiento que se comparte\n- Debe poder funcionar en loop (no tenga cierre definitivo)\n\n## Ejemplos:\n- "Hay verdades que solo el silencio preserva intactas. Lo que nombras, lo fortaleces."\n- "El peso que sientes no siempre es tuyo. A veces es el miedo de otros acumulado."\n- "Donde hay certeza hay pregunta pendiente. Las respuestas completas son mentiras hermosas."\n\nResponde SOLO con el texto del fragmento, sin comillas, sin introducción.`)}`;

    let userPrompt = 'Genera un fragmento narrativo para ambiente';
    if (activeAxis) {
      userPrompt += ` inspirado en el eje de ${activeAxis}`;
    }

    console.log(`Generating ambient narrative for user ${user.id}, axis: ${activeAxis || 'general'}`);

    const narrativeResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
        max_tokens: 150,
      }),
    });

    if (!narrativeResponse.ok) {
      throw new Error("Error generando narrativa");
    }

    const narrativeData = await narrativeResponse.json();
    const narrativeText = narrativeData.choices?.[0]?.message?.content?.trim();

    if (!narrativeText) {
      throw new Error("No se recibió narrativa del modelo");
    }

    // Generate TTS audio using ElevenLabs
    let audioUrl: string | null = null;
    
    if (ELEVENLABS_API_KEY) {
      const voiceId = "rJCHAtWGz2k637x4R5GS"; // Spanish voice
      
      const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: narrativeText,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
          },
        }),
      });

      if (ttsResponse.ok) {
        const audioBuffer = await ttsResponse.arrayBuffer();
        
        // Upload to Supabase storage
        const fileName = `${cacheKey}_${Date.now()}.mp3`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('podcasts')
          .upload(fileName, audioBuffer, {
            contentType: 'audio/mpeg',
            upsert: true,
          });

        if (!uploadError && uploadData) {
          const { data: urlData } = supabase.storage
            .from('podcasts')
            .getPublicUrl(fileName);
          
          audioUrl = urlData.publicUrl;
        }
      }
    }

    // Cache the ambient narrative
    await supabase
      .from('podcast_episodes')
      .insert({
        title: cacheKey,
        description: narrativeText,
        audio_url: audioUrl || '',
        eje: activeAxis || 'general',
        published: false,
        is_ambient: true,
      });

    return new Response(JSON.stringify({
      narrative: narrativeText,
      audioUrl: audioUrl,
      source: 'generated',
      cacheKey
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in generate-ambient-narrative function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Error desconocido" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
