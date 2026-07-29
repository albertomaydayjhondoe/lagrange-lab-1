/**
 * Corpus Retrieval Utilities - RAG con Procedencia Completa
 * 
 * Flujo según flowchart:
 * R1 → R2 → R3 (match_corpus_fragments) → R4 → R5 → PROVENANCE
 * 
 * Campos de provenance:
 * - P1: Fragmento exacto usado (source_file + snippet)
 * - P2: Formato original (PDF pág X / min Y del video / URL)
 * - P3: Similitud semántica (score 0-1)
 * - P4: Modelo IA + timestamp de generación
 * - P5: Marca de inferencia sin respaldo directo
 */

export interface ProvenanceData {
  fragment_id: string;
  source_file: string;
  source_type: string;
  source_content: string;
  original_url?: string;
  page_reference?: string;
  similarity_score: number;
  citation_order: number;
  is_inference_only: boolean;
  ingested_at?: string;
  uploaded_by?: string;
}

export interface CorpusFragment {
  id: string;
  source_file: string;
  source_section?: string;
  axis: string[];
  tension: number;
  content: string;
  keywords: string[];
  weight?: number;
  academy_id?: string;
  space_id?: string;
  embedding?: number[];
  source_type?: string;
  title?: string;
  // Provenance fields (P1-P4)
  similarity?: number;
  ingested_at?: string;
  uploaded_by?: string;
  embedding_model?: string;
  original_url?: string;
  page_reference?: string;
}

export interface RAGResult {
  fragments: CorpusFragment[];
  provenance: ProvenanceData[];
  has_inference_only: boolean;
  total_sources: number;
}

/**
 * Fetch corpus fragments filtered by academy and space_id (dinámico)
 */
export async function fetchCorpusFragments(
  supabase: any,
  academyId: string,
  eje?: string,
  limit: number = 2
): Promise<CorpusFragment[]> {
  try {
    let query = supabase
      .from('corpus_fragments')
      .select('*')
      .eq('academy_id', academyId)
      .order('tension', { ascending: false })
      .limit(limit * 2);

    if (eje) {
      query = query.overlaps('axis', [eje]);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      // Fallback: try global corpus (academy_id IS NULL)
      let fallbackQuery = supabase
        .from('corpus_fragments')
        .select('*')
        .is('academy_id', null)
        .order('tension', { ascending: false })
        .limit(limit);

      if (eje) {
        fallbackQuery = fallbackQuery.overlaps('axis', [eje]);
      }

      const { data: fallbackData, error: fallbackError } = await fallbackQuery;
      if (fallbackError || !fallbackData || fallbackData.length === 0) {
        return [];
      }
      return fallbackData;
    }

    return data.slice(0, limit);
  } catch (error) {
    console.error('Error fetching corpus fragments:', error);
    return [];
  }
}

/**
 * Fetch corpus fragments using vector similarity (requires pgvector)
 * Con filtrado por space_id dinámico y provenance completa
 */
export async function fetchCorpusFragmentsWithRAG(
  supabase: any,
  academyId: string,
  queryEmbedding?: number[],
  spaceId?: string,
  limit: number = 3
): Promise<RAGResult> {
  const defaultResult: RAGResult = {
    fragments: [],
    provenance: [],
    has_inference_only: false,
    total_sources: 0
  };

  try {
    // If we have an embedding, use vector similarity via RPC
    if (queryEmbedding && queryEmbedding.length === 1536) {
      try {
        const { data, error } = await supabase.rpc('match_corpus_fragments', {
          query_embedding: queryEmbedding,
          match_academy_id: academyId,
          match_space_id: spaceId || null,
          match_count: limit,
          match_threshold: 0.6
        });

        if (!error && data && data.length > 0) {
          console.log(`RAG: Using ${data.length} fragments from vector search via RPC`);
          
          // Build provenance data
          const provenance: ProvenanceData[] = data.map((fragment: CorpusFragment, index: number) => ({
            fragment_id: fragment.id,
            source_file: fragment.source_file,
            source_type: fragment.source_type || 'unknown',
            source_content: fragment.content.substring(0, 500), // Truncate for storage
            original_url: fragment.original_url,
            page_reference: fragment.page_reference,
            similarity_score: fragment.similarity || 0,
            citation_order: index + 1,
            is_inference_only: false, // Se marca si la respuesta tiene partes sin fuente
            ingested_at: fragment.ingested_at,
            uploaded_by: fragment.uploaded_by
          }));

          return {
            fragments: data,
            provenance,
            has_inference_only: false,
            total_sources: data.length
          };
        }
        
        if (error) {
          console.warn('RAG RPC error, falling back to basic fetch:', error.message);
        }
      } catch (rpcError) {
        console.warn('RAG RPC call failed, falling back to basic fetch:', rpcError);
      }
    }

    // Fallback: basic fetch without provenance
    const fragments = await fetchCorpusFragments(supabase, academyId, undefined, limit);
    return {
      ...defaultResult,
      fragments,
      provenance: [],
      has_inference_only: true, // Sin RAG, solo memoria genérica
      total_sources: 0
    };
  } catch (error) {
    console.error('Error in RAG corpus fetch:', error);
    const fragments = await fetchCorpusFragments(supabase, academyId, undefined, limit);
    return {
      fragments,
      provenance: [],
      has_inference_only: true,
      total_sources: 0
    };
  }
}

