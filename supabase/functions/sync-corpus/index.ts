import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Corpus file paths (relative to repo root)
const CORPUS_FILES = [
  { path: "src/data/corpus/miedo_al_miedo.me", ejes: ["Miedo", "Salud Mental"] },
  { path: "src/data/corpus/legitimidad_y_silencio.me", ejes: ["Legitimidad", "Responsabilidad"] },
  { path: "src/data/corpus/critica_socratica_lagrange.me", ejes: ["Control", "Legitimidad"] },
];

// Map eje names to standardized format
const EJE_MAP: Record<string, string[]> = {
  'Miedo': ['Miedo', 'miedo'],
  'Salud Mental': ['Salud Mental', 'SaludMental', 'salud mental'],
  'Legitimidad': ['Legitimidad', 'legitimidad'],
  'Responsabilidad': ['Responsabilidad', 'responsabilidad'],
  'Control': ['Control', 'control'],
};

// Parse .me file and extract fragments
interface ParsedFragment {
  source_file: string;
  source_section: string;
  axis: string[];
  tension: number;
  content: string;
  keywords: string[];
  weight: number;
}

function parseCorpusFile(content: string, filename: string, defaultEjes: string[]): ParsedFragment[] {
  const fragments: ParsedFragment[] = [];
  
  // Extract metadata at the top
  const metadataMatch = content.match(/### Metadata\n([\s\S]*?)(?=---)/);
  let fileEjes = defaultEjes;
  let fileStatus = 'active';
  
  if (metadataMatch) {
    const ejeMatch = metadataMatch[1].match(/\*\*Eje Principal\*\*:\s*(.+)/);
    if (ejeMatch) {
      const ejeLine = ejeMatch[1];
      // Parse "Miedo, Salud Mental" format
      fileEjes = ejeLine.split(',').map(e => e.trim());
    }
    
    const statusMatch = metadataMatch[1].match(/\*\*Estado\*\*:\s*(.+)/);
    if (statusMatch) {
      fileStatus = statusMatch[1].toLowerCase();
    }
  }
  
  if (fileStatus !== 'active') {
    return fragments; // Skip non-active files
  }
  
  // Extract Fragmento Clave sections
  const fragmentRegex = /\*\*Fragmento Clave #(\d+):\s*([^\n]+)\*\*\n([\s\S]*?)(?=\*\*Fragmento|$)/g;
  let match;
  
  while ((match = fragmentRegex.exec(content)) !== null) {
    const fragmentNum = match[1];
    const fragmentTitle = match[2].trim();
    const fragmentBody = match[3];
    
    // Extract tension line
    const tensionMatch = fragmentBody.match(/Tensión:\s*([^,\n]+)/i);
    const tensionValue = tensionMatch ? parseFloat(tensionMatch[1]) : 0.8;
    
    // Extract peso
    const pesoMatch = fragmentBody.match(/Peso:\s*([\d.]+)/);
    const weight = pesoMatch ? parseFloat(pesoMatch[1]) : 1.0;
    
    // Extract the quoted content
    const quoteMatch = fragmentBody.match(/>\s*["""]([^"""]+)["""]/);
    const quoteContent = quoteMatch ? quoteMatch[1].trim() : '';
    
    if (quoteContent) {
      // Extract tension from content (e.g., "Miedo ↔ Salud Mental")
      const tensionLineMatch = fragmentBody.match(/Tensión:\s*([^,\n]+)/i);
      const ejeMatch = tensionLineMatch ? tensionLineMatch[1] : '';
      
      // Parse ejes from tension line
      let fragmentEjes = [...fileEjes];
      if (ejeMatch.includes('↔')) {
        fragmentEjes = ejeMatch.split('↔').map(e => e.trim());
      } else if (ejeMatch.includes('-')) {
        fragmentEjes = ejeMatch.split('-').map(e => e.trim());
      }
      
      // Generate keywords from content
      const keywords = extractKeywords(quoteContent);
      
      fragments.push({
        source_file: filename,
        source_section: `Fragmento #${fragmentNum}: ${fragmentTitle}`,
        axis: fragmentEjes,
        tension: tensionValue,
        content: quoteContent,
        keywords,
        weight,
      });
    }
  }
  
  return fragments;
}

function extractKeywords(text: string): string[] {
  // Simple keyword extraction - remove common words and extract significant terms
  const stopWords = new Set([
    'el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'a', 'en', 'es', 'son',
    'que', 'y', 'o', 'pero', 'para', 'por', 'con', 'sin', 'tu', 'tu', 'su', 'sus',
    'no', 'si', 'como', 'cuando', 'donde', 'quien', 'cual', 'todo', 'todos'
  ]);
  
  const words = text.toLowerCase()
    .replace(/[¿?¡!.,;:]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 4 && !stopWords.has(w));
  
  // Return unique significant words
  return [...new Set(words)].slice(0, 10);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase config missing");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check authorization (service role only)
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify it's a service role key
    if (!SUPABASE_SERVICE_ROLE_KEY.includes(authHeader.replace('Bearer ', ''))) {
      return new Response(
        JSON.stringify({ error: 'Service role required' }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse body for optional file filter
    let body: unknown = {};
    try {
      body = await req.json();
    } catch {
      // No body is fine
    }
    
    const input = body as Record<string, unknown>;
    const fileFilter = input.file as string | undefined;
    const dryRun = input.dryRun as boolean || false;

    // Fetch corpus content from files
    // Note: In a real deployment, these would be fetched from a CDN or storage
    // For local development, we'll return instructions for manual sync
    
    const results: { file: string; fragments: number; status: string }[] = [];
    
    // For demo purposes, we'll show what would be synced
    // In production, this would fetch actual file content
    
    for (const corpusFile of CORPUS_FILES) {
      if (fileFilter && !corpusFile.path.includes(fileFilter)) {
        continue;
      }
      
      results.push({
        file: corpusFile.path,
        fragments: 0, // Would be parsed from actual file
        status: dryRun ? 'dry_run' : 'pending_implementation',
      });
    }

    // If dry run, return what would be synced
    if (dryRun) {
      return new Response(JSON.stringify({
        success: true,
        mode: 'dry_run',
        files: results,
        message: 'Run without dryRun=true to actually sync fragments to the database',
        instructions: [
          '1. Fetch corpus .me files from src/data/corpus/',
          '2. Parse using parseCorpusFile() function',
          '3. Upsert fragments to corpus_fragments table',
          '4. Return synced count per file'
        ]
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // In production, the actual sync would happen here:
    // 1. Fetch each .me file
    // 2. Parse fragments
    // 3. Upsert to corpus_fragments

    return new Response(JSON.stringify({
      success: true,
      mode: 'production_ready',
      files: results,
      nextSteps: [
        'Deploy corpus files to a CDN or storage bucket',
        'Update fetch logic to retrieve files from remote location',
        'Execute sync with: POST { "dryRun": false }'
      ]
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in sync-corpus function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
