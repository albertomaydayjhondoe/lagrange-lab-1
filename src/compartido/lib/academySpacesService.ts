/**
 * Academy Spaces Service
 * Servicio para academy_spaces - la fusión de thematic_axes + subjects/topics
 */

import { supabase } from '@/compartido/lib/supabaseClient';

// =============================================================================
// TIPOS
// =============================================================================

export interface AcademySpace {
  id: string;
  academy_id: string;
  parent_space_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  color: string;
  is_active: boolean;
  order_index: number;
  source_table: 'thematic_axes' | 'subjects' | 'topics' | null;
  source_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AcademySpaceWithChildren extends AcademySpace {
  children: AcademySpace[];
}

// =============================================================================
// CONSTANTES
// =============================================================================

const GENESIS_ACADEMY_ID = '00000000-0000-0000-0000-000000000001';

// =============================================================================
// CACHE
// =============================================================================

const spacesCache: Record<string, AcademySpace[] | null> = {};

/**
 * Obtiene el academyId actual (de localStorage o genesis)
 */
export function getCurrentAcademyId(): string {
  return localStorage.getItem('currentAcademyId') || GENESIS_ACADEMY_ID;
}

/**
 * Invalida el cache de espacios para una academia
 */
export function invalidateSpacesCache(academyId?: string) {
  const id = academyId || getCurrentAcademyId();
  spacesCache[id] = null;
}

// =============================================================================
// FUNCIONES DE CONSULTA
// =============================================================================

/**
 * Obtiene todos los espacios de una academia
 */
export async function fetchAcademySpaces(academyId?: string): Promise<AcademySpace[]> {
  const id = academyId || getCurrentAcademyId();
  
  if (spacesCache[id]) {
    return spacesCache[id]!;
  }

  const { data, error } = await supabase
    .from('academy_spaces')
    .select('*')
    .eq('academy_id', id)
    .eq('is_active', true)
    .order('order_index');

  if (error) {
    console.error('Error fetching academy spaces:', error);
    return [];
  }

  spacesCache[id] = data || [];
  return spacesCache[id]!;
}

/**
 * Obtiene espacios de nivel raíz (sin parent) - equivalente a thematic_axes originales
 */
export async function fetchRootSpaces(academyId?: string): Promise<AcademySpace[]> {
  const spaces = await fetchAcademySpaces(academyId);
  return spaces.filter(s => !s.parent_space_id);
}

/**
 * Obtiene sub-espacios de un espacio padre - equivalente a topics
 */
export async function fetchChildSpaces(parentSpaceId: string, academyId?: string): Promise<AcademySpace[]> {
  const spaces = await fetchAcademySpaces(academyId);
  return spaces.filter(s => s.parent_space_id === parentSpaceId);
}

/**
 * Obtiene espacios en formato jerárquico
 */
export async function fetchSpacesHierarchy(academyId?: string): Promise<AcademySpaceWithChildren[]> {
  const spaces = await fetchAcademySpaces(academyId);
  
  // Espacios raíz con sus hijos
  const rootSpaces = spaces.filter(s => !s.parent_space_id);
  
  return rootSpaces.map(root => ({
    ...root,
    children: spaces.filter(s => s.parent_space_id === root.id)
  }));
}

/**
 * Obtiene un espacio por ID
 */
export async function fetchSpaceById(spaceId: string): Promise<AcademySpace | null> {
  const { data, error } = await supabase
    .from('academy_spaces')
    .select('*')
    .eq('id', spaceId)
    .single();

  if (error) {
    console.error('Error fetching space by id:', error);
    return null;
  }

  return data;
}

/**
 * Obtiene un espacio por slug
 */
export async function fetchSpaceBySlug(slug: string, academyId?: string): Promise<AcademySpace | null> {
  const id = academyId || getCurrentAcademyId();
  
  const { data, error } = await supabase
    .from('academy_spaces')
    .select('*')
    .eq('academy_id', id)
    .eq('slug', slug)
    .single();

  if (error) {
    // No es error crítico si no existe
    return null;
  }

  return data;
}

/**
 * Obtiene espacios de un tipo específico (source_table)
 */
export async function fetchSpacesByType(
  sourceTable: 'thematic_axes' | 'subjects',
  academyId?: string
): Promise<AcademySpace[]> {
  const spaces = await fetchAcademySpaces(academyId);
  return spaces.filter(s => s.source_table === sourceTable);
}

// =============================================================================
// FUNCIONES DE MUTACIÓN
// =============================================================================

export interface CreateSpaceInput {
  name: string;
  slug?: string;
  description?: string;
  icon?: string;
  color?: string;
  parent_space_id?: string;
  order_index?: number;
}

export interface UpdateSpaceInput {
  name?: string;
  slug?: string;
  description?: string;
  icon?: string;
  color?: string;
  is_active?: boolean;
  order_index?: number;
}

/**
 * Crea un nuevo espacio
 */
export async function createAcademySpace(
  input: CreateSpaceInput,
  academyId?: string
): Promise<{ success: boolean; space?: AcademySpace; error?: string }> {
  const id = academyId || getCurrentAcademyId();
  
  // Generar slug desde name si no se proporciona
  const slug = input.slug || generateSlug(input.name);
  
  const spaceData = {
    academy_id: id,
    name: input.name,
    slug,
    description: input.description || null,
    icon: input.icon || 'Folder',
    color: input.color || '#8B5CF6',
    parent_space_id: input.parent_space_id || null,
    order_index: input.order_index || 0,
  };

  const { data, error } = await supabase
    .from('academy_spaces')
    .insert(spaceData)
    .select()
    .single();

  if (error) {
    console.error('Error creating space:', error);
    return { success: false, error: error.message };
  }

  // Invalidar cache
  invalidateSpacesCache(id);

  return { success: true, space: data };
}

/**
 * Actualiza un espacio existente
 */
export async function updateAcademySpace(
  spaceId: string,
  input: UpdateSpaceInput
): Promise<{ success: boolean; space?: AcademySpace; error?: string }> {
  const { data, error } = await supabase
    .from('academy_spaces')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', spaceId)
    .select()
    .single();

  if (error) {
    console.error('Error updating space:', error);
    return { success: false, error: error.message };
  }

  // Invalidar cache
  invalidateSpacesCache();

  return { success: true, space: data };
}

/**
 * Elimina un espacio
 */
export async function deleteAcademySpace(spaceId: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('academy_spaces')
    .delete()
    .eq('id', spaceId);

  if (error) {
    console.error('Error deleting space:', error);
    return { success: false, error: error.message };
  }

  // Invalidar cache
  invalidateSpacesCache();

  return { success: true };
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Genera un slug URL-friendly desde un nombre
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Obtiene el color de un espacio por ID
 */
export async function getSpaceColor(spaceId: string): Promise<string> {
  const space = await fetchSpaceById(spaceId);
  return space?.color || '#8B5CF6';
}

/**
 * Obtiene el nombre de un espacio por ID
 */
export async function getSpaceName(spaceId: string): Promise<string> {
  const space = await fetchSpaceById(spaceId);
  return space?.name || 'Sin espacio';
}

/**
 * Formatea un espacio para mostrar (con jerarquía si aplica)
 */
export function formatSpaceName(space: AcademySpace, parentName?: string): string {
  if (parentName) {
    return `${parentName} > ${space.name}`;
  }
  return space.name;
}
