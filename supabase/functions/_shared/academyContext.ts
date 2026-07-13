/**
 * ============================================================================
 * ACADEMY CONTEXT - UNICO PUNTO DE ACCESO A ACADEMY ID Y MEMBRESIA
 * ============================================================================
 * 
 * Este archivo es el UNICO punto donde se resuelve y valida el academyId.
 * TODAS las funciones de IA deben usar las funciones de este archivo
 * y NUNCA deben consultar academy_members directamente.
 * 
 * REGLA DE ORO:
 * - Ninguna función de IA puede consultar academy_members, thematic_axes,
 *   topology_nodes, socratic_questions, diálogos_guardados, episodios_de_podcast
 *   o corpus_fragments sin pasar primero por este módulo.
 * 
 * ============================================================================
 */

/** ID de la academia genesis (fallback por defecto) */
export const GENESIS_ACADEMY_ID = '00000000-0000-0000-0000-000000000001';

/** Slug de la academia genesis */
export const GENESIS_SLUG = 'genesis';

/** Tipo de rol de usuario en una academia */
export type AcademyRole = 'owner' | 'admin' | 'platon' | 'member' | null;

/** Resultado de la validación de membresía */
export interface AcademyValidationResult {
  valid: boolean;
  error?: string;
  academyId?: string;
  academy?: {
    id: string;
    name: string;
    slug: string;
    is_public: boolean;
  };
  axes?: { id: string; label: string; description?: string; color: string }[];
  role?: AcademyRole;
}

/** Contexto completo de la academia incluyendo membresía */
export interface AcademyContextData {
  academyId: string;
  academy: AcademyValidationResult['academy'];
  axes: AcademyValidationResult['axes'];
  role: AcademyRole;
  userId: string;
}

/**
 * Resuelve el academyId a partir de un ID solicitado o un slug de fallback.
 * Si no se proporciona academyId, usa la academia genesis como fallback.
 */
export async function resolveAcademyId(
  supabase: any,
  requestedAcademyId?: string,
  fallbackSlug = GENESIS_SLUG
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

/**
 * Resuelve la academia por slug y retorna el ID.
 */
export async function resolveAcademyBySlug(
  supabase: any,
  slug: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('academies')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.id ?? null;
}

/**
 * Obtiene información completa de una academia.
 */
export async function getAcademy(
  supabase: any,
  academyId: string
): Promise<AcademyValidationResult['academy'] | null> {
  const { data, error } = await supabase
    .from('academies')
    .select('id, name, slug, is_public')
    .eq('id', academyId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    is_public: data.is_public,
  };
}

/**
 * Obtiene los ejes temáticos activos de una academia.
 */
export async function getAcademyAxes(
  supabase: any,
  academyId: string
): Promise<AcademyValidationResult['axes']> {
  const { data, error } = await supabase
    .from('thematic_axes')
    .select('id, label, description, color')
    .eq('academy_id', academyId)
    .eq('is_active', true)
    .order('order_index');

  if (error) {
    console.error('Error fetching axes:', error);
    return [];
  }

  return data || [];
}

/**
 * Obtiene el rol del usuario en una academia.
 */
export async function getUserRoleInAcademy(
  supabase: any,
  userId: string,
  academyId: string
): Promise<AcademyRole> {
  const { data, error } = await supabase
    .from('academy_members')
    .select('role')
    .eq('academy_id', academyId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.role as AcademyRole;
}

/**
 * Valida la membresía de un usuario en una academia y retorna
 * información completa del contexto.
 * 
 * Esta es la funcion PRINCIPAL que debe usarse para verificar acceso.
 * REGLA: NUNCA consultar academy_members directamente en otras funciones.
 */
export async function validateAcademyMembership(
  supabase: any,
  userId: string | null,
  academyId: string | null | undefined
): Promise<AcademyValidationResult> {
  const effectiveAcademyId = academyId || GENESIS_ACADEMY_ID;
  
  const academy = await getAcademy(supabase, effectiveAcademyId);
  
  if (!academy) {
    return { valid: false, error: 'Academy not found' };
  }

  const axes = await getAcademyAxes(supabase, effectiveAcademyId);

  if (academy.is_public) {
    return { 
      valid: true, 
      academyId: effectiveAcademyId, 
      academy,
      axes,
      role: null,
    };
  }

  if (!userId) {
    return { valid: false, error: 'Authentication required for private academy' };
  }

  const role = await getUserRoleInAcademy(supabase, userId, effectiveAcademyId);

  if (!role) {
    return { valid: false, error: 'Access denied to this academy' };
  }

  return { 
    valid: true, 
    academyId: effectiveAcademyId, 
    academy,
    axes,
    role,
  };
}

/**
 * Obtiene el contexto completo de la academia para un usuario.
 * Combina resolveAcademyId y validateAcademyMembership en una sola llamada.
 */
export async function getAcademyContext(
  supabase: any,
  userId: string | null,
  requestedAcademyId?: string
): Promise<AcademyContextData> {
  const academyId = await resolveAcademyId(supabase, requestedAcademyId);
  
  if (!academyId) {
    throw new Error('Academy not found');
  }

  const validation = await validateAcademyMembership(supabase, userId, academyId);
  
  if (!validation.valid) {
    throw new Error(validation.error || 'Access denied');
  }

  return {
    academyId: validation.academyId!,
    academy: validation.academy,
    axes: validation.axes,
    role: validation.role as AcademyRole,
    userId: userId || '',
  };
}

/**
 * Formatea la lista de ejes para usar en prompts de IA.
 */
export function formatAxesForPrompt(axes: { label: string; description?: string }[]): string {
  if (!axes || axes.length === 0) {
    return '- Miedo\n- Control\n- Salud Mental\n- Legitimidad\n- Responsabilidad';
  }
  return axes.map(a => `- ${a.label}`).join('\n');
}

/**
 * Formatea la lista de ejes con descripción para usar en prompts de IA.
 */
export function formatAxesWithDescription(axes: { label: string; description?: string }[]): string {
  if (!axes || axes.length === 0) {
    return '- Miedo: El miedo como herramienta de control\n- Control: Mecanismos de dominación\n- Salud Mental: Patologización del malestar\n- Legitimidad: Fabricación de legitimidad\n- Responsabilidad: Distribución asimétrica';
  }
  return axes.map(a => `- ${a.label}: ${a.description || ''}`).join('\n');
}

/**
 * Valida que un eje exista en la lista de ejes disponibles.
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

/**
 * Verifica si un usuario tiene rol de administrador o superior.
 */
export function isAdminRole(role: AcademyRole): boolean {
  return role === 'admin' || role === 'owner' || role === 'platon';
}

/**
 * Verifica si un usuario tiene rol de propietario.
 */
export function isOwnerRole(role: AcademyRole): boolean {
  return role === 'owner';
}
