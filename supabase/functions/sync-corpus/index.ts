import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CORPUS_FILES = [
  { filename: "miedo_al_miedo.me", ejes: ["Miedo", "Salud Mental"] },
  { filename: "legitimidad_y_silencio.me", ejes: ["Legitimidad", "Responsabilidad"] },
  { filename: "critica_socratica_lagrange.me", ejes: ["Control", "Legitimidad"] },
];

interface ParsedFragment {
  source_file: string;
  source_section: string;
  axis: string[];
  tension: number;
  content: string;
  keywords: string[];
  weight: number;
}

interface SyncResult {
  file: string;
  fragments: number;
  status: "synced" | "error" | "skipped";
  error?: string;
}

function parseCorpusFile(content: string, filename: string, defaultEjes: string[]): ParsedFragment[] {
  const fragments: ParsedFragment[] = [];
  const metadataMatch = content.match(/### Metadata\n([\s\S]*?)(?=---)/);
  let fileEjes = defaultEjes;
  let fileStatus = "active";
  
  if (metadataMatch) {
    const ejeMatch = metadataMatch[1].match(/\*\*Eje Principal\*\*:\s*(.+)/);
    if (ejeMatch) fileEjes = ejeMatch[1].split(",").map(e => e.trim());
    const statusMatch = metadataMatch[1].match(/\*\*Estado\*\*:\s*(.+)/);
    if (statusMatch) fileStatus = statusMatch[1].toLowerCase();
  }
  
  if (fileStatus !== "active") return fragments;
  
  const fragmentRegex = /\*\*Fragmento Clave #(\d+):\s*([^\n]+)\*\*/\n([\s\S]*?)(?=\*\*Fragmento|$)/g;
  let match;
  
  while ((match = fragmentRegex.exec(content)) !== null) {
    const fragmentBody = match[3];
    const tensionMatch = fragmentBody.match(/Tension:\s*([^,\n]+)/i);
    const pesoMatch = fragmentBody.match(/Peso:\s*([\d.]+)/);
    const quoteMatch = fragmentBody.match(/>\s*["""]([^"""]+)["""]/);
    const quoteContent = quoteMatch ? quoteMatch[1].trim() : "";
    
    if (quoteContent) {
      const tensionLineMatch = fragmentBody.match(/Tension:\s*([^,\n]+)/i);
      let fragmentEjes = [...fileEjes];
      if (tensionLineMatch) {
        const ejeMatch = tensionLineMatch[1];
        if (ejeMatch.includes("↔")) fragmentEjes = ejeMatch.split("↔").map(e => e.trim());
        else if (ejeMatch.includes("-")) fragmentEjes = ejeMatch.split("-").map(e => e.trim());
      }
      fragments.push({
        source_file: filename,
        source_section: "Fragmento #" + match[1] + ": " + match[2].trim(),
        axis: fragmentEjes,
        tension: tensionMatch ? parseFloat(tensionMatch[1]) : 0.8,
        content: quoteContent,
        keywords: extractKeywords(quoteContent),
        weight: pesoMatch ? parseFloat(pesoMatch[1]) : 1.0,
      });
    }
  }
  return fragments;
}

function extractKeywords(text: string): string[] {
  const stopWords = new Set(["el", "la", "los", "las", "un", "una", "de", "del", "a", "en", "es", "son", "que", "y", "o", "pero", "para", "por", "con", "sin", "tu", "su", "sus", "no", "si", "como", "cuando", "donde", "quien", "cual", "todo", "todos", "este", "esta", "estos", "estas", "ese", "esa", "bien", "mal", "tan", "muy", "mas", "menos"]);
  return [...new Set(text.toLowerCase().replace(/[¿?¡!.,;:"""''()[\]{}]/g, "").split(/\s+/).filter(w => w.length > 4 && !stopWords.has(w)))].slice(0, 10);
}

async function fetchCorpusFile(baseUrl: string, filename: string): Promise<string | null> {
  const url = baseUrl.replace(/\/$/, "") + "/" + filename;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.text();
  } catch { return null; }
}

async function upsertFragments(supabase: any, fragments: ParsedFragment[]): Promise<number> {
  if (fragments.length === 0) return 0;
  const { error } = await supabase.from("corpus_fragments").upsert(fragments.map(f => ({
    source_file: f.source_file, source_section: f.source_section, axis: f.axis, tension: f.tension, content: f.content, keywords: f.keywords, weight: f.weight,
  })), { onConflict: "source_file,source_section", ignoreDuplicates: false });
  if (error) throw error;
  return fragments.length;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const CORPUS_BASE_URL = Deno.env.get("CORPUS_BASE_URL") || "https://raw.githubusercontent.com/example/lagrange/main/src/data/corpus";
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase config missing");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Authorization required" }), { status: 401, headers: corsHeaders });
    if (!SUPABASE_SERVICE_ROLE_KEY.includes(authHeader.replace("Bearer ", ""))) return new Response(JSON.stringify({ error: "Service role required" }), { status: 403, headers: corsHeaders });
    
    let body: unknown = {};
    try { body = await req.json(); } catch { /* no body */ }
    const input = body as Record<string, unknown>;
    const fileFilter = input.file as string | undefined;
    const dryRun = input.dryRun as boolean || false;
    
    const results: SyncResult[] = [];
    let totalFragments = 0;
    
    for (const corpusFile of CORPUS_FILES) {
      if (fileFilter && !corpusFile.filename.includes(fileFilter)) continue;
      const content = await fetchCorpusFile(CORPUS_BASE_URL, corpusFile.filename);
      if (!content) { results.push({ file: corpusFile.filename, fragments: 0, status: "error", error: "Failed to fetch file" }); continue; }
      const fragments = parseCorpusFile(content, corpusFile.filename, corpusFile.ejes);
      if (fragments.length === 0) { results.push({ file: corpusFile.filename, fragments: 0, status: "skipped", error: "No fragments extracted or file inactive" }); continue; }
      if (dryRun) { results.push({ file: corpusFile.filename, fragments: fragments.length, status: "synced" }); totalFragments += fragments.length; continue; }
      try { const syncedCount = await upsertFragments(supabase, fragments); results.push({ file: corpusFile.filename, fragments: syncedCount, status: "synced" }); totalFragments += syncedCount; } catch (error) { results.push({ file: corpusFile.filename, fragments: 0, status: "error", error: error instanceof Error ? error.message : "Unknown error" }); }
    }
    
    let dbCount = 0;
    if (!dryRun) { const { count } = await supabase.from("corpus_fragments").select("*", { count: "exact", head: true }); dbCount = count || 0; }
    return new Response(JSON.stringify({ success: true, mode: dryRun ? "dry_run" : "live", total_fragments_synced: totalFragments, files: results, database_total_fragments: dbCount, corpus_base_url: CORPUS_BASE_URL, timestamp: new Date().toISOString() }, null, 2), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido", success: false }), { status: 500, headers: corsHeaders });
  }
});
