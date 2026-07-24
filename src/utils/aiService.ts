/**
 * aiService.ts
 * 
 * Servicio de conexión unificado con todos los Oráculos IA del Sistema Lagrange
 * Integra: socratic-oracle, tutoring-oracle, eco-oracle para experiencia conversacional completa
 */

import { supabase } from '@/compartido/lib/supabaseClient';

// =============================================================================
// TIPOS COMPARTIDOS
// =============================================================================

export interface AIQuestion {
  pregunta: string;
  eje: string;
  nivel: number;
  tension: number;
  conexion: string;
}

export interface OracleRequest {
  context?: string;
  eje?: string;
  nivel?: number;
  conversationHistory?: DialogueMessage[];
}

export interface DialogueMessage {
  role: 'oracle' | 'user';
  content: string;
}

// =============================================================================
// TIPOS PARA TUTORING ORACLE (RAG con procedencia)
// =============================================================================

export interface ProvenanceEntry {
  fragment_id: string;
  source_file: string;
  source_type: string;
  source_content: string;
  original_url?: string;
  page_reference?: string;
  similarity_score: number;
  citation_order: number;
  is_inference_only: boolean;
  ingested_at?: string;
  uploaded_by?: string;
}

export interface TutoringRequest {
  academyId: string;
  spaceId?: string;
  question: string;
  sessionId?: string;
  systemPrompt?: string;
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[];
  includeRag?: boolean;
  maxSources?: number;
}

export interface TutoringResponse {
  response: string;
  academy_id: string;
  space_id?: string;
  provenance: ProvenanceEntry[];
  has_inference_only: boolean;
  total_sources: number;
  model: string;
  response_time_ms: number;
  tokens_used: number;
}

// =============================================================================
// TIPOS PARA ECO ORACLE (seguimiento de silencio)
// =============================================================================

export interface EchoRequest {
  lastQuestion?: string;
  academyId?: string;
  silenceDuration?: number;
  eje?: string;
  selectedNodeId?: string;
  conversationHistory?: DialogueMessage[];
}

export interface EchoResponse {
  echo: string;
  type: 'gentle_nudge' | 'deep_probe';
  direction: string;
  tension_shift: 'aumenta' | 'mantiene' | 'suaviza';
  silenceDuration?: number;
  timestamp: string;
}

// =============================================================================
// ORÁCULO SOCRÁTICO - Preguntas generadoras de fricción cognitiva
// =============================================================================

/**
 * Genera una pregunta socrática usando IA
 */
export const generateSocraticQuestion = async (
  request: OracleRequest = {}
): Promise<AIQuestion> => {
  const { data, error } = await supabase.functions.invoke('socratic-oracle', {
    body: request
  });

  if (error) {
    console.error('Error calling socratic-oracle:', error);
    throw new Error(error.message || 'Error al generar pregunta');
  }

  if (data.error) {
    throw new Error(data.error);
  }

  return data as AIQuestion;
};

/**
 * Genera una pregunta basada en el contexto del usuario
 */
export const generateContextualQuestion = async (
  userContext: string,
  preferredAxis?: string
): Promise<AIQuestion> => {
  return generateSocraticQuestion({
    context: userContext,
    eje: preferredAxis
  });
};

/**
 * Continúa un diálogo socrático basado en el historial de conversación
 */
export const continueDialogue = async (
  conversationHistory: DialogueMessage[]
): Promise<AIQuestion> => {
  return generateSocraticQuestion({
    conversationHistory
  });
};

/**
 * Genera una secuencia de preguntas de fricción progresiva
 */
export const generateFrictionSequence = async (
  startingContext: string,
  count: number = 3
): Promise<AIQuestion[]> => {
  const questions: AIQuestion[] = [];
  
  for (let level = 1; level <= Math.min(count, 3); level++) {
    try {
      const question = await generateSocraticQuestion({
        context: startingContext,
        nivel: level
      });
      questions.push(question);
    } catch (error) {
      console.error(`Error generating question at level ${level}:`, error);
    }
  }
  
  return questions;
};

// =============================================================================
// TUTORING ORACLE - Tutor IA con RAG y procedencia completa
// Implementa el flujo: RESEARCH → SESSION → PROVENANCE
// =============================================================================

/**
 * Realiza una consulta de tutorías con RAG
 * Flujo: R1 (pregunta) → R2 (embedding) → R3 (match_corpus) → R4 (respuesta IA) → R5 (con procedencia)
 */
