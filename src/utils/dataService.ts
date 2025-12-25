// Backend Emulado - Simula peticiones de red leyendo de archivos JSON locales
import nodesData from '@/data/nodes.json';
import edgesData from '@/data/edges.json';
import questionsData from '@/data/socratic_questions.json';

export interface LagrangeNode {
  id: string;
  label: string;
  description: string;
  x: number;
  y: number;
  weight: number;
  color: 'tension' | 'node' | 'calm' | 'gold';
}

export interface LagrangeEdge {
  id: string;
  source: string;
  target: string;
  tension: number;
  label: string;
}

export interface SocraticQuestion {
  id: string;
  eje: string;
  nivel: number;
  tension: number;
  texto: string;
}

// Simula latencia de red para mayor realismo
const simulateDelay = (ms: number = 100) => 
  new Promise(resolve => setTimeout(resolve, ms));

export async function fetchNodes(): Promise<LagrangeNode[]> {
  await simulateDelay();
  return nodesData.nodes as LagrangeNode[];
}

export async function fetchEdges(): Promise<LagrangeEdge[]> {
  await simulateDelay();
  return edgesData.edges as LagrangeEdge[];
}

export async function fetchQuestions(): Promise<SocraticQuestion[]> {
  await simulateDelay();
  return questionsData.questions as SocraticQuestion[];
}

export async function fetchQuestionsByEje(eje: string): Promise<SocraticQuestion[]> {
  await simulateDelay();
  return questionsData.questions.filter(q => q.eje === eje) as SocraticQuestion[];
}

export async function fetchRandomQuestion(): Promise<SocraticQuestion> {
  await simulateDelay();
  const questions = questionsData.questions as SocraticQuestion[];
  return questions[Math.floor(Math.random() * questions.length)];
}

// Calcula el peso de tensión entre nodos basado en interacciones
export function calculateTensionWeight(
  nodeId: string, 
  interactions: Record<string, number>
): number {
  const baseWeight = nodesData.nodes.find(n => n.id === nodeId)?.weight || 0.5;
  const interactionBoost = (interactions[nodeId] || 0) * 0.1;
  return Math.min(1, baseWeight + interactionBoost);
}

// Obtiene las conexiones de un nodo específico
export function getNodeConnections(nodeId: string): LagrangeEdge[] {
  return edgesData.edges.filter(
    e => e.source === nodeId || e.target === nodeId
  ) as LagrangeEdge[];
}
