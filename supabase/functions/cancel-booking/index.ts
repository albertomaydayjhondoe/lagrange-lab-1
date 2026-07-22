/**
 * CANCEL BOOKING
 * Cancels a session booking
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.run/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CancelBookingRequest {
  bookingId?: string;
  sessionId?: string;
  reason?: string;
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

    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse body
    let body: CancelBookingRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "JSON inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.bookingId && !body.sessionId) {
      return new Response(
        JSON.stringify({ error: "bookingId o sessionId es requerido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let booking;

    if (body.bookingId) {
      // Get booking by ID
      const { data, error } = await supabase
        .from('session_bookings')
        .select(`
          id,
          student_id,
          session_id,
          status
        `)
        .eq('id', body.bookingId)
        .single();

      if (error || !data) {
        return new Response(
          JSON.stringify({ error: "Reserva no encontrada" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      booking = data;
    } else {
      // Get booking by session + user
      const { data, error } = await supabase
        .from('session_bookings')
        .select(`
          id,
          student_id,
          session_id,
          status
        `)
        .eq('session_id', body.sessionId)
        .eq('student_id', user.id)
        .single();

      if (error || !data) {
        return new Response(
          JSON.stringify({ error: "Reserva no encontrada" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      booking = data;
    }

    // Check if user can cancel (owner of booking or tutor of session)
    const { data: session } = await supabase
      .from('tutoring_sessions')
      .select('tutor_id, scheduled_at')
      .eq('id', booking.session_id)
      .single();

    const isStudent = booking.student_id === user.id;
    const isTutor = session?.tutor_id === user.id;

    if (!isStudent && !isTutor) {
      return new Response(
        JSON.stringify({ error: "No tienes permiso para cancelar esta reserva" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if session already passed
    if (session && new Date(session.scheduled_at) <= new Date()) {
      return new Response(
        JSON.stringify({ error: "No se puede cancelar una sesión que ya pasó" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check booking status
    if (['cancelled', 'completed', 'no_show'].includes(booking.status)) {
      return new Response(
        JSON.stringify({ error: `Esta reserva ya está ${booking.status}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cancel booking
    const { error: cancelError } = await supabase
      .from('session_bookings')
      .update({ 
        status: 'cancelled',
        notes: body.reason ? `${booking.notes || ''}\nCancelación: ${body.reason}` : booking.notes
      })
      .eq('id', booking.id);

    if (cancelError) {
      console.error("Cancel error:", cancelError);
      return new Response(
        JSON.stringify({ error: "Error al cancelar la reserva" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decrement session student count
    if (session) {
      const { data: sessionData } = await supabase
        .from('tutoring_sessions')
        .select('current_students')
        .eq('id', booking.session_id)
        .single();
      
      if (sessionData && sessionData.current_students > 0) {
        await supabase
          .from('tutoring_sessions')
          .update({ current_students: sessionData.current_students - 1 })
          .eq('id', booking.session_id);
      }
    }

    // Cancel any pending payments
    const { data: payments } = await supabase
      .from('payments')
      .select('id')
      .eq('booking_id', booking.id)
      .eq('status', 'pending');

    if (payments && payments.length > 0) {
      for (const payment of payments) {
        await supabase
          .from('payments')
          .update({ status: 'cancelled' })
          .eq('id', payment.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Reserva cancelada exitosamente",
        bookingId: booking.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Cancel booking error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