export const tutoringQuery = async (
  request: TutoringRequest
): Promise<TutoringResponse> => {
  const { data, error } = await supabase.functions.invoke('tutoring-oracle', {
    body: request
  });

  if (error) {
    console.error('Error calling tutoring-oracle:', error);
    throw new Error(error.message || 'Error en tutorías');
  }

  if (data.error) {
    throw new Error(data.error);
  }

  return data as TutoringResponse;
};

/**
 * Chat conversacional RAG con procedencia para una materia
 * Combina el flujo de investigación con el tutor IA
 */
export const tutoringChat = async (
  academyId: string,
  spaceId: string | undefined,
  question: string,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[] = [],
  options: {
    systemPrompt?: string;
    includeRag?: boolean;
    maxSources?: number;
  } = {}
): Promise<TutoringResponse> => {
  return tutoringQuery({
    academyId,
    spaceId,
    question,
    conversationHistory,
    ...options
  });
};

// =============================================================================
// ECO ORACLE - Seguimiento inteligente del silencio del usuario
// =============================================================================

/**
 * Genera un eco (pregunta de seguimiento) cuando el usuario permanece en silencio
 * Tipos: gentle_nudge (< 60s) o deep_probe (> 60s)
 */
export const generateEcho = async (
  request: EchoRequest
): Promise<EchoResponse> => {
  const { data, error } = await supabase.functions.invoke('eco-oracle', {
    body: request
  });

  if (error) {
    console.error('Error calling eco-oracle:', error);
    throw new Error(error.message || 'Error al generar eco');
  }

  if (data.error) {
    throw new Error(data.error);
  }

  return data as EchoResponse;
};

// =============================================================================
// ORÁCULO UNIFICADO - Experiencia conversacional completa
// Combina todos los modos: socrático, tutor RAG, y eco
// =============================================================================

export interface UnifiedOracleRequest {
  mode: 'socratic' | 'tutoring' | 'echo';
  academyId?: string;
  spaceId?: string;
  question?: string;
  context?: string;
  eje?: string;
  nivel?: number;
  silenceDuration?: number;
  conversationHistory?: DialogueMessage[];
  systemPrompt?: string;
  includeRag?: boolean;
  maxSources?: number;
}

export interface UnifiedOracleResponse {
  mode: string;
  response: string;
  metadata?: Record<string, unknown>;
}

/**
 * Punto de entrada unificado para todas las funcionalidades del oráculo
 * Determina automáticamente qué Edge function llamar según el modo
 */
export const unifiedOracle = async (
  request: UnifiedOracleRequest
): Promise<UnifiedOracleResponse> => {
  const { mode, academyId, spaceId, question, context, eje, nivel, silenceDuration, conversationHistory, systemPrompt, includeRag, maxSources } = request;

  switch (mode) {
    case 'socratic': {
      const result = await generateSocraticQuestion({
        context,
        eje,
        nivel,
        conversationHistory
      });
      return {
        mode: 'socratic',
        response: result.pregunta,
        metadata: {
          eje: result.eje,
          nivel: result.nivel,
          tension: result.tension,
          conexion: result.conexion
        }
      };
    }

    case 'tutoring': {
      if (!question || !academyId) {
        throw new Error('question y academyId son requeridos para modo tutoring');
      }
      const result = await tutoringQuery({
        academyId,
        spaceId,
        question,
        conversationHistory: conversationHistory as { role: 'user' | 'assistant'; content: string }[],
        systemPrompt,
        includeRag,
        maxSources
      });
      return {
        mode: 'tutoring',
        response: result.response,
        metadata: {
          provenance: result.provenance,
          has_inference_only: result.has_inference_only,
          total_sources: result.total_sources,
          response_time_ms: result.response_time_ms
        }
      };
    }

    case 'echo': {
      const result = await generateEcho({
        lastQuestion: context,
        academyId,
        silenceDuration,
        eje,
        conversationHistory
      });
      return {
        mode: 'echo',
        response: result.echo,
        metadata: {
          echo_type: result.type,
          direction: result.direction,
          tension_shift: result.tension_shift
        }
      };
    }

    default:
      throw new Error(`Modo desconocido: ${mode}`);
  }
};

// =============================================================================
// HELPERS PARA LA UI
// =============================================================================

/**
 * Convierte historial de diálogo socrático al formato de tutoring
 */
export const convertHistoryForTutoring = (
  socraticHistory: DialogueMessage[]
): { role: 'user' | 'assistant'; content: string }[] => {
  return socraticHistory.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: msg.content
  }));
};

/**
 * Convierte historial de tutoring al formato socrático
 */
export const convertHistoryForSocratic = (
  tutoringHistory: { role: 'user' | 'assistant'; content: string }[]
): DialogueMessage[] => {
  return tutoringHistory.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'oracle',
    content: msg.content
  }));
};
