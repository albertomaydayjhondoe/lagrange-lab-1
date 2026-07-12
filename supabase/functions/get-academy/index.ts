import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { verifyAcademyMembership, getAcademyRole } from "./_shared/architectPrompt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse URL to get slug
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const slug = pathParts[pathParts.length - 1];

    if (!slug) {
      return new Response(
        JSON.stringify({ error: 'Slug is required' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get('authorization');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader || '' } }
    });

    // Get user if authenticated
    let userId: string | null = null;
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    }

    // Fetch academy by slug
    const { data: academy, error: academyError } = await supabase
      .from('academies')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (academyError || !academy) {
      return new Response(
        JSON.stringify({ error: 'Academia no encontrada' }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check access
    let role: string | null = null;
    let isMember = false;

    if (userId) {
      // Check membership
      const { data: membership } = await supabase
        .from('academy_members')
        .select('role')
        .eq('academy_id', academy.id)
        .eq('user_id', userId)
        .single();

      if (membership) {
        role = membership.role;
        isMember = true;
      }
    }

    // Check if public
    const isPublic = academy.is_public;

    // If not public and not member, deny access
    if (!isPublic && !isMember) {
      return new Response(
        JSON.stringify({ error: 'No tienes acceso a esta academia privada' }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get thematic axes for this academy
    const { data: axes } = await supabase
      .from('thematic_axes')
      .select('*')
      .eq('academy_id', academy.id)
      .eq('is_active', true)
      .order('order_index');

    // Get member count
    const { count: memberCount } = await supabase
      .from('academy_members')
      .select('*', { count: 'exact', head: true })
      .eq('academy_id', academy.id);

    // Remove oracle_persona_prompt from response unless member
    const responseAcademy = {
      ...academy,
      role,
      is_member: isMember,
      member_count: memberCount || 0,
      thematic_axes: axes || []
    };

    // If not member, hide oracle_persona_prompt
    if (!isMember) {
      delete (responseAcademy as any).oracle_persona_prompt;
    }

    return new Response(JSON.stringify({
      academy: responseAcademy,
      userId
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in get-academy:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
