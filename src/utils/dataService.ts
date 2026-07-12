// Backend Service - Conecta con Supabase para datos de topología
// Fuente: Lagrange Backend - Sprint 1

import { supabase } from '@/integrations/supabase/client';

// Tipo dinámico - los ejes ahora vienen de la DB
export type AxisType = string;

export interface ThematicAxis {
  id: string;
  label: string;
  description: string | null;
  color: string;
  suggested_question_ids: string[] | null;
  order_index: number;
  is_active: boolean;
  metadata: unknown;
}

export interface LagrangeNode {
  id: string;
  label: string;
  description: string | null;
  x: number;
  y: number;
  weight: number;
  color: string;
  axis: string;
  type: string;
  corpus_refs?: string[] | null;
  question_count?: number | null;
}

export interface LagrangeEdge {
  id: string;
  source: string;
  target: string;
  tension: number;
  label: string | null;
  type: string;
}

export interface SocraticQuestion {
  id: string;
  eje: string;
  nivel: number;
  tension: number;
  texto: string;
  corpus_ref?: string | null;
}

export interface Episode {
  id: string;
  title: string;
  description: string | null;
  audio_url: string;
  duration_seconds: number | null;
  eje: string | null;
  published: boolean | null;
  published_at: string | null;
  created_at: string;
}

// Cache para evitar múltiples peticiones (por academy)
const cacheByAcademy: Record<string, {
  axes: ThematicAxis[] | null;
  nodes: LagrangeNode[] | null;
  edges: LagrangeEdge[] | null;
  questions: SocraticQuestion[] | null;
}> = {};

// ID de la academia genesis (legacy)
const GENESIS_ACADEMY_ID = '00000000-0000-0000-0000-000000000001';

// Obtiene el academyId actual (de localStorage o genesis)
export function getCurrentAcademyId(): string {
  return localStorage.getItem('currentAcademyId') || GENESIS_ACADEMY_ID;
}

// Invalida el cache para una academia
export function invalidateAcademyCache(academyId?: string) {
  const id = academyId || getCurrentAcademyId();
  cacheByAcademy[id] = { axes: null, nodes: null, edges: null, questions: null };
}

// ===== EJES TEMÁTICOS (DINÁMICOS) =====

export async function fetchAxes(academyId?: string): Promise<ThematicAxis[]> {
  const id = academyId || getCurrentAcademyId();
  const cache = cacheByAcademy[id] || (cacheByAcademy[id] = { axes: null, nodes: null, edges: null, questions: null });
  
  if (cache.axes) return cache.axes;
  
  const { data, error } = await supabase
    .from('thematic_axes')
    .select('*')
    .eq('academy_id', id)
    .eq('is_active', true)
    .order('order_index');
  
  if (error) {
    console.error('Error fetching axes:', error);
    return [];
  }
  
  cache.axes = data || [];
  return cache.axes;
}

export async function fetchAxisById(id: string): Promise<ThematicAxis | null> {
  const axes = await fetchAxes();
  return axes.find(a => a.id === id) || null;
}

export async function getAxisColor(axisId: string): Promise<string> {
  const axis = await fetchAxisById(axisId);
  return axis?.color || '#3b82f6';
}

export async function getSuggestedQuestionIds(axisId: string): Promise<string[]> {
  const axis = await fetchAxisById(axisId);
  return axis?.suggested_question_ids || [];
}

export async function fetchNodes(academyId?: string): Promise<LagrangeNode[]> {
  const id = academyId || getCurrentAcademyId();
  const cache = cacheByAcademy[id] || (cacheByAcademy[id] = { axes: null, nodes: null, edges: null, questions: null });
  
  if (cache.nodes) return cache.nodes;
  
  const { data, error } = await supabase
    .from('topology_nodes')
    .select('*')
    .eq('academy_id', id)
    .order('id');
  
  if (error) {
    console.error('Error fetching nodes:', error);
    return [];
  }
  
  cache.nodes = data || [];
  return cache.nodes;
}

