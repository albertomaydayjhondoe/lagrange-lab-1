// Motor Lógico - El Espejo Crítico
// Algoritmo que calcula pesos de tensión y genera la matriz narrativa

import { LagrangeNode, LagrangeEdge, fetchNodes, fetchEdges, fetchAxes, getSuggestedQuestionIds } from './dataService';

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
  const axes = await fetchAxes();
  
  let maxInteractions = 0;
  let dominantEje = axes[0]?.id || 'miedo';
  
  nodes.forEach(node => {
    const count = getInteractionCount(node.id);
    if (count > maxInteractions) {
      maxInteractions = count;
      dominantEje = node.axis || dominantEje;
    }
  });

  const dominantNode = nodes.find(n => n.axis === dominantEje);
  const tensionState = dominantNode 
    ? calculateTensionState(dominantNode, edges)
    : { vibrationIntensity: 0.5 };

  // Obtener preguntas sugeridas desde el eje (dinámico)
  const suggestedQuestions = await getSuggestedQuestionIds(dominantEje);

  return {
    dominantEje,
    tensionLevel: tensionState.vibrationIntensity,
    suggestedQuestions
  };
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
