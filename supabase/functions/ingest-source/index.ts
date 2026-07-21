/**
 * INGEST-SOURCE - Ingesta RAG Multi-Formato
 * 
 * Flujo según flowchart:
 * MULTIFORMAT → INGEST_MULTI → NORMALIZE → CHUNK → EMBED → STORE
 * 
 * Soporta:
 * F1: PDF / DOCX / TXT / MD
 * F2: Audio (requiere transcripción previa)
 * F3: Video (YouTube/local, requiere subtítulos)
 * F4: URL / artículo web (scraping automático)
 * F5: Imagen (requiere OCR)
 * F6: CSV (conversión a texto narrativo)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { normalizeContent, SourceInput, SUPPORTED_SOURCE_TYPES } from "../_shared/normalizer.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_GATEWAY_URL = (Deno.env.get("AI_GATEWAY_URL") ?? "https://api.openai.com/v1").replace(/\/$/, "");
const AI_EMBEDDING_MODEL = Deno.env.get("AI_EMBEDDING_MODEL") ?? "text-embedding-3-small";

const GENESIS_ACADEMY_ID = '00000000-0000-0000-0000-000000000001';

// Límites
const MAX_TEXT_LENGTH = 50000; // 50KB por fuente
const MAX_CHUNK_SIZE = 2000; // caracteres por chunk
const EMBEDDING_MODEL = AI_EMBEDDING_MODEL;

interface IngestResult {
  chunks_created: number;
  source_id: string;
  status: string;
  source_type: string;
  normalized: boolean;
  warnings?: string[];
}

interface IngestRequest {
  academyId?: string;
  spaceId?: string;  // Espacio dinámico (nuevo, sin lista fija de ejes)
  text?: string;      // Texto plano
  url?: string;       // URL para scraping
  file?: string;      // Base64 del archivo
  filename?: string;  // Nombre del archivo
  mimeType?: string;  // MIME type
  title?: string;
  pageReference?: string;  // Referencia página/minuto para provenance
}

/**
 * CHUNK: Fragmenta texto manteniendo metadata de procedencia
 */
