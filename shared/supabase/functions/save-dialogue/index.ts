/**
 * SAVE-DIALOGUE - Guardar sesión de investigación con procedencia
 * 
 * Flujo según flowchart:
 * LOOP (No) → SAVE → research_sessions
 * 
 * Guarda:
 * - Sesión de investigación completa
 * - Mensajes individuales
 * - Procedencia de cada respuesta (P1-P5)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.run/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProvenanceEntry {
  fragment_id?: string;
  source_file: string;
  source_type: string;
  source_content: string;
  original_url?: string;
  page_reference?: string;
  similarity_score: number;
  citation_order: number;
  is_inference_only: boolean;
  ingested_at?: string;
  uploaded_by?: string;
}

interface MessageEntry {
  role: 'user' | 'assistant' | 'system';
  content: string;
  ai_model?: string;
  response_time_ms?: number;
  provenance?: ProvenanceEntry[];
}

interface SaveDialogueRequest {
  dialogueId?: string;
  academyId?: string;
  spaceId?: string;
  title?: string;
  researchTopic?: string;
  tutorSystemPrompt?: string;
  tutorModel?: string;
  messages: MessageEntry[];
  userNotes?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), { status: 401, headers: corsHeaders });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing configuration");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const anonClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: corsHeaders });
    }

    let body: SaveDialogueRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: corsHeaders });
    }

    const { 
      dialogueId, 
      academyId, 
      spaceId, 
      title, 
      researchTopic, 
      tutorSystemPrompt, 
      tutorModel,
      messages, 
      userNotes 
    } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'messages array is required' }), { status: 400, headers: corsHeaders });
    }

    const totalMessages = messages.length;
    let totalSourcesUsed = 0;
    let hasInferenceOnly = false;

    for (const msg of messages) {
      if (msg.provenance) {
        totalSourcesUsed += msg.provenance.length;
        for (const p of msg.provenance) {
          if (p.is_inference_only) hasInferenceOnly = true;
        }
      }
    }

    let resultSessionId: string;

    if (dialogueId) {
      await supabase
        .from('research_sessions')
        .update({
          title: title || undefined,
          research_topic: researchTopic || undefined,
          user_notes: userNotes || undefined,
          total_messages: totalMessages,
          total_sources_used: totalSourcesUsed,
          updated_at: new Date().toISOString()
        })
        .eq('id', dialogueId)
        .eq('user_id', user.id);

      await supabase.from('research_messages').delete().eq('session_id', dialogueId);
      resultSessionId = dialogueId;
    } else {
      const { data: newSession, error: insertSessionError } = await supabase
        .from('research_sessions')
        .insert({
          user_id: user.id,
          academy_id: academyId || null,
          space_id: spaceId || null,
          title: title || `Investigación ${new Date().toLocaleDateString()}`,
          research_topic: researchTopic || null,
          tutor_system_prompt: tutorSystemPrompt || null,
          tutor_model: tutorModel || null,
          total_messages: totalMessages,
          total_sources_used: totalSourcesUsed,
          user_notes: userNotes || null
        })
        .select('id')
        .single();

      if (insertSessionError) throw insertSessionError;
      resultSessionId = newSession.id;
    }

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];

      const { data: savedMessage, error: insertMsgError } = await supabase
        .from('research_messages')
        .insert({
          session_id: resultSessionId,
          message_index: i,
          role: msg.role,
          content: msg.content,
          ai_model: msg.ai_model || null,
          response_time_ms: msg.response_time_ms || null
        })
        .select('id')
        .single();

      if (insertMsgError) {
        console.error('Error inserting message:', insertMsgError);
        continue;
      }

      if (msg.provenance && msg.provenance.length > 0) {
        const provenanceRecords = msg.provenance.map((p, idx) => ({
          message_id: savedMessage.id,
          fragment_id: p.fragment_id || null,
          source_file: p.source_file,
          source_type: p.source_type,
          source_content: p.source_content.substring(0, 2000),
          original_url: p.original_url || null,
          page_reference: p.page_reference || null,
          similarity_score: p.similarity_score,
          citation_order: p.citation_order || idx + 1,
          is_inference_only: p.is_inference_only,
          fragment_ingested_at: p.ingested_at || null
        }));

        await supabase.from('research_provenance').insert(provenanceRecords);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      session_id: resultSessionId,
      total_messages: totalMessages,
      total_sources_used: totalSourcesUsed,
      has_inference_only: hasInferenceOnly
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error('Save dialogue error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});
