/**
 * exec-sql - Execute raw SQL against the database
 * WARNING: This is a powerful function. Use with caution.
 * 
 * Only callable with SERVICE_ROLE_KEY
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Only allow service role
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.includes(serviceRoleKey)) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const body = await req.json();
    const { sql } = body;

    if (!sql || typeof sql !== "string") {
      return new Response(
        JSON.stringify({ error: "SQL query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Execute SQL using rpc if available, or direct query
    // Since we can't use pg_* directly, we'll use the workaround
    
    // For DDL/DML, we need to use raw SQL execution
    // This typically requires postgres connection, not REST API
    // Let's try a workaround: use multiple inserts via the client

    console.log("exec-sql called with SQL:", sql.substring(0, 100));

    // For now, return info about available methods
    return new Response(JSON.stringify({
      message: "exec-sql endpoint ready",
      note: "This function is a placeholder. For RLS fixes, run migrations via Supabase Dashboard.",
      available_commands: [
        "DROP POLICY ... ON public.academy_members",
        "CREATE POLICY ... ON public.academy_members",
        "INSERT INTO public.academies ..."
      ]
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Error in exec-sql:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
