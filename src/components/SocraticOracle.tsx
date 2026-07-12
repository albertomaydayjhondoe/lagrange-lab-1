import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchRandomQuestion, SocraticQuestion, fetchAxes } from '@/utils/dataService';
import { generateSocraticQuestion, AIQuestion } from '@/utils/aiService';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, Sparkles, Send, Radio } from 'lucide-react';
import { toast } from 'sonner';

type DisplayQuestion = SocraticQuestion | AIQuestion;

// Echo types from oracle-echo
interface OracleEcho {
  echo: string;
  type: 'gentle_nudge' | 'deep_probe';
  direction: string;
  tension_shift: 'aumenta' | 'mantiene' | 'suaviza';
  silenceDuration?: number;
  timestamp: string;
}

function isAIQuestion(q: DisplayQuestion): q is AIQuestion {
  return 'pregunta' in q;
}

// Props for reactive oracle
interface SocraticOracleProps {
  activeAxis?: string | null;
  selectedNodeId?: string | null;
  onQuestionGenerated?: (question: string, eje: string) => void;
}

export function SocraticOracle({ activeAxis, selectedNodeId, onQuestionGenerated }: SocraticOracleProps) {
  const [question, setQuestion] = useState<DisplayQuestion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAIMode, setIsAIMode] = useState(false);
  const [userContext, setUserContext] = useState('');
  const [showContextInput, setShowContextInput] = useState(false);
  
  // Echo state
  const [echo, setEcho] = useState<OracleEcho | null>(null);
  const [isEchoVisible, setIsEchoVisible] = useState(false);
  const [silenceTimer, setSilenceTimer] = useState<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const conversationHistoryRef = useRef<Array<{role: string; content: string}>>([]);

  // Silence detection config
  const SILENCE_THRESHOLD_MS = 45000; // 45 seconds before showing echo
  const ECHO_CHECK_INTERVAL_MS = 5000; // Check every 5 seconds

  const ejeLabels: Record<string, string> = {
    Miedo: 'Miedo',
    Control: 'Control',
    SaludMental: 'Salud Mental',
    Legitimidad: 'Legitimidad',
    Responsabilidad: 'Responsabilidad',
    miedo: 'Miedo',
    control: 'Control',
    salud_mental: 'Salud Mental',
    legitimidad: 'Legitimidad',
    responsabilidad: 'Responsabilidad'
  };

  // Fetch node context for AI
  const fetchNodeContext = async (nodeId: string): Promise<{label: string; description: string; axis: string} | null> => {
    try {
      const { data } = await supabase
        .from('topology_nodes')
        .select('label, description, axis')
        .eq('id', nodeId)
        .single();
      return data;
    } catch {
      return null;
    }
  };

  // Generate echo for silence
  const generateEcho = useCallback(async () => {
    if (!question) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const currentQuestion = isAIQuestion(question) ? question.pregunta : question.texto;
      const silenceDuration = Date.now() - lastActivityRef.current;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/oracle-echo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          lastQuestion: currentQuestion,
          silenceDuration,
          eje: activeAxis,
          selectedNodeId,
          conversationHistory: conversationHistoryRef.current.slice(-6), // Last 6 messages
        }),
      });

      if (response.ok) {
        const echoData: OracleEcho = await response.json();
        setEcho(echoData);
        setIsEchoVisible(true);
        
        // Auto-hide echo after 15 seconds
        setTimeout(() => {
          setIsEchoVisible(false);
        }, 15000);
      }
    } catch (error) {
      console.error('Error generating echo:', error);
    }
  }, [question, activeAxis, selectedNodeId]);

  // Record user activity (resets silence timer)
  const recordActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    setIsEchoVisible(false);
    setEcho(null);
  }, []);

  // Start silence detection
  useEffect(() => {
    const checkSilence = () => {
      const silenceDuration = Date.now() - lastActivityRef.current;
      if (silenceDuration >= SILENCE_THRESHOLD_MS && !isEchoVisible && question) {
        generateEcho();
      }
    };

    const intervalId = setInterval(checkSilence, ECHO_CHECK_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [generateEcho, isEchoVisible, question]);

  // Track user activity
  useEffect(() => {
    const handleActivity = () => recordActivity();
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('keypress', handleActivity);
    
    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keypress', handleActivity);
    };
  }, [recordActivity]);

  // Load static question
  const loadStaticQuestion = async () => {
    setIsLoading(true);
    const q = await fetchRandomQuestion();
    setQuestion(q);
    setIsAIMode(false);
    setIsLoading(false);
    recordActivity();
  };

  // Load AI question with context
  const loadAIQuestion = async (context?: string) => {
    setIsLoading(true);
    try {
      // Build enhanced context
      let enhancedContext = context || '';
      
      if (activeAxis) {
        enhancedContext += (enhancedContext ? ' ' : '') + `Estoy explorando el eje: ${ejeLabels[activeAxis] || activeAxis}.`;
      }
      
      if (selectedNodeId) {
        const node = await fetchNodeContext(selectedNodeId);
        if (node) {
          enhancedContext += (enhancedContext ? ' ' : '') + 
            `Estoy viendo el concepto: "${node.label}". ${node.description || ''}`;
        }
      }

      const q = await generateSocraticQuestion({ 
        context: enhancedContext || undefined 
      });
      
      setQuestion(q);
      setIsAIMode(true);
      setShowContextInput(false);
      setUserContext('');
      recordActivity();
      
      // Add to conversation history
      conversationHistoryRef.current.push({
        role: 'oracle',
        content: q.pregunta
      });
      
      // Notify parent
      if (onQuestionGenerated) {
        onQuestionGenerated(q.pregunta, q.eje);
      }
    } catch (error) {
      console.error('Error generating AI question:', error);
      toast.error('Error al generar pregunta. Usando banco estático.');
      await loadStaticQuestion();
    } finally {
      setIsLoading(false);
    }
  };

  const handleContextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userContext.trim()) {
      loadAIQuestion(userContext.trim());
    }
  };

  useEffect(() => {
    loadStaticQuestion();
  }, []);

  // Generate contextual question when props change
  useEffect(() => {
    if (activeAxis || selectedNodeId) {
      // Only auto-generate if we don't have a current question yet
      if (!question) {
        loadAIQuestion();
      }
    }
  }, [activeAxis, selectedNodeId]);

  const getQuestionText = (q: DisplayQuestion): string => {
    return isAIQuestion(q) ? q.pregunta : q.texto;
  };

  const getQuestionAxis = (q: DisplayQuestion): string => {
    return isAIQuestion(q) ? q.eje : q.eje;
  };

  const getQuestionLevel = (q: DisplayQuestion): number => {
    return q.nivel;
  };

  const getQuestionTension = (q: DisplayQuestion): number => {
    return q.tension;
  };

  return (
    <div className="relative">
      {/* Context indicator */}
      {(activeAxis || selectedNodeId) && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {activeAxis && (
            <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-mono flex items-center gap-1">
              <Radio className="w-2.5 h-2.5" />
              {ejeLabels[activeAxis] || activeAxis}
            </span>
          )}
          {selectedNodeId && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-mono">
              Nodo activo
            </span>
          )}
        </div>
      )}

      <AnimatePresence mode="wait">
        {question && (
          <motion.div
            key={getQuestionText(question)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <div className="mb-4 flex items-center justify-center gap-3 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-mono uppercase tracking-wider">
                {ejeLabels[getQuestionAxis(question)] || getQuestionAxis(question)}
              </span>
              <span className="text-muted-foreground text-xs font-mono">
                Nivel {getQuestionLevel(question)}
              </span>
              {isAIMode && (
                <span className="px-2 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-mono flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  IA
                </span>
              )}
            </div>
            
            <blockquote className="font-serif text-2xl md:text-3xl lg:text-4xl text-foreground leading-relaxed max-w-4xl mx-auto">
              <span className="text-primary opacity-50">"</span>
              {getQuestionText(question)}
              <span className="text-primary opacity-50">"</span>
            </blockquote>

            {isAIQuestion(question) && question.conexion && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-6 text-sm text-muted-foreground italic max-w-2xl mx-auto"
              >
                {question.conexion}
              </motion.p>
            )}

            <div className="mt-8 flex items-center justify-center gap-2">
              <div 
                className="h-1 rounded-full bg-primary/30"
                style={{ width: `${getQuestionTension(question) * 100}px` }}
              />
              <span className="text-muted-foreground text-xs font-mono">
                Tensión: {(getQuestionTension(question) * 100).toFixed(0)}%
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Echo overlay - shown when user is silent */}
      <AnimatePresence>
        {isEchoVisible && echo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-xl"
          >
            <div className="text-center max-w-lg px-4">
              <div className="mb-3 flex items-center justify-center gap-2">
                <motion.div
                  animate={{ 
                    opacity: [0.5, 1, 0.5],
                    scale: [0.95, 1.05, 0.95]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Radio className={`w-5 h-5 ${echo.type === 'deep_probe' ? 'text-red-400' : 'text-primary'}`} />
                </motion.div>
                <span className={`text-xs font-mono uppercase tracking-wider ${
                  echo.type === 'deep_probe' ? 'text-red-400' : 'text-primary'
                }`}>
                  {echo.type === 'deep_probe' ? 'Eco profundo' : 'Eco suave'}
                </span>
              </div>
              <p className="font-serif text-xl md:text-2xl text-foreground leading-relaxed">
                <span className="text-primary opacity-50">"</span>
                {echo.echo}
                <span className="text-primary opacity-50">"</span>
              </p>
              {echo.direction && (
                <p className="mt-3 text-xs text-muted-foreground italic max-w-xs mx-auto">
                  {echo.direction}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Context Input */}
      <AnimatePresence>
        {showContextInput && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleContextSubmit}
            className="mt-8 max-w-xl mx-auto"
          >
            <div className="flex gap-2">
              <Input
                value={userContext}
                onChange={(e) => setUserContext(e.target.value)}
                placeholder="¿Qué te preocupa? ¿Qué situación enfrentas?"
                className="flex-1 bg-background/50 border-primary/30 focus:border-primary"
              />
              <Button
                type="submit"
                disabled={!userContext.trim() || isLoading}
                className="gap-2"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Comparte tu contexto para una pregunta personalizada
            </p>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="mt-12 flex justify-center gap-3 flex-wrap">
        <Button
          variant="outline"
          size="lg"
          onClick={loadStaticQuestion}
          disabled={isLoading}
          className="font-serif gap-2 border-primary/30 hover:bg-primary/10 hover:border-primary/50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading && !isAIMode ? 'animate-spin' : ''}`} />
          Del banco
        </Button>
        
        <Button
          variant="outline"
          size="lg"
          onClick={() => loadAIQuestion()}
          disabled={isLoading}
          className="font-serif gap-2 border-amber-500/30 hover:bg-amber-500/10 hover:border-amber-500/50 text-amber-400"
        >
          <Sparkles className={`w-4 h-4 ${isLoading && isAIMode ? 'animate-spin' : ''}`} />
          Generar con IA
        </Button>

        <Button
          variant="ghost"
          size="lg"
          onClick={() => setShowContextInput(!showContextInput)}
          className="font-serif gap-2 text-muted-foreground hover:text-foreground"
        >
          <Send className="w-4 h-4" />
          Contextualizar
        </Button>
      </div>
    </div>
  );
}
