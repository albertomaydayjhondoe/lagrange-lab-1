/**
 * aiStructuralService.ts
 * 
 * Servicio unificado de IA para todos los ejes estructurales
 * Conecta frontend con las edge functions de IA
 */

import { supabase } from '@/integrations/supabase/client';

// Types for AI responses
export interface AINodeAnalysis {
  analisis: string;
  tensiones: string[];
  conexiones_sugeridas: { source: string; target: string; label: string }[];
  preguntas: string[];
}

export interface AINodeSuggestion {
  id: string;
  label: string;
  description: string;
  axis: string;
  type: 'core' | 'mechanism';
  suggested_edges: { target: string; label: string; tension: number }[];
}

export interface AINodeDescription {
  description_short: string;
  description_full: string;
  key_tensions: string[];
}

export interface AIEdgeAnalysis {
  analisis: string;
  label_sugerido: string;
  tipo_sugerido: string;
  tension_sugerida: number;
  alternativas: { label: string; type: string; tension: number }[];
}

export interface AIEdgeGeneration {
  label: string;
  type: string;
  tension: number;
  justificacion: string;
}

export interface AIEdgeSuggestions {
  sugerencias: {
    source: string;
    target: string;
    label: string;
    type: string;
    tension: number;
    razon: string;
  }[];
}

export interface AIQuestionBatch {
  preguntas: {
    texto: string;
    eje: string;
    nivel: 1 | 2 | 3;
    tension: number;
    corpus_ref?: string | null;
    novedad?: string;
  }[];
}

export interface AIQuestionConnected {
  pregunta: string;
  nivel: 1 | 2 | 3;
  tension: number;
  conexion_explicita: string;
}

export interface AIEpisodeConcept {
  title: string;
  description: string;
  duration_minutes: number;
  sections: { name: string; duration_minutes: number; content: string }[];
  suggested_question_ids: string[];
}

export interface AIEpisodeScript {
  intro: string;
  desarrollo: { pregunta: string; narrativa: string }[];
  cierre: string;
  duracion_estimada_minutos: number;
}

export interface AIEpisodeSeries {
  titulo_serie: string;
  descripcion_serie: string;
  episodios: {
    numero: number;
    titulo: string;
    eje_principal: string;
    ejes_secundarios: string[];
    descripcion: string;
    conexion_con_anterior: string;
  }[];
}

// Helper to get auth token
async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Usuario no autenticado');
  }
  return {
    Authorization: `Bearer ${session.access_token}`,
  };
}

// ===== NODES AI =====

export async function aiAnalyzeNode(nodeId: string, context?: string): Promise<AINodeAnalysis> {
  const { data, error } = await supabase.functions.invoke('ai-nodes', {
    body: { action: 'analyze', nodeId, context }
  });
  
  if (error) throw new Error(error.message);
  if (data.error) throw new Error(data.error);
  return data.result as AINodeAnalysis;
}

export async function aiSuggestNode(context?: string): Promise<AINodeSuggestion> {
  const { data, error } = await supabase.functions.invoke('ai-nodes', {
    body: { action: 'suggest', context }
  });
  
  if (error) throw new Error(error.message);
  if (data.error) throw new Error(data.error);
  return data.result as AINodeSuggestion;
}

export async function aiDescribeNode(nodeId: string): Promise<AINodeDescription> {
  const { data, error } = await supabase.functions.invoke('ai-nodes', {
    body: { action: 'describe', nodeId }
  });
  
  if (error) throw new Error(error.message);
  if (data.error) throw new Error(data.error);
  return data.result as AINodeDescription;
}

// ===== EDGES AI =====

export async function aiAnalyzeEdge(sourceId: string, targetId: string, context?: string): Promise<AIEdgeAnalysis> {
  const { data, error } = await supabase.functions.invoke('ai-edges', {
    body: { action: 'analyze', sourceId, targetId, context }
  });
  
  if (error) throw new Error(error.message);
  if (data.error) throw new Error(data.error);
  return data.result as AIEdgeAnalysis;
}

export async function aiGenerateEdge(sourceId: string, targetId: string, context?: string): Promise<AIEdgeGeneration> {
  const { data, error } = await supabase.functions.invoke('ai-edges', {
    body: { action: 'generate', sourceId, targetId, context }
  });
  
  if (error) throw new Error(error.message);
  if (data.error) throw new Error(data.error);
  return data.result as AIEdgeGeneration;
}

export async function aiSuggestMissingEdges(): Promise<AIEdgeSuggestions> {
  const { data, error } = await supabase.functions.invoke('ai-edges', {
    body: { action: 'suggest_missing' }
  });
  
  if (error) throw new Error(error.message);
  if (data.error) throw new Error(data.error);
  return data.result as AIEdgeSuggestions;
}

// ===== QUESTIONS AI =====

export async function aiGenerateQuestionBatch(eje?: string, count?: number, context?: string): Promise<AIQuestionBatch> {
  const { data, error } = await supabase.functions.invoke('ai-questions', {
    body: { action: 'generate_batch', eje, count, context }
  });
  
  if (error) throw new Error(error.message);
  if (data.error) throw new Error(data.error);
  return data.result as AIQuestionBatch;
}

export async function aiEnhanceQuestions(eje: string, count?: number, context?: string): Promise<AIQuestionBatch> {
  const { data, error } = await supabase.functions.invoke('ai-questions', {
    body: { action: 'enhance', eje, count, context }
  });
  
  if (error) throw new Error(error.message);
  if (data.error) throw new Error(data.error);
  return data.result as AIQuestionBatch;
}

export async function aiConnectQuestion(eje: string, nodeIdOrContext: string): Promise<AIQuestionConnected> {
  const { data, error } = await supabase.functions.invoke('ai-questions', {
    body: { action: 'connect', eje, context: nodeIdOrContext }
  });
  
  if (error) throw new Error(error.message);
  if (data.error) throw new Error(data.error);
  return data.result as AIQuestionConnected;
}

// ===== EPISODES AI =====

export async function aiGenerateEpisodeConcept(eje: string, questionIds?: string[], context?: string): Promise<AIEpisodeConcept> {
  const { data, error } = await supabase.functions.invoke('ai-episodes', {
    body: { action: 'generate', eje, questionIds, context }
  });
  
  if (error) throw new Error(error.message);
  if (data.error) throw new Error(data.error);
  return data.result as AIEpisodeConcept;
}

export async function aiGenerateEpisodeScript(eje: string, context?: string): Promise<AIEpisodeScript> {
  const { data, error } = await supabase.functions.invoke('ai-episodes', {
    body: { action: 'script', eje, context }
  });
  
  if (error) throw new Error(error.message);
  if (data.error) throw new Error(data.error);
  return data.result as AIEpisodeScript;
}

export async function aiSuggestEpisodeSeries(): Promise<AIEpisodeSeries> {
  const { data, error } = await supabase.functions.invoke('ai-episodes', {
    body: { action: 'suggest_series' }
  });
  
  if (error) throw new Error(error.message);
  if (data.error) throw new Error(data.error);
  return data.result as AIEpisodeSeries;
}
