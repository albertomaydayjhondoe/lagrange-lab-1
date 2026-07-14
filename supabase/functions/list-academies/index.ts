import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    let userId: string | null = null;
    
    // Get user if authenticated
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    }

    // Fetch public academies
    const { data: publicAcademies, error: publicError } = await supabase
      .from('academies')
      .select(`
        id,
        slug,
        name,
        description,
        is_public,
        created_at,
        owner_user_id
      `)
      .eq('is_public', true)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (publicError) {
      throw publicError;
    }

    // Fetch user's memberships (if authenticated)
    let userAcademies: any[] = [];
    let userMemberships: Record<string, string> = {}; // academyId -> role
    
    if (userId) {
      const { data: memberships, error: membershipError } = await supabase
        .from('academy_members')
        .select(`
          academy_id,
          role,
          academies (
            id,
            slug,
            name,
            description,
            is_public,
            created_at,
            owner_user_id
          )
        `)
        .eq('user_id', userId);

      if (!membershipError && memberships) {
        userAcademies = memberships
          .filter((m: any) => m.academies)
          .map((m: any) => ({
            ...m.academies,
            role: m.role
          }));
        
        userMemberships = memberships.reduce((acc: Record<string, string>, m: any) => {
          acc[m.academy_id] = m.role;
          return acc;
        }, {});
      }
    }

    // Combine and deduplicate
    const allAcademiesMap = new Map();
    
    // Add public academies first
    for (const academy of (publicAcademies || [])) {
      const role = userMemberships[academy.id];
      allAcademiesMap.set(academy.id, {
        ...academy,
        role: role || null, // null for public non-members
        is_member: !!role
      });
    }
    
    // Override with user's academies (they might be private)
    for (const academy of userAcademies) {
      allAcademiesMap.set(academy.id, {
        ...academy,
        role: academy.role,
        is_member: true
      });
    }

    const allAcademies = Array.from(allAcademiesMap.values());

    return new Response(JSON.stringify({
      academies: allAcademies,
      userMemberships,
      userId
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in list-academies:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
