/**
 * corpusSync.ts
 *
 * Misión: Leer la "Verdad Operativa" (Archivos .me en /data/corpus)
 * y transmutarla en "Topología Viva" (/data/topology/).
 *
 * Primer Mandamiento: Neutralizar la gestión del miedo mediante
 * la exposición de conexiones estructurales.
 * 
 * Fuente: Lagrange Backend Boost
 */

import nodesData from '@/data/topology/nodes.json';
import edgesData from '@/data/topology/edges.json';
import questionsData from '@/data/topology/socratic_questions.json';

export type AxisType = 'Miedo' | 'Control' | 'SaludMental' | 'Legitimidad' | 'Responsabilidad';

export interface CorpusFragment {
  id: string;
  source: string;
  content: string;
  axis: AxisType;
  tension: number;
  keywords: string[];
}

export interface TopologyNode {
  id: string;
  label: string;
  description: string;
  x: number;
  y: number;
  weight: number;
  color: string;
  axis: string;
  type?: string;
  corpus_refs?: string[];
  question_count?: number;
}

export interface TopologyEdge {
  id: string;
  source: string;
  target: string;
  tension: number;
  label: string;
  type?: string;
}

export interface SocraticQuestion {
  id: string;
  eje: string;
  nivel: number;
  tension: number;
  texto: string;
  corpus_ref?: string;
}

export interface SyncResult {
  fragmentsProcessed: number;
  nodesUpdated: number;
  edgesCreated: number;
  timestamp: Date;
}

export interface CorpusStats {
  totalNodes: number;
  totalEdges: number;
  totalQuestions: number;
  axisDistribution: Record<string, number>;
  averageTension: number;
  corpusFiles: string[];
}

/**
 * Obtiene todos los nodos de la topología
 */
export const getNodes = (): TopologyNode[] => {
  return nodesData as TopologyNode[];
};

/**
 * Obtiene todas las aristas de la topología
 */
export const getEdges = (): TopologyEdge[] => {
  return edgesData as TopologyEdge[];
};

/**
 * Obtiene todas las preguntas socráticas
 */
export const getQuestions = (): SocraticQuestion[] => {
  return questionsData as SocraticQuestion[];
};

/**
 * Obtiene nodos por eje de tensión
 */
export const getNodesByAxis = (axis: AxisType): TopologyNode[] => {
  return getNodes().filter(node => node.axis === axis);
};

/**
 * Obtiene preguntas por eje de tensión
 */
export const getQuestionsByAxis = (axis: AxisType): SocraticQuestion[] => {
  return getQuestions().filter(q => q.eje === axis);
};

/**
 * Obtiene preguntas por nivel de profundidad
 */
export const getQuestionsByLevel = (level: 1 | 2 | 3): SocraticQuestion[] => {
  return getQuestions().filter(q => q.nivel === level);
};

/**
 * Obtiene aristas conectadas a un nodo específico
 */
export const getEdgesForNode = (nodeId: string): TopologyEdge[] => {
  return getEdges().filter(edge => 
    edge.source === nodeId || edge.target === nodeId
  );
};

/**
 * Calcula la tensión promedio de un eje
 */
export const getAxisTension = (axis: AxisType): number => {
  const questions = getQuestionsByAxis(axis);
  if (questions.length === 0) return 0;
  
  const totalTension = questions.reduce((sum, q) => sum + q.tension, 0);
  return totalTension / questions.length;
};

/**
 * Obtiene estadísticas completas del corpus
 */
export const getCorpusStats = (): CorpusStats => {
  const nodes = getNodes();
  const edges = getEdges();
  const questions = getQuestions();

  const axisDistribution: Record<string, number> = {};
  questions.forEach(q => {
    axisDistribution[q.eje] = (axisDistribution[q.eje] || 0) + 1;
  });

  const totalTension = questions.reduce((sum, q) => sum + q.tension, 0);

  return {
    totalNodes: nodes.length,
    totalEdges: edges.length,
    totalQuestions: questions.length,
    axisDistribution,
    averageTension: questions.length > 0 ? totalTension / questions.length : 0,
    corpusFiles: [
      'critica_socratica_lagrange.me',
      'miedo_al_miedo.me',
      'legitimidad_y_silencio.me'
    ]
  };
};

/**
 * Obtiene una pregunta aleatoria ponderada por tensión
 * Las preguntas con mayor tensión tienen más probabilidad de aparecer
 */
export const getWeightedRandomQuestion = (): SocraticQuestion | null => {
  const questions = getQuestions();
  if (questions.length === 0) return null;

  // Calcular peso total
  const totalWeight = questions.reduce((sum, q) => sum + q.tension, 0);
  
  // Seleccionar aleatoriamente basado en peso
  let random = Math.random() * totalWeight;
  
  for (const question of questions) {
    random -= question.tension;
    if (random <= 0) {
      return question;
    }
  }
  
  return questions[questions.length - 1];
};

