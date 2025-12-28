import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation
const MAX_TEXT_LENGTH = 10000; // ElevenLabs limit is around 5000 chars, being conservative
const VOICE_ID_REGEX = /^[a-zA-Z0-9]{20,30}$/; // ElevenLabs voice IDs are alphanumeric

function validateInput(body: unknown): { text: string; voiceId?: string } {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be an object');
  }

  const input = body as Record<string, unknown>;

  // Validate text (required)
  if (!input.text || typeof input.text !== 'string') {
    throw new Error('text is required and must be a string');
  }
  
  const text = input.text.trim();
  if (text.length === 0) {
    throw new Error('text cannot be empty');
  }
  
  if (text.length > MAX_TEXT_LENGTH) {
    throw new Error(`text must be less than ${MAX_TEXT_LENGTH} characters`);
  }

  const result: ReturnType<typeof validateInput> = { text };

  // Validate voiceId (optional)
  if (input.voiceId !== undefined) {
    if (typeof input.voiceId !== 'string') {
      throw new Error('voiceId must be a string');
    }
    if (!VOICE_ID_REGEX.test(input.voiceId)) {
      throw new Error('voiceId format is invalid');
    }
    result.voiceId = input.voiceId;
  }

  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse and validate input
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let validatedInput;
    try {
      validatedInput = validateInput(body);
    } catch (validationError) {
      return new Response(
        JSON.stringify({ error: (validationError as Error).message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { text, voiceId } = validatedInput;
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');

    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY not configured');
    }

    // Use Roger voice by default (calm, philosophical tone)
    const voice = voiceId || 'CwhRBWXzGAHq8TQ4Fs17';

    console.log(`Generating TTS for text: "${text.substring(0, 50)}..." (${text.length} chars) with voice: ${voice}`);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          output_format: 'mp3_44100_128',
          voice_settings: {
            stability: 0.6,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
            speed: 0.9,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', errorText);
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = base64Encode(audioBuffer);

    console.log('TTS generated successfully');

    return new Response(
      JSON.stringify({ audioContent: base64Audio }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('TTS Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