export async function fetchEdges(academyId?: string): Promise<LagrangeEdge[]> {
  const id = academyId || getCurrentAcademyId();
  const cache = cacheByAcademy[id] || (cacheByAcademy[id] = { axes: null, nodes: null, edges: null, questions: null });
  
  if (cache.edges) return cache.edges;
  
  const { data, error } = await supabase
    .from('topology_edges')
    .select('*')
    .eq('academy_id', id)
    .order('id');
  
  if (error) {
    console.error('Error fetching edges:', error);
    return [];
  }
  
  cache.edges = data || [];
  return cache.edges;
}

export async function fetchQuestions(academyId?: string): Promise<SocraticQuestion[]> {
  const id = academyId || getCurrentAcademyId();
  const cache = cacheByAcademy[id] || (cacheByAcademy[id] = { axes: null, nodes: null, edges: null, questions: null });
  
  if (cache.questions) return cache.questions;
  
  const { data, error } = await supabase
    .from('socratic_questions')
    .select('*')
    .eq('academy_id', id)
    .order('id');
  
  if (error) {
    console.error('Error fetching questions:', error);
    return [];
  }
  
  cache.questions = data || [];
  return cache.questions;
}

export async function fetchEpisodes(academyId?: string): Promise<Episode[]> {
  const id = academyId || getCurrentAcademyId();
  
  const { data, error } = await supabase
    .from('podcast_episodes')
    .select('*')
    .eq('academy_id', id)
    .eq('published', true)
    .order('published_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching episodes:', error);
    return [];
  }
  
  return data || [];
}

export async function fetchQuestionsByEje(eje: string, academyId?: string): Promise<SocraticQuestion[]> {
  const id = academyId || getCurrentAcademyId();
  
  const { data, error } = await supabase
    .from('socratic_questions')
    .select('*')
    .eq('academy_id', id)
    .eq('eje', eje)
    .order('nivel');
  
  if (error) {
    console.error('Error fetching questions by eje:', error);
    return [];
  }
  
  return data || [];
}

export async function fetchQuestionsByAxis(axis: AxisType): Promise<SocraticQuestion[]> {
  return fetchQuestionsByEje(axis);
}

export async function fetchRandomQuestion(): Promise<SocraticQuestion | null> {
  const questions = await fetchQuestions();
  if (questions.length === 0) return null;
  return questions[Math.floor(Math.random() * questions.length)];
}

export async function fetchEpisodeById(id: string): Promise<Episode | null> {
  const { data, error } = await supabase
    .from('podcast_episodes')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  
  if (error) {
    console.error('Error fetching episode:', error);
    return null;
  }
  
  return data;
}

// Calcula el peso de tensión entre nodos basado en interacciones
export async function calculateTensionWeight(
  nodeId: string, 
  interactions: Record<string, number>
): Promise<number> {
  const nodes = await fetchNodes();
  const node = nodes.find(n => n.id === nodeId);
  const baseWeight = node?.weight || 0.5;
  const interactionBoost = (interactions[nodeId] || 0) * 0.1;
  return Math.min(1, baseWeight + interactionBoost);
}

// Obtiene las conexiones de un nodo específico
export async function getNodeConnections(nodeId: string): Promise<LagrangeEdge[]> {
  const edges = await fetchEdges();
  return edges.filter(e => e.source === nodeId || e.target === nodeId);
}

// Obtiene un nodo por su ID
export async function getNodeById(nodeId: string): Promise<LagrangeNode | null> {
  const nodes = await fetchNodes();
  return nodes.find(n => n.id === nodeId) || null;
}

// Obtiene preguntas relacionadas con un nodo específico
export async function fetchQuestionsForNode(nodeId: string): Promise<SocraticQuestion[]> {
  const node = await getNodeById(nodeId);
  if (!node) return [];
  return fetchQuestionsByEje(node.axis);
}

// Invalida el cache (útil después de ediciones)
export function invalidateCache() {
  axesCache = null;
  nodesCache = null;
  edgesCache = null;
  questionsCache = null;
}

// Registra interacción del usuario
export async function recordInteraction(
  nodeId: string, 
  sessionId: string, 
  interactionType: string = 'click',
  tensionLevel: number = 0
): Promise<void> {
  const { error } = await supabase
    .from('user_interactions')
    .insert({
      node_id: nodeId,
      session_id: sessionId,
      interaction_type: interactionType,
      tension_level: tensionLevel
    });
  
  if (error) {
    console.error('Error recording interaction:', error);
  }
}
