import { useState, useCallback } from 'react';
import { supabase } from '@/compartido/lib/supabaseClient';
import { useAcademyId } from '@/caracteristicas/academia/AcademyContext';

interface EchoMessage {
  role: 'oracle' | 'user';
  content: string;
  timestamp: number;
}

interface OracleEchoResponse {
  echo: string;
  type: 'gentle_nudge' | 'deep_probe';
  direction: string;
  tension_shift: 'aumenta' | 'mantiene' | 'suaviza';
  silenceDuration?: number;
  timestamp: string;
}

const ECHO_COOLDOWN_MS = 30000;

export function useOracleEcho() {
  const academyId = useAcademyId();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastEchoTime, setLastEchoTime] = useState(0);

  const generateEcho = useCallback(async (
    lastQuestion: string,
    conversationHistory: EchoMessage[] = [],
    silenceDuration?: number,
    selectedNodeId?: string
  ): Promise<OracleEchoResponse | null> => {
    // Check cooldown
    const now = Date.now();
    if (now - lastEchoTime < ECHO_COOLDOWN_MS) {
      setError(`Espera ${Math.ceil((ECHO_COOLDOWN_MS - (now - lastEchoTime)) / 1000)} segundos antes de generar otro eco`);
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No authenticated');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/oracle-echo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          lastQuestion,
          academyId,
          silenceDuration,
          selectedNodeId,
          conversationHistory: conversationHistory.map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error generating echo');
      }

      const result: OracleEchoResponse = await response.json();
      setLastEchoTime(Date.now());
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [academyId, lastEchoTime]);

  return {
    generateEcho,
    loading,
    error,
    canGenerate: Date.now() - lastEchoTime >= ECHO_COOLDOWN_MS,
    timeUntilNextEcho: Math.max(0, ECHO_COOLDOWN_MS - (Date.now() - lastEchoTime)),
  };
}
