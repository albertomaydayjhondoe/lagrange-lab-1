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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Admin client con service role
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { email, password, nombre, academySlug, role } = await req.json();

    if (!email || !password || !academySlug) {
      return new Response(
        JSON.stringify({ error: "Faltan campos requeridos: email, password, academySlug" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Crear usuario en Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre: nombre || email.split("@")[0] },
    });

    if (authError) {
      throw authError;
    }

    const userId = authUser.user.id;

    // 2. Obtener la academia por slug
    const { data: academy, error: academyError } = await supabaseAdmin
      .from("academies")
      .select("id, slug")
      .eq("slug", academySlug)
      .single();

    if (academyError || !academy) {
      // Si la academia no existe, crearla
      const academyId = crypto.randomUUID();
      const { error: createAcademyError } = await supabaseAdmin.from("academies").insert({
        id: academyId,
        slug: academySlug,
        name: academySlug.charAt(0).toUpperCase() + academySlug.slice(1),
        description: `Academia ${academySlug}`,
        owner_user_id: userId,
        is_public: true,
        is_active: true,
      });

      if (createAcademyError) {
        throw createAcademyError;
      }

      // 3. Agregar usuario como miembro con el rol especificado
      const { error: memberError } = await supabaseAdmin.from("academy_members").insert({
        user_id: userId,
        academy_id: academyId,
        role: role || "owner",
      });

      if (memberError) {
        throw memberError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          user: { id: userId, email },
          academy: { slug: academySlug, name: academySlug, created: true },
          role: role || "owner",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Agregar usuario como miembro de la academia existente
    const { error: memberError } = await supabaseAdmin.from("academy_members").insert({
      user_id: userId,
      academy_id: academy.id,
      role: role || "owner",
    });

    if (memberError) {
      throw memberError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: { id: userId, email },
        academy: { slug: academy.slug, id: academy.id },
        role: role || "owner",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error en crear-usuario-prueba:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
