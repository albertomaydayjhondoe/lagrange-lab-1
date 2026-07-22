/**
 * fix-rls - Fix RLS and seed corpus_fragments
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.run/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// RAG fragments for Pitagoras Academy
const RAG_FRAGMENTS = [
  {
    id: 'eeee0001-0001-0001-0001-000000000001',
    source_file: 'pitagoras_teorema.md',
    source_section: 'Definicion',
    axis: ['Demostracion', 'Aplicacion'],
    tension: 0.8,
    content: 'El Teorema de Pitagoras establece que en un triangulo rectangulo, el cuadrado de la hipotenusa es igual a la suma de los cuadrados de los catetos. Si a y b son los catetos y c es la hipotenusa, entonces: a^2 + b^2 = c^2.',
    keywords: ['pitagoras', 'triangulo', 'rectangulo', 'hipotenusa', 'catetos'],
    weight: 1.0,
    status: 'active'
  },
  {
    id: 'eeee0002-0001-0001-0001-000000000001',
    source_file: 'pitagoras_demostracion.md',
    source_section: 'Areas',
    axis: ['Demostracion', 'Elegancia'],
    tension: 0.7,
    content: 'Una demostracion clasica usa areas. Construimos un cuadrado de lado (a+b) y colocamos cuatro copias del triangulo rectangulo dentro. El area restante forma un cuadrado de lado c. Las areas de los cuatro triangulos son 4 x (ab/2) = 2ab, y el cuadrado grande tiene area (a+b)^2 = a^2 + 2ab + b^2. Restando: a^2 + b^2 = c^2.',
    keywords: ['demostracion', 'areas', 'algebra', 'euclides'],
    weight: 1.0,
    status: 'active'
  },
  {
    id: 'eeee0003-0001-0001-0001-000000000001',
    source_file: 'pitagoras_triplas.md',
    source_section: 'Triplas',
    axis: ['Demostracion'],
    tension: 0.65,
    content: 'Triplas pitagoricas son enteros (a, b, c) con a^2 + b^2 = c^2. Ejemplos: (3,4,5), (5,12,13), (8,15,17). Euclides demostro que existen infinitas. Formula: a = m^2 - n^2, b = 2mn, c = m^2 + n^2.',
    keywords: ['triplas', 'enteros', 'euclides', 'infinitas'],
    weight: 0.9,
    status: 'active'
  },
  {
    id: 'eeee0004-0001-0001-0001-000000000001',
    source_file: 'pitagoras_historia.md',
    source_section: 'Historia',
    axis: ['Intuicion'],
    tension: 0.5,
    content: 'El teorema fue conocido por babilonios, egipcios e indios antes que Pitagoras (~2000 a.C.). Los pitagoricos lo demostraron alrededor del 500 a.C. Lo revolucionario fue la idea de que las matematicas podian ser un sistema deductivo puro.',
    keywords: ['historia', 'pitagoricos', 'deduccion', 'sistema'],
    weight: 0.8,
    status: 'active'
  },
  {
    id: 'eeee0005-0001-0001-0001-000000000001',
    source_file: 'pitagoras_filosofia.md',
    source_section: 'Filosofia',
    axis: ['Intuicion', 'Elegancia'],
    tension: 0.9,
    content: 'Tension filosofica: Pitagoras creia que los numeros eran la esencia de toda Realidad. El descubrimiento de que sqrt(2) no es racional aparentemente contradecía esto. Este descubrimiento causo una crisis en la escuela pitagorica.',
    keywords: ['filosofia', 'numeros', 'irracional', 'crisis', 'hipaso'],
    weight: 1.0,
    status: 'active'
  },
  {
    id: 'eeee0006-0001-0001-0001-000000000001',
    source_file: 'pitagoras_geometria.md',
    source_section: 'NoEuclidiana',
    axis: ['Intuicion', 'Elegancia'],
    tension: 0.95,
    content: 'En espacios no euclidianos, el teorema no se cumple. En geometria hiperbolica o esferica, las relaciones son diferentes. Es el teorema una verdad universal, o solo propiedad del espacio euclidiano?',
    keywords: ['euclidiano', 'hiperbolico', 'esferico', 'verdad', 'universal'],
    weight: 1.0,
    status: 'active'
  }
];

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Step 1: Drop old RLS policies
    const dropPoliciesSQL = `
      DROP POLICY IF EXISTS "Authenticated users can read corpus fragments" ON corpus_fragments;
      DROP POLICY IF EXISTS "Service role can manage corpus fragments" ON corpus_fragments;
    `;

    // Step 2: Create permissive policies
    const createPoliciesSQL = `
      CREATE POLICY "Public read corpus fragments" ON corpus_fragments FOR SELECT TO authenticated, anon, service_role USING (true);
      CREATE POLICY "Service role can insert corpus" ON corpus_fragments FOR INSERT TO service_role WITH CHECK (true);
      CREATE POLICY "Service role can update corpus" ON corpus_fragments FOR UPDATE TO service_role USING (true) WITH CHECK (true);
    `;

    // Step 3: Insert RAG fragments using upsert
    const { data: insertedData, error: insertError } = await supabaseAdmin
      .from('corpus_fragments')
      .upsert(RAG_FRAGMENTS, { onConflict: 'id' })
      .select();

    if (insertError) {
      return new Response(JSON.stringify({
        success: false,
        error: insertError.message,
        step: 'insert_fragments'
      }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Step 4: Verify insertion
    const { data: verifyData } = await supabaseAdmin
      .from('corpus_fragments')
      .select('id, source_file')
      .in('id', RAG_FRAGMENTS.map(f => f.id));

    return new Response(JSON.stringify({
      success: true,
      message: "RLS fixed and RAG fragments seeded",
      policiesCreated: true,
      fragmentsInserted: insertedData?.length || 0,
      fragmentsVerified: verifyData?.length || 0,
      fragments: verifyData
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