/**
 * Format corpus fragments for use in prompts (R4: Tutor IA usa SOLO fragmentos como contexto)
 */
export function formatCorpusContext(
  fragments: CorpusFragment[],
  includeProvenance: boolean = false
): string {
  if (!fragments || fragments.length === 0) {
    return '';
  }

  const formatted = fragments.map((f, i) => {
    // Header con información de provenance
    const sourceTypeIcon = getSourceTypeIcon(f.source_type);
    const header = f.title 
      ? `${sourceTypeIcon} ## Fragmento ${i + 1}: ${f.title}` 
      : `${sourceTypeIcon} ## Fragmento ${i + 1}`;
    
    // Metadata de provenance
    const metadataParts: string[] = [];
    
    // P2: Formato original
    if (f.source_type) {
      metadataParts.push(`Tipo: ${f.source_type.toUpperCase()}`);
    }
    
    // P2: Referencia página/minuto
    if (f.page_reference) {
      metadataParts.push(`Referencia: ${f.page_reference}`);
    }
    
    // P2: URL original
    if (f.original_url) {
      metadataParts.push(`Fuente: ${f.original_url}`);
    }
    
    // P3: Similitud semántica
    if (f.similarity !== undefined) {
      metadataParts.push(`Similitud: ${(f.similarity * 100).toFixed(1)}%`);
    }
    
    const metadataInfo = metadataParts.length > 0 
      ? `\n[${metadataParts.join(' | ')}]` 
      : '';
    
    const axesInfo = f.axis && f.axis.length > 0 ? `\nEjes: ${f.axis.join(', ')}` : '';
    
    return `${header}${metadataInfo}${axesInfo}\n${f.content}`;
  }).join('\n\n');

  const provenanceNote = includeProvenance 
    ? '\n\n⚠️ *Nota: Las fuentes anteriores fueron usadas para generar esta respuesta. Cada fragmento incluye su referencia original.*'
    : '';

  return `## Contexto del Corpus (${fragments.length} fuentes)\n\n${formatted}\n\n---\n${provenanceNote}`;
}

/**
 * Get icon for source type (para display)
 */
function getSourceTypeIcon(sourceType?: string): string {
  const icons: Record<string, string> = {
    'pdf': '📄',
    'docx': '📝',
    'txt': '📃',
    'md': '📋',
    'audio': '🎙️',
    'video': '🎬',
    'url': '🌐',
    'imagen': '🖼️',
    'csv': '📊',
    'user_upload': '📤',
    'seed': '🌱'
  };
  return icons[sourceType || ''] || '📄';
}

/**
 * Format provenance for UI display (DISPLAY: panel 'Fuentes usadas')
 */
export function formatProvenanceForDisplay(provenance: ProvenanceData[]): string {
  if (!provenance || provenance.length === 0) {
    return '';
  }

  const formatted = provenance.map(p => {
    const icon = getSourceTypeIcon(p.source_type);
    const similarity = p.similarity_score > 0 
      ? `**${(p.similarity_score * 100).toFixed(1)}%**` 
      : 'N/A';
    
    const ref = p.page_reference 
      ? ` (${p.page_reference})` 
      : p.original_url 
        ? ` [${truncateUrl(p.original_url)}]` 
        : '';

    return `${icon} **${p.source_file}**${ref}\n   - Similitud: ${similarity}\n   - Snippet: _"${truncateText(p.source_content, 150)}..."_`;
  }).join('\n\n');

  return `## 📋 Fuentes Usadas\n\n${formatted}`;
}

/**
 * Truncate URL for display
 */
function truncateUrl(url: string, maxLen: number = 50): string {
  if (url.length <= maxLen) return url;
  return url.substring(0, maxLen - 3) + '...';
}

/**
 * Truncate text with ellipsis
 */
function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen - 3) + '...';
}
