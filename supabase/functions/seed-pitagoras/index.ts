/**
 * seed-pitagoras - Seed RAG fragments for Pitagoras Academy
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FRAGMENTS = [
  {
    id: 'eeee0001-0001-0001-0001-000000000001',
    source_file: 'pitagoras_teorema.md',
    source_section: 'Definicion',
    axis: ['Demostracion', 'Aplicacion'],
    tension: 0.8,
    content: 'El Teorema de Pitagoras establece que en un triangulo rectangulo, el cuadrado de la hipotenusa es igual a la suma de los cuadrados de los catetos. Si a y b son los catetos y c es la hipotenusa, entonces: a^2 + b^2 = c^2.',
    keywords: ['pitagoras', 'triangulo', 'hipotenusa'],
    weight: 1.0,
    status: 'active'
  },
  {
    id: 'eeee0002-0001-0001-0001-000000000001',
    source_file: 'pitagoras_demostracion.md',
    source_section: 'Areas',
    axis: ['Demostracion', 'Elegancia'],
    tension: 0.7,
    content: 'Una demostracion clasica usa areas. Construimos un cuadrado de lado (a+b) y colocamos cuatro copias del triangulo rectangulo dentro. El area restante forma un cuadrado de lado c.',
    keywords: ['demostracion', 'areas', 'euclides'],
    weight: 1.0,
    status: 'active'
  },
  {
    id: 'eeee0003-0001-0001-0001-000000000001',
    source_file: 'pitagoras_triplas.md',
    source_section: 'Triplas',
    axis: ['Demostracion'],
    tension: 0.65,
    content: 'Triplas pitagoricas son enteros (a, b, c) con a^2 + b^2 = c^2. Ejemplos: (3,4,5), (5,12,13), (8,15,17). Euclides demostro que existen infinitas.',
    keywords: ['triplas', 'euclides', 'infinitas'],
    weight: 0.9,
    status: 'active'
  },
  {
    id: 'eeee0004-0001-0001-0001-000000000001',
    source_file: 'pitagoras_historia.md',
    source_section: 'Historia',
    axis: ['Intuicion'],
    tension: 0.5,
    content: 'El teorema fue conocido por babilonios, egipcios e indios antes que Pitagoras (~2000 a.C.). Los pitagoricos lo demostraron alrededor del 500 a.C.',
    keywords: ['historia', 'pitagoricos'],
    weight: 0.8,
    status: 'active'
  },
  {
    id: 'eeee0005-0001-0001-0001-000000000001',
    source_file: 'pitagoras_filosofia.md',
    source_section: 'Filosofia',
    axis: ['Intuicion', 'Elegancia'],
    tension: 0.9,
    content: 'Tension filosofica: Pitagoras creia que los numeros eran la esencia de toda Realidad. El descubrimiento de que sqrt(2) no es racional causo una crisis en la escuela pitagorica.',
    keywords: ['filosofia', 'numeros', 'irracional', 'crisis'],
    weight: 1.0,
    status: 'active'
  },
  {
    id: 'eeee0006-0001-0001-0001-000000000001',
    source_file: 'pitagoras_geometria.md',
    source_section: 'NoEuclidiana',
    axis: ['Intuicion', 'Elegancia'],
    tension: 0.95,
    content: 'En espacios no euclidianos, el teorema no se cumple. En geometria hiperbolica o esferica, las relaciones son diferentes.',
    keywords: ['euclidiano', 'hiperbolico', 'esferico'],
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

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabaseAdmin
      .from('corpus_fragments')
      .upsert(FRAGMENTS, { onConflict: 'id' })
      .select();

    if (error) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: error.message,
        hint: "Run fix_corpus_rls.sql in Supabase Dashboard"
      }), {
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "RAG fragments seeded",
      count: data?.length || 0
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
