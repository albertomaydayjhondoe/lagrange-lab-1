export async function fetchCorpusContext(supabase: any, academyId: string | undefined, eje: string | undefined, limit = 4) {
  try {
    let query = supabase.from('corpus_fragments').select('content, axis, tension').order('tension', { ascending: false }).limit(limit);

    if (academyId) {
      query = query.eq('academy_id', academyId);
    }

    if (eje) {
      // axis is stored as text[]; use contains to match eje inside the array
      try {
        query = query.contains('axis', [eje]);
      } catch (_) {
        // fallback to eq in case axis stored as text in some rows
        query = query.eq('axis', eje);
      }
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Error fetching corpus fragments', error);
      return { rows: [], context: '' };
    }

    const rows = data || [];
    const context = rows.length > 0
      ? `\n## Contexto de corpus relevante\n${rows.map((r: any) => `- [${Array.isArray(r.axis) ? r.axis.join(', ') : r.axis}] ${r.content}`).join('\n')}\n`
      : '';

    return { rows, context };
  } catch (err) {
    console.warn('fetchCorpusContext error', err);
    return { rows: [], context: '' };
  }
}
