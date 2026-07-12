import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GENESIS_ACADEMY_ID = '00000000-0000-0000-0000-000000000001';

// Limits
const MAX_TEXT_LENGTH = 50000; // 50KB per source
const MAX_CHUNK_SIZE = 2000; // characters per chunk
const EMBEDDING_MODEL = 'text-embedding-ada-002';

interface IngestResult {
  chunks_created: number;
  source_id: string;
  status: string;
}

function chunkText(text: string, chunkSize: number = MAX_CHUNK_SIZE): string[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const para of paragraphs) {
    if ((currentChunk + para).length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = para;
    } else {
      currentChunk += '\n\n' + para;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter(c => c.length > 50); // Filter very short chunks
}

async function getEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text.substring(0, 8000), // Max 8k chars for embedding
    }),
  });

  if (!response.ok) {
    throw new Error(`Embedding API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), { status: 401, headers: corsHeaders });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !LOVABLE_API_KEY) {
      throw new Error("Missing configuration");
    }

    // Create service role client for admin operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify user
    const anonClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: corsHeaders });
    }

    // Parse body
    let body: { academyId?: string; text?: string; title?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: corsHeaders });
    }

    const { academyId, text, title } = body;

    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'text is required' }), { status: 400, headers: corsHeaders });
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return new Response(JSON.stringify({ error: `Text exceeds ${MAX_TEXT_LENGTH} characters` }), { status: 400, headers: corsHeaders });
    }

    // Validate academy membership
    const effectiveAcademyId = academyId || GENESIS_ACADEMY_ID;
    
    // Check if academy exists and is accessible
    const { data: academy } = await supabase
      .from('academies')
      .select('id, is_public')
      .eq('id', effectiveAcademyId)
      .single();

    if (!academy) {
      return new Response(JSON.stringify({ error: 'Academy not found' }), { status: 404, headers: corsHeaders });
    }

    // Check membership for private academies
    if (!academy.is_public) {
      const { data: membership } = await supabase
        .from('academy_members')
        .select('role')
        .eq('academy_id', effectiveAcademyId)
        .eq('user_id', user.id)
        .single();

      if (!membership || !['owner', 'admin', 'platon'].includes(membership.role)) {
        return new Response(JSON.stringify({ error: 'Insufficient permissions' }), { status: 403, headers: corsHeaders });
      }
    }

    // Create source record
    const sourceId = crypto.randomUUID();
    
    // Chunk text
    const chunks = chunkText(text);
    
    // Process each chunk and create embedding
    const records = [];
    for (const chunk of chunks) {
      try {
        const embedding = await getEmbedding(chunk, LOVABLE_API_KEY);
        
        records.push({
          source_file: title || 'user_upload',
          source_section: `Chunk ${records.length + 1}`,
          axis: [],
          tension: 0.7,
          content: chunk,
          keywords: extractKeywords(chunk),
          weight: 1.0,
          academy_id: effectiveAcademyId,
          source_type: 'user_upload',
          embedding: embedding,
          title: title,
          user_upload_id: user.id,
          upload_status: 'completed',
        });
      } catch (error) {
        console.error('Error processing chunk:', error);
        // Store without embedding if embedding fails
        records.push({
          source_file: title || 'user_upload',
          source_section: `Chunk ${records.length + 1}`,
          axis: [],
          tension: 0.7,
          content: chunk,
          keywords: extractKeywords(chunk),
          weight: 1.0,
          academy_id: effectiveAcademyId,
          source_type: 'user_upload',
          title: title,
          user_upload_id: user.id,
          upload_status: 'completed',
        });
      }
    }

    // Batch insert
    if (records.length > 0) {
      const { error: insertError } = await supabase
        .from('corpus_fragments')
        .insert(records);

      if (insertError) {
        throw insertError;
      }
    }

    console.log(`Ingest complete: ${records.length} chunks for user ${user.id}`);

    return new Response(JSON.stringify({
      success: true,
      source_id: sourceId,
      chunks_created: records.length,
      academy_id: effectiveAcademyId,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error('Ingest error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});

function extractKeywords(text: string): string[] {
  const stopWords = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'a', 'en', 'es', 'son', 'que', 'y', 'o', 'pero', 'para', 'por', 'con', 'sin', 'tu', 'su', 'sus', 'no', 'si', 'como', 'cuando', 'donde', 'quien', 'cual', 'todo', 'todos']);
  return [...new Set(text.toLowerCase().replace(/[¿?¡!.,;:"""''()[\]{}]/g, '').split(/\s+/).filter(w => w.length > 4 && !stopWords.has(w)))].slice(0, 10);
}