/**
 * Encuentra el camino de tensión más alto entre dos ejes
 */
export const findTensionPath = (fromAxis: AxisType, toAxis: AxisType): TopologyEdge[] => {
  const nodes = getNodes();
  const edges = getEdges();
  
  const fromNodes = nodes.filter(n => n.axis === fromAxis).map(n => n.id);
  const toNodes = nodes.filter(n => n.axis === toAxis).map(n => n.id);
  
  // Encontrar aristas que conectan ambos ejes
  return edges.filter(edge => 
    (fromNodes.includes(edge.source) && toNodes.includes(edge.target)) ||
    (fromNodes.includes(edge.target) && toNodes.includes(edge.source))
  ).sort((a, b) => b.tension - a.tension);
};

/**
 * Genera un "recorrido de fricción" - secuencia de preguntas que aumentan la tensión
 */
export const generateFrictionJourney = (startAxis?: AxisType): SocraticQuestion[] => {
  const questions = getQuestions();
  
  // Filtrar por eje si se especifica
  let pool = startAxis 
    ? questions.filter(q => q.eje === startAxis)
    : [...questions];
  
  // Ordenar por nivel y tensión
  pool.sort((a, b) => {
    if (a.nivel !== b.nivel) return a.nivel - b.nivel;
    return a.tension - b.tension;
  });
  
  // Seleccionar una pregunta de cada nivel
  const journey: SocraticQuestion[] = [];
  
  for (let level = 1; level <= 3; level++) {
    const levelQuestions = pool.filter(q => q.nivel === level);
    if (levelQuestions.length > 0) {
      const randomIndex = Math.floor(Math.random() * levelQuestions.length);
      journey.push(levelQuestions[randomIndex]);
    }
  }
  
  return journey;
};

/**
 * Valida la integridad del corpus contra la topología
 */
export const validateCorpusIntegrity = (): {
  isValid: boolean;
  issues: string[];
} => {
  console.log(">> Validando integridad del corpus...");
  
  const issues: string[] = [];
  const nodes = getNodes();
  const edges = getEdges();
  const questions = getQuestions();
  
  // Verificar que todos los ejes tienen preguntas
  const axes: AxisType[] = ['Miedo', 'Control', 'SaludMental', 'Legitimidad', 'Responsabilidad'];
  for (const axis of axes) {
    const axisQuestions = questions.filter(q => q.eje === axis);
    if (axisQuestions.length === 0) {
      issues.push(`Eje "${axis}" no tiene preguntas asociadas`);
    }
  }
  
  // Verificar que no hay aristas huérfanas
  const nodeIds = new Set(nodes.map(n => n.id));
  for (const edge of edges) {
    if (!nodeIds.has(edge.source)) {
      issues.push(`Arista "${edge.id}" tiene origen huérfano: ${edge.source}`);
    }
    if (!nodeIds.has(edge.target)) {
      issues.push(`Arista "${edge.id}" tiene destino huérfano: ${edge.target}`);
    }
  }
  
  // Verificar rangos de tensión
  for (const question of questions) {
    if (question.tension < 0 || question.tension > 1) {
      issues.push(`Pregunta "${question.id}" tiene tensión fuera de rango: ${question.tension}`);
    }
  }
  
  console.log(`>> Validación completada. ${issues.length} problemas encontrados.`);
  
  return {
    isValid: issues.length === 0,
    issues
  };
};

/**
 * Función principal de sincronización (para futura implementación dinámica)
 */
export const syncCorpus = async (): Promise<SyncResult> => {
  console.log("═══════════════════════════════════════════════");
  console.log(">> INICIANDO SINCRONIZACIÓN DEL CORPUS LAGRANGE");
  console.log(">> Primer Mandamiento: Neutralización del Miedo");
  console.log("═══════════════════════════════════════════════");

  const stats = getCorpusStats();
  const validation = validateCorpusIntegrity();

  console.log("═══════════════════════════════════════════════");
  console.log(">> SINCRONIZACIÓN COMPLETADA");
  console.log(`>> Nodos en topología: ${stats.totalNodes}`);
  console.log(`>> Aristas en topología: ${stats.totalEdges}`);
  console.log(`>> Preguntas socráticas: ${stats.totalQuestions}`);
  console.log(`>> Tensión promedio: ${(stats.averageTension * 100).toFixed(1)}%`);
  console.log(`>> Integridad: ${validation.isValid ? '✓ Válida' : '✗ Con problemas'}`);
  console.log(">> El sistema está vivo. La topología respira.");
  console.log("═══════════════════════════════════════════════");

  return {
    fragmentsProcessed: stats.totalQuestions,
    nodesUpdated: stats.totalNodes,
    edgesCreated: stats.totalEdges,
    timestamp: new Date()
  };
};
