// Backend Emulado - Simula peticiones de red leyendo de archivos JSON locales
// Fuente: Lagrange Backend Boost - Sprint 0

import nodesData from '@/data/topology/nodes.json';
import edgesData from '@/data/topology/edges.json';
import questionsData from '@/data/topology/socratic_questions.json';
import episodesData from '@/data/media/episodes.json';

export type AxisType = 'Miedo' | 'Control' | 'SaludMental' | 'Legitimidad' | 'Responsabilidad';

export interface LagrangeNode {
  id: string;
  label: string;
  description: string;
  x: number;
  y: number;
  weight: number;
  color: string;
  axis: AxisType;
  type?: 'core' | 'mechanism' | 'biological' | 'resistance';
  corpus_refs?: string[];
  question_count?: number;
}

export interface LagrangeEdge {
  id: string;
  source: string;
  target: string;
  tension: number;
  label: string;
  type?: 'causal' | 'consequence' | 'enabler' | 'mechanism' | 'tension' | 'cycle' | 'feedback' | 'biological' | 'resistance' | 'conflict';
}

export interface SocraticQuestion {
  id: string;
  eje: string;
  nivel: number;
  tension: number;
  texto: string;
}

export interface Episode {
  id: string;
  title: string;
  description: string;
  duration: string;
  audioFile: string | null;
  transcript: string | null;
  nodes: string[];
  status: 'pendiente' | 'activo' | 'completo';
}

// Simula latencia de red para mayor realismo
const simulateDelay = (ms: number = 100) => 
  new Promise(resolve => setTimeout(resolve, ms));

export async function fetchNodes(): Promise<LagrangeNode[]> {
  await simulateDelay();
  return nodesData as LagrangeNode[];
}

export async function fetchEdges(): Promise<LagrangeEdge[]> {
  await simulateDelay();
  return edgesData as LagrangeEdge[];
}

export async function fetchQuestions(): Promise<SocraticQuestion[]> {
  await simulateDelay();
  return questionsData as SocraticQuestion[];
}

export async function fetchEpisodes(): Promise<Episode[]> {
  await simulateDelay();
  return episodesData as Episode[];
}

export async function fetchQuestionsByEje(eje: string): Promise<SocraticQuestion[]> {
  await simulateDelay();
  return (questionsData as SocraticQuestion[]).filter(q => q.eje === eje);
}

export async function fetchQuestionsByAxis(axis: AxisType): Promise<SocraticQuestion[]> {
  await simulateDelay();
  return (questionsData as SocraticQuestion[]).filter(q => q.eje === axis);
}

export async function fetchRandomQuestion(): Promise<SocraticQuestion> {
  await simulateDelay();
  const questions = questionsData as SocraticQuestion[];
  return questions[Math.floor(Math.random() * questions.length)];
}

export async function fetchEpisodeById(id: string): Promise<Episode | undefined> {
  await simulateDelay();
  return (episodesData as Episode[]).find(e => e.id === id);
}

// Calcula el peso de tensión entre nodos basado en interacciones
export function calculateTensionWeight(
  nodeId: string, 
  interactions: Record<string, number>
): number {
  const node = (nodesData as LagrangeNode[]).find(n => n.id === nodeId);
  const baseWeight = node?.weight || 0.5;
  const interactionBoost = (interactions[nodeId] || 0) * 0.1;
  return Math.min(1, baseWeight + interactionBoost);
}

// Obtiene las conexiones de un nodo específico
export function getNodeConnections(nodeId: string): LagrangeEdge[] {
  return (edgesData as LagrangeEdge[]).filter(
    e => e.source === nodeId || e.target === nodeId
  );
}

// Obtiene un nodo por su ID
export function getNodeById(nodeId: string): LagrangeNode | undefined {
  return (nodesData as LagrangeNode[]).find(n => n.id === nodeId);
}

// Obtiene preguntas relacionadas con un nodo específico
export async function fetchQuestionsForNode(nodeId: string): Promise<SocraticQuestion[]> {
  await simulateDelay();
  const node = getNodeById(nodeId);
  if (!node) return [];
  return (questionsData as SocraticQuestion[]).filter(q => q.eje === node.axis);
}
