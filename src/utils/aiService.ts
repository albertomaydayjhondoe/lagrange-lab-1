/**
 * aiService.ts
 * 
 * Servicio de conexión con el Oráculo Socrático IA
 * Utiliza Lovable AI para generar preguntas dinámicas
 */

import { supabase } from '@/integrations/supabase/client';

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
}

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
