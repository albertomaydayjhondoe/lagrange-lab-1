/**
 * CREATE TUTORING SESSION
 * Creates a new tutoring session for a tutor
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.run/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateSessionRequest {
  subjectId: string;
  title: string;
  description?: string;
  scheduledAt: string; // ISO string
  durationMinutes?: number;
  priceCents?: number;
  maxStudents?: number;
  isRagEnabled?: boolean;
  meetingLink?: string;
  location?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Autenticación requerida" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is a tutor or admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, full_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "Perfil no encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is tutor or admin
    if (!['tutor', 'admin'].includes(profile.role || '')) {
      return new Response(
        JSON.stringify({ error: "Solo tutores pueden crear sesiones" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse body
    let body: CreateSessionRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "JSON inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate required fields
    if (!body.subjectId || !body.title || !body.scheduledAt) {
      return new Response(
        JSON.stringify({ error: "subjectId, title y scheduledAt son requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate scheduled time is in the future
    const scheduledDate = new Date(body.scheduledAt);
    if (scheduledDate <= new Date()) {
      return new Response(
        JSON.stringify({ error: "La sesión debe programarse para el futuro" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify subject exists
    const { data: subject, error: subjectError } = await supabase
      .from('subjects')
      .select('id, name')
      .eq('id', body.subjectId)
      .single();

    if (subjectError || !subject) {
      return new Response(
        JSON.stringify({ error: "Materia no encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create session
    const sessionData = {
      subject_id: body.subjectId,
      tutor_id: user.id,
      title: body.title,
      description: body.description || null,
      scheduled_at: body.scheduledAt,
      duration_minutes: body.durationMinutes || 60,
      price_cents: body.priceCents || 0,
      currency: 'USD',
      max_students: body.maxStudents || 1,
      current_students: 0,
      is_rag_enabled: body.isRagEnabled !== false,
      meeting_link: body.meetingLink || null,
      location: body.location || 'online',
      status: 'scheduled',
    };

    const { data: session, error: sessionError } = await supabase
      .from('tutoring_sessions')
      .insert(sessionData)
      .select()
      .single();

    if (sessionError) {
      console.error("Session creation error:", sessionError);
      return new Response(
        JSON.stringify({ error: "Error al crear la sesión" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        session: {
          id: session.id,
          title: session.title,
          subject: subject.name,
          scheduledAt: session.scheduled_at,
          durationMinutes: session.duration_minutes,
          priceCents: session.price_cents,
          status: session.status,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Create session error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
