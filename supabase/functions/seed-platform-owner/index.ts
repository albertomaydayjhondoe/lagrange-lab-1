/**
 * Seed Platform Owner - Edge Function
 * 
 * Crea o verifica un usuario administrador de plataforma.
 * Lee credenciales de secretos de Supabase (nunca hardcodeadas).
 * 
 * SECRETOS REQUERIDOS (configurar con: supabase secrets set):
 *   ADMIN_SEED_EMAIL: email del admin
 *   ADMIN_SEED_PASSWORD: password inicial del admin
 * 
 * USO:
 *   # Configurar secretos
 *   supabase secrets set ADMIN_SEED_EMAIL=admin@ejemplo.com ADMIN_SEED_PASSWORD=MiPasswordSeguro123
 *   
 *   # Invocar la función
 *   curl -X POST 'https://[PROJECT_REF].supabase.co/functions/v1/seed-platform-owner' \
 *     -H 'Authorization: Bearer [SERVICE_ROLE_KEY]' \
 *     -H 'Content-Type: application/json'
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SeedResponse {
  success: boolean;
  message: string;
  user_id?: string;
  email?: string;
  is_new_user?: boolean;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate secrets exist
    const adminEmail = Deno.env.get("ADMIN_SEED_EMAIL");
    const adminPassword = Deno.env.get("ADMIN_SEED_PASSWORD");

    if (!adminEmail || !adminPassword) {
      const error: SeedResponse = {
        success: false,
        message: "ERROR: ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD secrets must be configured. Run: supabase secrets set ADMIN_SEED_EMAIL=your@email.com ADMIN_SEED_PASSWORD=yourpassword"
      };
      return new Response(JSON.stringify(error), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Validate email format
    if (!adminEmail.includes("@") || !adminEmail.includes(".")) {
      const error: SeedResponse = {
        success: false,
        message: "ERROR: ADMIN_SEED_EMAIL is not a valid email address"
      };
      return new Response(JSON.stringify(error), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Validate password strength (basic check)
    if (adminPassword.length < 8) {
      const error: SeedResponse = {
        success: false,
        message: "ERROR: ADMIN_SEED_PASSWORD must be at least 8 characters"
      };
      return new Response(JSON.stringify(error), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Check if user already exists by email
    const { data: existingUsers, error: listError } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("email", adminEmail)
      .limit(1);

    if (listError) {
      console.error("Error checking existing user:", listError);
      const error: SeedResponse = {
        success: false,
        message: `Database error checking existing user: ${listError.message}`
      };
      return new Response(JSON.stringify(error), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // If user exists
    if (existingUsers && existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      
      // Verify user is in platform_admins
      const { data: platformAdmin, error: adminCheckError } = await supabaseAdmin
        .from("platform_admins")
        .select("id")
        .eq("user_id", existingUser.id)
        .limit(1);

      if (adminCheckError) {
        console.error("Error checking platform admin:", adminCheckError);
      }

      // Add to platform_admins if not already there
      if (!platformAdmin || platformAdmin.length === 0) {
        const { error: insertAdminError } = await supabaseAdmin
          .from("platform_admins")
          .insert({
            user_id: existingUser.id,
            email: adminEmail
          });

        if (insertAdminError) {
          console.error("Error inserting platform admin:", insertAdminError);
          const error: SeedResponse = {
            success: false,
            message: `User exists but failed to add to platform_admins: ${insertAdminError.message}`
          };
          return new Response(JSON.stringify(error), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }

      const response: SeedResponse = {
        success: true,
        message: "Platform admin verified (existing user)",
        user_id: existingUser.id,
        email: adminEmail,
        is_new_user: false
      };

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Create new user
    console.log(`Creating new platform admin user: ${adminEmail}`);
    
    const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        role: "platform_admin"
      }
    });

    if (createError) {
      console.error("Error creating user:", createError);
      const error: SeedResponse = {
        success: false,
        message: `Failed to create user: ${createError.message}`
      };
      return new Response(JSON.stringify(error), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!authUser.user) {
      const error: SeedResponse = {
        success: false,
        message: "User was not returned after creation"
      };
      return new Response(JSON.stringify(error), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Insert into platform_admins
    const { error: insertAdminError } = await supabaseAdmin
      .from("platform_admins")
      .insert({
        user_id: authUser.user.id,
        email: adminEmail
      });

    if (insertAdminError) {
      console.error("Error inserting platform admin:", insertAdminError);
      // User was created but admin insertion failed - still report success
      // The user can be manually added to platform_admins
      const response: SeedResponse = {
        success: true,
        message: "User created but failed to add to platform_admins. Manual intervention required.",
        user_id: authUser.user.id,
        email: adminEmail,
        is_new_user: true
      };
      return new Response(JSON.stringify(response), {
        status: 206, // Partial content
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const response: SeedResponse = {
      success: true,
      message: "Platform admin created successfully",
      user_id: authUser.user.id,
      email: adminEmail,
      is_new_user: true
    };

    console.log(`Platform admin created: ${authUser.user.id}`);
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Unexpected error:", error);
    const errorResponse: SeedResponse = {
      success: false,
      message: `Unexpected error: ${error instanceof Error ? error.message : "Unknown error"}`
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
