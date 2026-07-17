/**
 * PROCESS PAYMENT (STRIPE MOCK)
 * Simulates a Stripe payment flow for tutoring sessions
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProcessPaymentRequest {
  paymentId: string;
  action: 'pay' | 'refund' | 'cancel';
  mockSuccess?: boolean; // For testing
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
    let body: ProcessPaymentRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "JSON inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.paymentId || !body.action) {
      return new Response(
        JSON.stringify({ error: "paymentId y action son requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get payment
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        id,
        amount_cents,
        currency,
        status,
        student_id,
        booking_id,
        session_id
      `)
      .eq('id', body.paymentId)
      .single();

    if (paymentError || !payment) {
      return new Response(
        JSON.stringify({ error: "Pago no encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user owns this payment
    if (payment.student_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "No tienes permiso para procesar este pago" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let newStatus: string;
    let updateData: any = {};

    switch (body.action) {
      case 'pay':
        // Check if already paid
        if (payment.status === 'paid') {
          return new Response(
            JSON.stringify({ error: "Este pago ya fue procesado" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        // Mock Stripe processing
        newStatus = body.mockSuccess !== false ? 'paid' : 'failed';
        updateData = {
          status: newStatus,
          paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
        };
        break;

      case 'refund':
        // Only paid payments can be refunded
        if (payment.status !== 'paid') {
          return new Response(
            JSON.stringify({ error: "Solo se pueden reembolsar pagos completados" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        newStatus = 'refunded';
        updateData = {
          status: 'refunded',
          refunded_at: new Date().toISOString(),
        };
        
        // Cancel the booking too
        if (payment.booking_id) {
          await supabase
            .from('session_bookings')
            .update({ status: 'cancelled' })
            .eq('id', payment.booking_id);
          
          // Decrement session student count
          if (payment.session_id) {
            const { data: session } = await supabase
              .from('tutoring_sessions')
              .select('current_students')
              .eq('id', payment.session_id)
              .single();
            
            if (session && session.current_students > 0) {
              await supabase
                .from('tutoring_sessions')
                .update({ current_students: session.current_students - 1 })
                .eq('id', payment.session_id);
            }
          }
        }
        break;

      case 'cancel':
        // Can only cancel pending payments
        if (payment.status !== 'pending') {
          return new Response(
            JSON.stringify({ error: "Solo se pueden cancelar pagos pendientes" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        newStatus = 'cancelled';
        updateData = { status: 'cancelled' };
        
        // Cancel the booking too
        if (payment.booking_id) {
          await supabase
            .from('session_bookings')
            .update({ status: 'cancelled' })
            .eq('id', payment.booking_id);
          
          // Decrement session student count
          if (payment.session_id) {
            const { data: session } = await supabase
              .from('tutoring_sessions')
              .select('current_students')
              .eq('id', payment.session_id)
              .single();
            
            if (session && session.current_students > 0) {
              await supabase
                .from('tutoring_sessions')
                .update({ current_students: session.current_students - 1 })
                .eq('id', payment.session_id);
            }
          }
        }
        break;

      default:
        return new Response(
          JSON.stringify({ error: "Acción no válida. Use: pay, refund, o cancel" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Update payment
    const { error: updateError } = await supabase
      .from('payments')
      .update(updateData)
      .eq('id', body.paymentId);

    if (updateError) {
      console.error("Payment update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Error al procesar el pago" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: body.paymentId,
        newStatus: newStatus,
        message: getStatusMessage(newStatus),
        // Mock Stripe response
        stripeResponse: {
          id: `mock_pi_${Date.now()}`,
          status: newStatus,
          amount: payment.amount_cents,
          currency: payment.currency,
          mock: true,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Process payment error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function getStatusMessage(status: string): string {
  switch (status) {
    case 'paid':
      return 'Pago completado exitosamente (mock)';
    case 'refunded':
      return 'Reembolso procesado (mock)';
    case 'cancelled':
      return 'Pago cancelado';
    case 'failed':
      return 'El pago falló (mock)';
    default:
      return 'Estado actualizado';
  }
}
