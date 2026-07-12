/**
 * Shared academy validation utilities
 */

export const GENESIS_ACADEMY_ID = '00000000-0000-0000-0000-000000000001';

export interface AcademyValidationResult {
  valid: boolean;
  error?: string;
  academyId?: string;
  axes?: { label: string; description?: string }[];
  role?: string;
}

/**
 * Validate academy membership and return academy info
 */
export async function validateAcademyMembership(
  supabase: any,
  userId: string,
  academyId: string | null | undefined
): Promise<AcademyValidationResult> {
  const effectiveAcademyId = academyId || GENESIS_ACADEMY_ID;
  
  // Check if academy exists
  const { data: academy, error: academyError } = await supabase
    .from('academies')
    .select('id, is_public, slug, name')
    .eq('id', effectiveAcademyId)
    .single();

  if (academyError || !academy) {
    return { valid: false, error: 'Academy not found' };
  }

  // Fetch thematic axes for this academy
  const { data: axes, error: axesError } = await supabase
    .from('thematic_axes')
    .select('label, description')
    .eq('academy_id', effectiveAcademyId)
    .eq('is_active', true);

  if (axesError) {
    return { valid: false, error: 'Failed to fetch axes' };
  }

  // If academy is public, allow access
  if (academy.is_public) {
    return { 
      valid: true, 
      academyId: effectiveAcademyId, 
      axes: axes || [] 
    };
  }

  // Check membership for private academies
  const { data: membership, error: membershipError } = await supabase
    .from('academy_members')
    .select('role')
    .eq('academy_id', effectiveAcademyId)
    .eq('user_id', userId)
    .single();

  if (membershipError || !membership) {
    return { valid: false, error: 'Access denied to this academy' };
  }

  return { 
    valid: true, 
    academyId: effectiveAcademyId, 
    axes: axes || [],
    role: membership.role
  };
}

/**
 * Format axes list for prompts
 */
export function formatAxesForPrompt(axes: { label: string; description?: string }[]): string {
  if (!axes || axes.length === 0) {
    return '- Miedo\n- Control\n- Salud Mental\n- Legitimidad\n- Responsabilidad';
  }
  return axes.map(a => `- ${a.label}`).join('\n');
}

/**
 * Validate that an eje exists in the available axes
 */
export function validateEje(
  eje: string | undefined,
  axes: { label: string }[]
): boolean {
  if (!eje) return true;
  if (!axes || axes.length === 0) return true;
  
  const ejeNormalized = eje.replace(/\s+/g, '').toLowerCase();
  return axes.some(a => {
    const labelNormalized = a.label.replace(/\s+/g, '').toLowerCase();
    return labelNormalized === ejeNormalized || a.label.toLowerCase() === eje.toLowerCase();
  });
}
