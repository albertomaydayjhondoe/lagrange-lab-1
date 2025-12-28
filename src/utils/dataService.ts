// Backend Service - Conecta con Supabase para datos de topología
// Fuente: Lagrange Backend - Sprint 1

import { supabase } from '@/integrations/supabase/client';

export type AxisType = 'Miedo' | 'Control' | 'SaludMental' | 'Legitimidad' | 'Responsabilidad';

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

// Cache para evitar múltiples peticiones
let nodesCache: LagrangeNode[] | null = null;
let edgesCache: LagrangeEdge[] | null = null;
let questionsCache: SocraticQuestion[] | null = null;

export async function fetchNodes(): Promise<LagrangeNode[]> {
  if (nodesCache) return nodesCache;
  
  const { data, error } = await supabase
    .from('topology_nodes')
    .select('*')
    .order('id');
  
  if (error) {
    console.error('Error fetching nodes:', error);
    return [];
  }
  
  nodesCache = data || [];
  return nodesCache;
}

export async function fetchEdges(): Promise<LagrangeEdge[]> {
  if (edgesCache) return edgesCache;
  
  const { data, error } = await supabase
    .from('topology_edges')
    .select('*')
    .order('id');
  
  if (error) {
    console.error('Error fetching edges:', error);
    return [];
  }
  
  edgesCache = data || [];
  return edgesCache;
}

export async function fetchQuestions(): Promise<SocraticQuestion[]> {
  if (questionsCache) return questionsCache;
  
  const { data, error } = await supabase
    .from('socratic_questions')
    .select('*')
    .order('id');
  
  if (error) {
    console.error('Error fetching questions:', error);
    return [];
  }
  
  questionsCache = data || [];
  return questionsCache;
}

export async function fetchEpisodes(): Promise<Episode[]> {
  const { data, error } = await supabase
    .from('podcast_episodes')
    .select('*')
    .eq('published', true)
    .order('published_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching episodes:', error);
    return [];
  }
  
  return data || [];
}

export async function fetchQuestionsByEje(eje: string): Promise<SocraticQuestion[]> {
  const { data, error } = await supabase
    .from('socratic_questions')
    .select('*')
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
