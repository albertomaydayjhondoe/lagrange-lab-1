// Hook para manejar las operaciones de tutoría
import { useState, useCallback } from 'react';
import { supabase } from '@/compartido/lib/supabaseClient';
import { SessionWithDetails, TutoringResponse, Subject } from '@/integrations/supabase/types';

// Lista de iconos de Lucide
const ICONS: Record<string, string> = {
  BookOpen: '📚',
  Calculator: '🔢',
  Atom: '⚛️',
  FlaskConical: '🧪',
  Leaf: '🌿',
  Code: '💻',
  Book: '📖',
  Feather: '🪶',
  Sparkles: '✨',
  default: '📖',
};

export function getIcon(iconName: string): string {
  return ICONS[iconName] || ICONS.default;
}

export function formatPrice(cents: number, currency: string = 'USD'): string {
  if (cents === 0) return 'Gratis';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function useTutorias() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Obtener materias
  const fetchSubjects = useCallback(async (): Promise<Subject[]> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('subjects')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (fetchError) throw fetchError;
      return data || [];
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Obtener sesiones disponibles
  const fetchSessions = useCallback(async (filters?: {
    subjectId?: string;
    tutorId?: string;
    status?: string;
    limit?: number;
  }): Promise<SessionWithDetails[]> => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters?.subjectId) params.set('subjectId', filters.subjectId);
      if (filters?.status) params.set('status', filters.status);
      if (filters?.limit) params.set('limit', filters.limit.toString());
      params.set('myBookings', 'false');

      const { data, error: fetchError } = await supabase.functions.invoke('list-sessions', {
        body: Object.fromEntries(params)
      });

      if (fetchError) throw fetchError;
      return data?.sessions || [];
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Reservar sesión
  const bookSession = useCallback(async (sessionId: string, notes?: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: bookError } = await supabase.functions.invoke('book-session', {
        body: { sessionId, notes }
      });

      if (bookError) throw bookError;
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Procesar pago (mock)
  const processPayment = useCallback(async (paymentId: string, action: 'pay' | 'refund' | 'cancel') => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: payError } = await supabase.functions.invoke('process-payment', {
        body: { paymentId, action }
      });

      if (payError) throw payError;
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Enviar pregunta al oráculo
  const askQuestion = useCallback(async (
    subjectId: string,
    question: string,
    options?: {
      sessionId?: string;
      topicId?: string;
      conversationHistory?: { role: 'user' | 'assistant'; content: string }[];
    }
  ): Promise<TutoringResponse> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: askError } = await supabase.functions.invoke('tutoring-oracle', {
        body: {
          subjectId,
          question,
          sessionId: options?.sessionId,
          topicId: options?.topicId,
          conversationHistory: options?.conversationHistory,
          includeRag: true,
        }
      });

      if (askError) throw askError;
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Crear sesión (solo tutores)
  const createSession = useCallback(async (sessionData: {
    subjectId: string;
    title: string;
    description?: string;
    scheduledAt: string;
    durationMinutes?: number;
    priceCents?: number;
    maxStudents?: number;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: createError } = await supabase.functions.invoke('create-session', {
        body: sessionData
      });

      if (createError) throw createError;
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Cancelar reserva
  const cancelBooking = useCallback(async (bookingId?: string, sessionId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: cancelError } = await supabase.functions.invoke('cancel-booking', {
        body: { bookingId, sessionId }
      });

      if (cancelError) throw cancelError;
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    fetchSubjects,
    fetchSessions,
    bookSession,
    processPayment,
    askQuestion,
    createSession,
    cancelBooking,
  };
}
