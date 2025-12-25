// Motor Lógico - El Espejo Crítico
// Algoritmo que calcula pesos de tensión y genera la matriz narrativa

import { LagrangeNode, LagrangeEdge, fetchNodes, fetchEdges } from './dataService';

export interface TensionState {
  nodeId: string;
  currentWeight: number;
  vibrationIntensity: number;
  connectedTensions: number;
}

export interface NarrativeContext {
  dominantEje: string;
  tensionLevel: number;
  suggestedQuestions: string[];
}

// Estado de interacciones del usuario (en memoria para frontend estático)
let userInteractions: Record<string, number> = {};

export function registerInteraction(nodeId: string): void {
  userInteractions[nodeId] = (userInteractions[nodeId] || 0) + 1;
}

export function getInteractionCount(nodeId: string): number {
  return userInteractions[nodeId] || 0;
}

export function resetInteractions(): void {
  userInteractions = {};
}

// Calcula el estado de tensión de un nodo
export function calculateTensionState(
  node: LagrangeNode,
  edges: LagrangeEdge[]
): TensionState {
  const interactions = getInteractionCount(node.id);
  const connectedEdges = edges.filter(
    e => e.source === node.id || e.target === node.id
  );
  
  const avgTension = connectedEdges.length > 0
    ? connectedEdges.reduce((sum, e) => sum + e.tension, 0) / connectedEdges.length
    : 0;

  const interactionBoost = Math.min(0.3, interactions * 0.05);
  const currentWeight = Math.min(1, node.weight + interactionBoost);
  
  return {
    nodeId: node.id,
    currentWeight,
    vibrationIntensity: avgTension * currentWeight,
    connectedTensions: connectedEdges.length
  };
}

// Determina el eje dominante basado en interacciones
export async function analyzeNarrativeContext(): Promise<NarrativeContext> {
  const nodes = await fetchNodes();
  const edges = await fetchEdges();
  
  let maxInteractions = 0;
  let dominantEje = 'miedo';
  
  nodes.forEach(node => {
    const count = getInteractionCount(node.id);
    if (count > maxInteractions) {
      maxInteractions = count;
      dominantEje = node.id;
    }
  });

  const dominantNode = nodes.find(n => n.id === dominantEje);
  const tensionState = dominantNode 
    ? calculateTensionState(dominantNode, edges)
    : { vibrationIntensity: 0.5 };

  return {
    dominantEje,
    tensionLevel: tensionState.vibrationIntensity,
    suggestedQuestions: getSuggestedQuestionIds(dominantEje)
  };
}

function getSuggestedQuestionIds(eje: string): string[] {
  const questionMap: Record<string, string[]> = {
    miedo: ['Q01', 'Q02', 'Q15'],
    control: ['Q03', 'Q04', 'Q05'],
    salud_mental: ['Q06', 'Q07', 'Q08'],
    legitimidad: ['Q09', 'Q10', 'Q11'],
    responsabilidad: ['Q12', 'Q13', 'Q14']
  };
  return questionMap[eje] || questionMap.miedo;
}

// Genera la matriz completa de tensiones para visualización
export async function generateTensionMatrix(): Promise<Map<string, TensionState>> {
  const nodes = await fetchNodes();
  const edges = await fetchEdges();
  
  const matrix = new Map<string, TensionState>();
  
  nodes.forEach(node => {
    matrix.set(node.id, calculateTensionState(node, edges));
  });
  
  return matrix;
}
