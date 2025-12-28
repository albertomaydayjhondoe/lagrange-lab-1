/**
 * corpusSync.ts
 *
 * Misión: Sincronizar y validar la "Verdad Operativa" desde Supabase
 * Todas las funciones ahora son async y usan el backend real.
 *
 * Primer Mandamiento: Neutralización del Miedo mediante
 * la exposición de conexiones estructurales.
 * 
 * Fuente: Lagrange Fullstack - Sprint 2
 */

import { 
  fetchNodes, 
  fetchEdges, 
  fetchQuestions,
  fetchEpisodes,
  LagrangeNode,
  LagrangeEdge,
  SocraticQuestion,
  Episode,
  invalidateCache
} from '@/utils/dataService';

export type AxisType = 'Miedo' | 'Control' | 'SaludMental' | 'Legitimidad' | 'Responsabilidad';

// Re-export types for backwards compatibility
export type TopologyNode = LagrangeNode;
export type TopologyEdge = LagrangeEdge;
export type { SocraticQuestion, Episode };

export interface CorpusFragment {
  id: string;
  source: string;
  content: string;
  axis: AxisType;
  tension: number;
  keywords: string[];
}

export interface SyncResult {
  fragmentsProcessed: number;
  nodesUpdated: number;
  edgesCreated: number;
  episodesCount: number;
  timestamp: Date;
}

export interface CorpusStats {
  totalNodes: number;
  totalEdges: number;
  totalQuestions: number;
  totalEpisodes: number;
  axisDistribution: Record<string, number>;
  averageTension: number;
  dataSource: 'supabase';
}

/**
 * Obtiene todos los nodos de la topología (async desde Supabase)
 */
export const getNodes = async (): Promise<TopologyNode[]> => {
  return fetchNodes();
};

/**
 * Obtiene todas las aristas de la topología (async desde Supabase)
 */
export const getEdges = async (): Promise<TopologyEdge[]> => {
  return fetchEdges();
};

/**
 * Obtiene todas las preguntas socráticas (async desde Supabase)
 */
export const getQuestions = async (): Promise<SocraticQuestion[]> => {
  return fetchQuestions();
};

/**
 * Obtiene todos los episodios (async desde Supabase)
 */
export const getEpisodes = async (): Promise<Episode[]> => {
  return fetchEpisodes();
};

/**
 * Obtiene nodos por eje de tensión
 */
export const getNodesByAxis = async (axis: AxisType): Promise<TopologyNode[]> => {
  const nodes = await getNodes();
  return nodes.filter(node => node.axis === axis);
};

/**
 * Obtiene preguntas por eje de tensión
 */
export const getQuestionsByAxis = async (axis: AxisType): Promise<SocraticQuestion[]> => {
  const questions = await getQuestions();
  return questions.filter(q => q.eje === axis);
};

/**
 * Obtiene preguntas por nivel de profundidad
 */
export const getQuestionsByLevel = async (level: 1 | 2 | 3): Promise<SocraticQuestion[]> => {
  const questions = await getQuestions();
  return questions.filter(q => q.nivel === level);
};

/**
 * Obtiene aristas conectadas a un nodo específico
 */
export const getEdgesForNode = async (nodeId: string): Promise<TopologyEdge[]> => {
  const edges = await getEdges();
  return edges.filter(edge => 
    edge.source === nodeId || edge.target === nodeId
  );
};

/**
 * Calcula la tensión promedio de un eje
 */
export const getAxisTension = async (axis: AxisType): Promise<number> => {
  const questions = await getQuestionsByAxis(axis);
  if (questions.length === 0) return 0;
  
  const totalTension = questions.reduce((sum, q) => sum + q.tension, 0);
  return totalTension / questions.length;
};

/**
 * Obtiene estadísticas completas del corpus desde Supabase
 */
export const getCorpusStats = async (): Promise<CorpusStats> => {
  const [nodes, edges, questions, episodes] = await Promise.all([
    getNodes(),
    getEdges(),
    getQuestions(),
    getEpisodes()
  ]);

  const axisDistribution: Record<string, number> = {};
  questions.forEach(q => {
    axisDistribution[q.eje] = (axisDistribution[q.eje] || 0) + 1;
  });

  const totalTension = questions.reduce((sum, q) => sum + q.tension, 0);

  return {
    totalNodes: nodes.length,
    totalEdges: edges.length,
    totalQuestions: questions.length,
    totalEpisodes: episodes.length,
    axisDistribution,
    averageTension: questions.length > 0 ? totalTension / questions.length : 0,
    dataSource: 'supabase'
  };
};

/**
 * Obtiene una pregunta aleatoria ponderada por tensión
 * Las preguntas con mayor tensión tienen más probabilidad de aparecer
 */
export const getWeightedRandomQuestion = async (): Promise<SocraticQuestion | null> => {
  const questions = await getQuestions();
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
export const findTensionPath = async (fromAxis: AxisType, toAxis: AxisType): Promise<TopologyEdge[]> => {
  const [nodes, edges] = await Promise.all([getNodes(), getEdges()]);
  
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
export const generateFrictionJourney = async (startAxis?: AxisType): Promise<SocraticQuestion[]> => {
  const questions = await getQuestions();
  
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
 * Valida la integridad del corpus contra la topología (desde Supabase)
 */
export const validateCorpusIntegrity = async (): Promise<{
  isValid: boolean;
  issues: string[];
}> => {
  console.log(">> Validando integridad del corpus desde Supabase...");
  
  const issues: string[] = [];
  const [nodes, edges, questions] = await Promise.all([
    getNodes(),
    getEdges(),
    getQuestions()
  ]);
  
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
 * Función principal de sincronización - ahora verifica datos desde Supabase
 */
export const syncCorpus = async (): Promise<SyncResult> => {
  console.log("═══════════════════════════════════════════════");
  console.log(">> SINCRONIZACIÓN LAGRANGE - MODO FULLSTACK");
  console.log(">> Fuente de datos: Supabase (Modo Dios activo)");
  console.log("═══════════════════════════════════════════════");

  // Invalidar cache para obtener datos frescos
  invalidateCache();

  const stats = await getCorpusStats();
  const validation = await validateCorpusIntegrity();

  console.log("═══════════════════════════════════════════════");
  console.log(">> SINCRONIZACIÓN COMPLETADA");
  console.log(`>> Nodos en topología: ${stats.totalNodes}`);
  console.log(`>> Aristas en topología: ${stats.totalEdges}`);
  console.log(`>> Preguntas socráticas: ${stats.totalQuestions}`);
  console.log(`>> Episodios podcast: ${stats.totalEpisodes}`);
  console.log(`>> Tensión promedio: ${(stats.averageTension * 100).toFixed(1)}%`);
  console.log(`>> Integridad: ${validation.isValid ? '✓ Válida' : '✗ Con problemas'}`);
  console.log(`>> Fuente: ${stats.dataSource.toUpperCase()}`);
  console.log(">> El sistema respira desde la nube.");
  console.log("═══════════════════════════════════════════════");

  return {
    fragmentsProcessed: stats.totalQuestions,
    nodesUpdated: stats.totalNodes,
    edgesCreated: stats.totalEdges,
    episodesCount: stats.totalEpisodes,
    timestamp: new Date()
  };
};

/**
 * Fuerza recarga de datos desde Supabase (invalida cache)
 */
export const forceRefresh = (): void => {
  invalidateCache();
  console.log(">> Cache invalidado. Próxima petición cargará datos frescos.");
};