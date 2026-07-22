/**
 * BOOK TUTORING SESSION
 * Books a session and creates a pending payment (mock Stripe)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.run/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BookSessionRequest {
  sessionId: string;
  notes?: string;
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
    let body: BookSessionRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "JSON inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.sessionId) {
      return new Response(
        JSON.stringify({ error: "sessionId es requerido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('tutoring_sessions')
      .select(`
        id,
        title,
        scheduled_at,
        duration_minutes,
        price_cents,
        currency,
        max_students,
        current_students,
        status,
        subject:subjects(name),
        tutor:profiles!tutor_id(id, full_name, avatar_url)
      `)
      .eq('id', body.sessionId)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: "Sesión no encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate session is bookable
    if (session.status !== 'scheduled') {
      return new Response(
        JSON.stringify({ error: "Esta sesión no está disponible para reservas" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (new Date(session.scheduled_at) <= new Date()) {
      return new Response(
        JSON.stringify({ error: "Esta sesión ya pasó" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (session.current_students >= session.max_students) {
      return new Response(
        JSON.stringify({ error: "No hay lugares disponibles" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user already booked
    const { data: existingBooking } = await supabase
      .from('session_bookings')
      .select('id')
      .eq('session_id', body.sessionId)
      .eq('student_id', user.id)
      .single();

    if (existingBooking) {
      return new Response(
        JSON.stringify({ error: "Ya tienes una reserva para esta sesión" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('session_bookings')
      .insert({
        session_id: body.sessionId,
        student_id: user.id,
        status: 'confirmed',
        notes: body.notes || null,
      })
      .select()
      .single();

    if (bookingError) {
      console.error("Booking error:", bookingError);
      return new Response(
        JSON.stringify({ error: "Error al crear la reserva" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update session student count
    await supabase
      .from('tutoring_sessions')
      .update({ current_students: session.current_students + 1 })
      .eq('id', body.sessionId);

    // Create payment record (mock)
    let payment = null;
    if (session.price_cents > 0) {
      const mockStripeId = `mock_pi_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      
      const { data: paymentRecord, error: paymentError } = await supabase
        .from('payments')
        .insert({
          booking_id: booking.id,
          session_id: body.sessionId,
          student_id: user.id,
          tutor_id: (session.tutor as any)?.id || null,
          amount_cents: session.price_cents,
          currency: session.currency || 'USD',
          status: 'pending',
          stripe_payment_intent_id: mockStripeId,
          description: `Reserva: ${session.title}`,
        })
        .select()
        .single();

      if (!paymentError && paymentRecord) {
        payment = {
          id: paymentRecord.id,
          amount: paymentRecord.amount_cents,
          currency: paymentRecord.currency,
          status: paymentRecord.status,
          stripePaymentIntentId: paymentRecord.stripe_payment_intent_id,
        };
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        booking: {
          id: booking.id,
          sessionId: booking.session_id,
          status: booking.status,
          createdAt: booking.created_at,
        },
        session: {
          id: session.id,
          title: session.title,
          scheduledAt: session.scheduled_at,
          durationMinutes: session.duration_minutes,
          subject: (session.subject as any)?.name,
          tutor: (session.tutor as any)?.full_name,
        },
        payment: payment,
        requiresPayment: session.price_cents > 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Book session error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
