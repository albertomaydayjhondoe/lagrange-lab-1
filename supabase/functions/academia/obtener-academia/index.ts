import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { resolveAcademyBySlug, validateAcademyMembership } from "../../_shared/academyContext.ts";

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

    // Resolve academy by slug using shared context
    const academyId = await resolveAcademyBySlug(supabase, slug);
    
    if (!academyId) {
      return new Response(
        JSON.stringify({ error: 'Academia no encontrada' }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate membership using shared context
    const validation = await validateAcademyMembership(supabase, userId, academyId);

    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch full academy data
    const { data: academy } = await supabase
      .from('academies')
      .select('*')
      .eq('id', academyId)
      .single();

    // Get member count
    const { count: memberCount } = await supabase
      .from('academy_members')
      .select('*', { count: 'exact', head: true })
      .eq('academy_id', academyId);

    // Build response
    const responseAcademy = {
      ...academy,
      role: validation.role,
      is_member: !!validation.role,
      member_count: memberCount || 0,
      thematic_axes: validation.axes || []
    };

    // If not member, hide oracle_persona_prompt
    if (!validation.role) {
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
