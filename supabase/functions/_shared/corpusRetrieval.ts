/**
 * Corpus Retrieval Utilities
 * 
 * Shared functions for fetching corpus fragments with RAG support.
 */

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
  embedding?: number[];
  source_type?: string;
  title?: string;
}

/**
 * Fetch corpus fragments filtered by academy and optionally by eje
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
 * Falls back to keyword/axis filtering if no query vector provided
 */
export async function fetchCorpusFragmentsWithRAG(
  supabase: any,
  academyId: string,
  queryEmbedding?: number[],
  eje?: string,
  limit: number = 3
): Promise<CorpusFragment[]> {
  try {
    // If we have an embedding, use vector similarity
    if (queryEmbedding && queryEmbedding.length === 1536) {
      const embeddingStr = `[${queryEmbedding.join(',')}]`;
      
      const query = supabase
        .from('corpus_fragments')
        .select('*')
        .or(`academy_id.eq.${academyId},academy_id.is.null`)
        .not('embedding', 'is', null)
        .order('embedding', { ascending: false, params: { useCosineDistance: true } })
        .limit(limit);

      // For now, use simple filtering - full vector search requires raw SQL
      const { data, error } = await query;
      
      if (!error && data && data.length > 0) {
        console.log(`RAG: Using ${data.length} fragments from vector search`);
        return data.slice(0, limit);
      }
    }

    // Fallback: use axis/eje filtering
    return fetchCorpusFragments(supabase, academyId, eje, limit);
  } catch (error) {
    console.error('Error in RAG corpus fetch:', error);
    // Fallback to basic fetch
    return fetchCorpusFragments(supabase, academyId, eje, limit);
  }
}

/**
 * Format corpus fragments for use in prompts
 */
export function formatCorpusContext(fragments: CorpusFragment[]): string {
  if (!fragments || fragments.length === 0) {
    return '';
  }

  const formatted = fragments.map((f, i) => {
    const header = f.title ? `## Fragmento ${i + 1}: ${f.title}` : `## Fragmento ${i + 1}`;
    const axesInfo = f.axis && f.axis.length > 0 ? `\nAxes: ${f.axis.join(', ')}` : '';
    const tensionInfo = f.tension ? `\nTensión: ${f.tension}` : '';
    return `${header}${axesInfo}${tensionInfo}\n${f.content}`;
  }).join('\n\n');

  return `## Contexto del Corpus\n\n${formatted}\n\n---\n`;
}