function chunkText(
  text: string, 
  chunkIndex: number, 
  metadata: {
    source_file: string;
    source_type: string;
    page_reference?: string;
    ingested_at: string;
  }
): Array<{
  source_file: string;
  source_section: string;
  axis: string[];
  tension: number;
  content: string;
  keywords: string[];
  weight: number;
  academy_id: string;
  space_id?: string;
  source_type: string;
  embedding?: number[];
  title?: string;
  uploaded_by: string;
  ingested_at: string;
  embedding_model: string;
  original_url?: string;
  page_reference?: string;
  upload_status: string;
}> {
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const para of paragraphs) {
    if ((currentChunk + para).length > MAX_CHUNK_SIZE && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = para;
    } else {
      currentChunk += '\n\n' + para;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  // Filtrar chunks muy cortos y crear registros con metadata
  return chunks
    .filter(c => c.length > 50)
    .map((chunk, i) => ({
      source_file: metadata.source_file,
      source_section: `Chunk ${chunkIndex + i + 1} de ${chunks.length}`,
      axis: [],
      tension: 0.7,
      content: chunk,
      keywords: extractKeywords(chunk),
      weight: 1.0,
      academy_id: '', // Se llena después
      space_id: undefined as string | undefined,
      source_type: metadata.source_type,
      title: undefined,
      uploaded_by: '', // Se llena después
      ingested_at: metadata.ingested_at,
      embedding_model: EMBEDDING_MODEL,
      original_url: undefined,
      page_reference: metadata.page_reference,
      upload_status: 'completed',
    }));
}

/**
 * EMBED: Genera embedding para un fragmento
 */
async function getEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch(`${AI_GATEWAY_URL}/embeddings`, {
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

/**
 * Verifica acceso a la academia
 */
async function validateAcademyAccess(
  supabase: any, 
  userId: string, 
  academyId: string
): Promise<{ valid: boolean; error?: string }> {
  // Verificar que la academia existe
  const { data: academy } = await supabase
    .from('academies')
    .select('id, is_public')
    .eq('id', academyId)
    .single();

  if (!academy) {
    return { valid: false, error: 'Academy not found' };
  }

  // Verificar membership para academias privadas
  if (!academy.is_public) {
    const { data: membership } = await supabase
      .from('academy_members')
      .select('role')
      .eq('academy_id', academyId)
      .eq('user_id', userId)
      .single();

    if (!membership || !['owner', 'admin', 'platon'].includes(membership.role)) {
      return { valid: false, error: 'Insufficient permissions' };
    }
  }

  return { valid: true };
}

/**
 * Verifica acceso al espacio (si se especifica)
 */
async function validateSpaceAccess(
  supabase: any,
  userId: string,
  spaceId: string,
  academyId: string
): Promise<{ valid: boolean; error?: string }> {
  const { data: space } = await supabase
    .from('academy_spaces')
    .select('id, academy_id, name')
    .eq('id', spaceId)
    .single();

  if (!space) {
    return { valid: false, error: 'Space not found' };
  }

  if (space.academy_id !== academyId) {
    return { valid: false, error: 'Space does not belong to academy' };
  }

  return { valid: true };
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
    const AI_API_KEY = Deno.env.get("AI_API_KEY")!;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !AI_API_KEY) {
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
    let body: IngestRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: corsHeaders });
    }

    const { academyId, spaceId, text, url, file, filename, mimeType, title, pageReference } = body;
    const effectiveAcademyId = academyId || GENESIS_ACADEMY_ID;
    const ingestedAt = new Date().toISOString();
    const warnings: string[] = [];

    // Validar acceso a la academia
    const accessCheck = await validateAcademyAccess(supabase, user.id, effectiveAcademyId);
    if (!accessCheck.valid) {
      return new Response(JSON.stringify({ error: accessCheck.error }), { status: 403, headers: corsHeaders });
    }

    // Validar acceso al espacio si se especifica
    if (spaceId) {
      const spaceCheck = await validateSpaceAccess(supabase, user.id, spaceId, effectiveAcademyId);
      if (!spaceCheck.valid) {
        return new Response(JSON.stringify({ error: spaceCheck.error }), { status: 403, headers: corsHeaders });
      }
    }

    // NORMALIZE: Convertir cualquier formato a texto plano
    let normalizedContent;
    let sourceFile: string;
    let sourceType: string;

    if (url) {
      // F4: URL / web scraping
      normalizedContent = await normalizeContent({
        type: 'url',
        content: url,
        filename: filename
      });
      sourceFile = normalizedContent.title || url;
      sourceType = normalizedContent.source_type;
    } else if (file) {
      // F1/F2/F3/F5/F6: Archivos
      normalizedContent = await normalizeContent({
        type: 'base64',
        content: file,
        filename: filename,
        mimeType: mimeType
      });
      sourceFile = normalizedContent.title || filename || 'uploaded_file';
      sourceType = normalizedContent.source_type;
    } else if (text) {
      // Texto directo
      if (text.length > MAX_TEXT_LENGTH) {
        return new Response(JSON.stringify({ error: `Text exceeds ${MAX_TEXT_LENGTH} characters` }), { status: 400, headers: corsHeaders });
      }
      normalizedContent = {
        text: text,
        source_type: 'txt',
        title: title || 'text_input'
      };
      sourceFile = title || 'text_input';
      sourceType = 'txt';
    } else {
      return new Response(JSON.stringify({ error: 'text, url, or file is required' }), { status: 400, headers: corsHeaders });
    }

    // Verificar si el contenido fue normalizado correctamente
    const isNormalized = !normalizedContent.text.includes('_PENDIENTE') && !normalizedContent.text.includes('_ERROR');
    
    if (!isNormalized) {
      warnings.push('El contenido requiere procesamiento adicional (parser pendiente)');
    }

    // Crear source ID
    const sourceId = crypto.randomUUID();

    // CHUNK: Fragmentar texto
    const chunks = chunkText(normalizedContent.text, 0, {
      source_file: sourceFile,
      source_type: sourceType,
      page_reference: pageReference || normalizedContent.page_reference,
      ingested_at: ingestedAt
    });

    // EMBED + STORE: Procesar cada chunk y crear embeddings
    const records = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Llenar campos faltantes
      chunk.academy_id = effectiveAcademyId;
      chunk.space_id = spaceId || null;
      chunk.uploaded_by = user.id;
      chunk.title = normalizedContent.title || title || sourceFile;
      
      if (normalizedContent.original_url) {
        chunk.original_url = normalizedContent.original_url;
      }

      try {
        // Generar embedding
        const embedding = await getEmbedding(chunk.content, AI_API_KEY);
        chunk.embedding = embedding;
        records.push({ ...chunk });
      } catch (error) {
        console.error('Error processing chunk:', error);
        // Store without embedding if embedding fails
        chunk.upload_status = 'embedding_failed';
        records.push({ ...chunk });
        warnings.push(`Chunk ${i + 1}: Falló embedding`);
      }
    }

    // STORE: Batch insert
    if (records.length > 0) {
      const { error: insertError } = await supabase
        .from('corpus_fragments')
        .insert(records);

      if (insertError) {
        throw insertError;
      }
    }

    console.log(`INGEST complete: ${records.length} chunks, source_type=${sourceType}, normalized=${isNormalized} for user ${user.id}`);

    const result: IngestResult = {
      source_id: sourceId,
      chunks_created: records.length,
      status: isNormalized ? 'completed' : 'needs_review',
      source_type: sourceType,
      normalized: isNormalized,
      warnings: warnings.length > 0 ? warnings : undefined
    };

    return new Response(JSON.stringify(result), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (error) {
    console.error('Ingest error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});

/**
 * Extrae keywords para búsqueda
 */
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'a', 'en', 'es', 'son', 'que', 'y', 
    'o', 'pero', 'para', 'por', 'con', 'sin', 'tu', 'su', 'sus', 'no', 'si', 'como', 
    'cuando', 'donde', 'quien', 'cual', 'todo', 'todos', 'este', 'esta', 'estos', 'estas',
    'ese', 'esa', 'esos', 'esas', 'aquel', 'aquella', 'aquellos', 'aquellas'
  ]);
  return [...new Set(
    text.toLowerCase()
      .replace(/[¿?¡!.,;:"""''()[\]{}]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 4 && !stopWords.has(w))
  )].slice(0, 10);
}

// Exportar tipos soportados para documentación
export { SUPPORTED_SOURCE_TYPES };
