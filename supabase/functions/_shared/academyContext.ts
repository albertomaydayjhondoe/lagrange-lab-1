export async function resolveAcademyId(
  supabase: any,
  requestedAcademyId?: string,
  fallbackSlug = 'genesis'
): Promise<string | null> {
  const candidate = requestedAcademyId?.trim();
  if (candidate) {
    return candidate;
  }

  const { data, error } = await supabase
    .from('academies')
    .select('id')
    .eq('slug', fallbackSlug)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.id ?? null;
}
