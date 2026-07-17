/**
 * LIST TUTORING SESSIONS
 * Lists available sessions with filtering options
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ListSessionsQuery {
  subjectId?: string;
  tutorId?: string;
  status?: 'scheduled' | 'all';
  fromDate?: string;
  limit?: number;
  offset?: number;
  myBookings?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader || '' } }
    });

    // Get user if authenticated
    let userId: string | null = null;
    let userRole: string | null = null;
    
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
      
      if (userId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();
        userRole = profile?.role || null;
      }
    }

    // Parse query params
    const url = new URL(req.url);
    const query: ListSessionsQuery = {
      subjectId: url.searchParams.get('subjectId') || undefined,
      tutorId: url.searchParams.get('tutorId') || undefined,
      status: (url.searchParams.get('status') as any) || 'scheduled',
      fromDate: url.searchParams.get('fromDate') || undefined,
      limit: parseInt(url.searchParams.get('limit') || '20'),
      offset: parseInt(url.searchParams.get('offset') || '0'),
      myBookings: url.searchParams.get('myBookings') === 'true',
    };

    // Build query
    let dbQuery = supabase
      .from('tutoring_sessions')
      .select(`
        id,
        title,
        description,
        scheduled_at,
        duration_minutes,
        price_cents,
        currency,
        status,
        max_students,
        current_students,
        meeting_link,
        location,
        is_rag_enabled,
        ai_model,
        subject:subjects(id, name, slug, icon, color),
        tutor:profiles!tutor_id(id, full_name, avatar_url, bio)
      `, { count: 'exact' });

    // Filters
    if (query.subjectId) {
      dbQuery = dbQuery.eq('subject_id', query.subjectId);
    }

    if (query.tutorId) {
      dbQuery = dbQuery.eq('tutor_id', query.tutorId);
    }

    if (query.status === 'scheduled') {
      dbQuery = dbQuery.eq('status', 'scheduled');
      dbQuery = dbQuery.gte('scheduled_at', new Date().toISOString());
    }

    if (query.fromDate) {
      dbQuery = dbQuery.gte('scheduled_at', query.fromDate);
    }

    // Order
    dbQuery = dbQuery.order('scheduled_at', { ascending: true });

    // Pagination
    dbQuery = dbQuery.range(query.offset, query.offset + query.limit - 1);

    const { data: sessions, error: sessionsError, count } = await dbQuery;

    if (sessionsError) {
      console.error("Sessions query error:", sessionsError);
      return new Response(
        JSON.stringify({ error: "Error al obtener sesiones" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's bookings if authenticated
    let userBookings: Record<string, any> = {};
    if (userId && sessions && sessions.length > 0) {
      const sessionIds = sessions.map(s => s.id);
      const { data: bookings } = await supabase
        .from('session_bookings')
        .select('session_id, status, id')
        .eq('student_id', userId)
        .in('session_id', sessionIds);
      
      userBookings = (bookings || []).reduce((acc: Record<string, any>, b) => {
        acc[b.session_id] = b;
        return acc;
      }, {});
    }

    // Format response
    const formattedSessions = (sessions || []).map(session => ({
      id: session.id,
      title: session.title,
      description: session.description,
      scheduledAt: session.scheduled_at,
      endAt: new Date(new Date(session.scheduled_at).getTime() + session.duration_minutes * 60000).toISOString(),
      durationMinutes: session.duration_minutes,
      priceCents: session.price_cents,
      currency: session.currency,
      status: session.status,
      spotsRemaining: session.max_students - session.current_students,
      isFull: session.current_students >= session.max_students,
      meetingLink: session.meeting_link,
      location: session.location,
      isRagEnabled: session.is_rag_enabled,
      subject: session.subject ? {
        id: (session.subject as any).id,
        name: (session.subject as any).name,
        slug: (session.subject as any).slug,
        icon: (session.subject as any).icon,
        color: (session.subject as any).color,
      } : null,
      tutor: session.tutor ? {
        id: (session.tutor as any).id,
        name: (session.tutor as any).full_name,
        avatar: (session.tutor as any).avatar_url,
        bio: (session.tutor as any).bio,
      } : null,
      userBooking: userBookings[session.id] || null,
      isBooked: !!userBookings[session.id],
    }));

    // Get subjects for filters
    const { data: subjects } = await supabase
      .from('subjects')
      .select('id, name, slug, icon, color')
      .eq('is_active', true)
      .order('name');

    return new Response(
      JSON.stringify({
        sessions: formattedSessions,
        subjects: subjects || [],
        pagination: {
          total: count || 0,
          limit: query.limit,
          offset: query.offset,
          hasMore: (count || 0) > query.offset + query.limit,
        },
        filters: {
          subjectId: query.subjectId || null,
          tutorId: query.tutorId || null,
          status: query.status,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("List sessions error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
