import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchRandomQuestion, SocraticQuestion, fetchAxes } from '@/compartido/lib/dataService';
import { generateSocraticQuestion, AIQuestion } from '@/utils/aiService';
import { supabase } from '@/compartido/lib/supabaseClient';
import { Button } from '@/compartido/ui/button';
import { Input } from '@/compartido/ui/input';
import { Sparkles, Send, Radio, CloudFog, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAcademy, useAcademyTheme } from '@/caracteristicas/academia/AcademyContext';
import { useUserRole } from '@/caracteristicas/academia/hooks/useAcademyRole';

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

// Fog teaser interface
interface FogTeaser {
  teaser: string;
  source: 'generated' | 'cache' | 'fallback';
}

function isAIQuestion(q: DisplayQuestion): q is AIQuestion {
  return 'pregunta' in q;
}

// Props for reactive oracle
interface SocraticOracleProps {
  activeAxis?: string | null;
  selectedNodeId?: string | null;
  onQuestionGenerated?: (question: string, eje: string) => void;
  onOpenDialogue?: () => void;
}

export function SocraticOracle({ activeAxis, selectedNodeId, onQuestionGenerated, onOpenDialogue }: SocraticOracleProps) {
  const [question, setQuestion] = useState<DisplayQuestion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAIMode, setIsAIMode] = useState(false);
  const [userContext, setUserContext] = useState('');
  const [showContextInput, setShowContextInput] = useState(false);
  const [fogTeaser, setFogTeaser] = useState<FogTeaser | null>(null);
  const [isLoadingTeaser, setIsLoadingTeaser] = useState(false);
  
  // Echo state
  const [echo, setEcho] = useState<OracleEcho | null>(null);
  const [isEchoVisible, setIsEchoVisible] = useState(false);
  const lastActivityRef = useRef<number>(Date.now());
  const conversationHistoryRef = useRef<Array<{role: string; content: string}>>([]);

  // Academy context
  const academyContext = useAcademy();
  const theme = academyContext?.theme ?? null;
  const academy = academyContext?.academy;
  const { isPlaton, isAdmin, loading: roleLoading } = useUserRole();

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

  // Accent color from academy theme
  const accentColor = theme?.primaryColor ?? 'var(--primary)';

  // Fetch fog teaser
  const fetchFogTeaser = useCallback(async () => {
    if (!activeAxis) {
      setFogTeaser({ teaser: 'La niebla guarda sus secretos...', source: 'fallback' });
      return;
    }

    setIsLoadingTeaser(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setFogTeaser({ teaser: 'Más allá de la niebla hay preguntas por descubrir...', source: 'fallback' });
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fog-teaser`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          activeAxis,
          dominantAxis: null,
          proximityToCenter: 0.5,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setFogTeaser(data);
      } else {
        setFogTeaser({ teaser: 'Entre los nodos, hay preguntas sin respuesta...', source: 'fallback' });
      }
    } catch {
      setFogTeaser({ teaser: 'La niebla revela sus secretos a quien sabe preguntar...', source: 'fallback' });
    } finally {
      setIsLoadingTeaser(false);
    }
  }, [activeAxis]);

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
          conversationHistory: conversationHistoryRef.current.slice(-6),
        }),
      });

      if (response.ok) {
        const echoData: OracleEcho = await response.json();
        setEcho(echoData);
        setIsEchoVisible(true);
        
        setTimeout(() => {
          setIsEchoVisible(false);
        }, 15000);
      }
    } catch (error) {
      console.error('Error generating echo:', error);
    }
  }, [question, activeAxis, selectedNodeId]);

  // Record user activity
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
  const loadStaticQuestion = useCallback(async () => {
    setIsLoading(true);
    const q = await fetchRandomQuestion();
    setQuestion(q);
    setIsAIMode(false);
    setIsLoading(false);
    recordActivity();
    fetchFogTeaser();
  }, [fetchFogTeaser, recordActivity]);

  // Load AI question with context
  const loadAIQuestion = async (context?: string) => {
    setIsLoading(true);
    try {
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
      
      conversationHistoryRef.current.push({
        role: 'oracle',
        content: q.pregunta
      });
      
      if (onQuestionGenerated) {
        onQuestionGenerated(q.pregunta, q.eje);
      }
      
      fetchFogTeaser();
    } catch (error) {
      console.error('Error generating AI question:', error);
      toast.error('Error al generar pregunta. Usando banco estático.');
      await loadStaticQuestion();
    } finally {
      setIsLoading(false);
    }
  };

  // Load question from a different axis
  const loadFromDifferentAxis = async () => {
    setIsLoading(true);
    try {
      // Get all available axes
      const axes = await fetchAxes();
      if (axes && axes.length > 0) {
        // Pick a random axis different from current
        const currentAxis = activeAxis || '';
        const otherAxes = axes.filter(a => a.id !== currentAxis);
        if (otherAxes.length > 0) {
          const randomAxis = otherAxes[Math.floor(Math.random() * otherAxes.length)];
          await loadAIQuestion(`Quiero explorar el eje de ${ejeLabels[randomAxis.id] || randomAxis.id}`);
          return;
        }
      }
      // Fallback to any random question
      await loadAIQuestion();
    } catch {
      await loadAIQuestion();
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
  }, [loadStaticQuestion]);

  useEffect(() => {
    if (activeAxis || selectedNodeId) {
      if (!question) {
        loadAIQuestion();
      }
    }
    fetchFogTeaser();
  }, [activeAxis, selectedNodeId, fetchFogTeaser]);

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
    <div className="relative min-h-[calc(100vh-8rem)] flex flex-col">
      {/* Fog teaser - SIEMPRE visible como indicación de contenido bloqueado */}
      <div 
        className="absolute top-4 left-4 right-4 md:left-auto md:right-auto md:max-w-md mx-auto"
        style={{ maxWidth: '28rem' }}
      >
        <div 
          className="flex items-center gap-2 px-3 py-2 rounded-lg border backdrop-blur-sm"
          style={{ 
            backgroundColor: `${accentColor}10`,
            borderColor: `${accentColor}30`,
          }}
        >
          <CloudFog className="w-4 h-4 flex-shrink-0" style={{ color: accentColor }} />
          {isLoadingTeaser ? (
            <span className="text-xs italic" style={{ color: theme?.mutedColor || 'hsl(var(--muted-foreground))' }}>
              La niebla susurra...
            </span>
          ) : fogTeaser ? (
            <span className="text-xs italic" style={{ color: theme?.mutedColor || 'hsl(var(--muted-foreground))' }}>
              {fogTeaser.teaser}
            </span>
          ) : null}
        </div>
      </div>

      {/* Question card - centro visual */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div 
          className="w-full max-w-3xl rounded-2xl border p-8 md:p-12 backdrop-blur-sm"
          style={{ 
            backgroundColor: theme ? `${theme.backgroundColor}80` : 'hsl(var(--card) / 0.5)',
            borderColor: theme ? `${theme.borderColor}60` : 'hsl(var(--border) / 0.5)',
          }}
        >
          {/* Axis badge */}
          <AnimatePresence mode="wait">
            {question && (
              <motion.div
                key={getQuestionText(question) + '-badge'}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 flex items-center justify-center gap-3 flex-wrap"
              >
                <span 
                  className="px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider"
                  style={{ 
                    backgroundColor: `${accentColor}20`,
                    color: accentColor,
                  }}
                >
                  {ejeLabels[getQuestionAxis(question)] || getQuestionAxis(question)}
                </span>
                <span className="text-muted-foreground text-xs font-mono">
                  Nivel {getQuestionLevel(question)}
                </span>
                {isAIMode && (
                  <span 
                    className="px-2 py-0.5 rounded-full text-xs font-mono flex items-center gap-1"
                    style={{ 
                      backgroundColor: '#f59e0b20',
                      color: '#f59e0b',
                    }}
                  >
                    <Sparkles className="w-3 h-3" />
                    IA
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Question text */}
          <AnimatePresence mode="wait">
            {question && (
              <motion.div
                key={getQuestionText(question)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
              >
                <blockquote 
                  className="font-serif text-xl md:text-2xl lg:text-3xl leading-relaxed text-center"
                  style={{ 
                    color: theme?.textColor || 'hsl(var(--foreground))',
                    fontSize: 'clamp(1.2rem, 3vw, 1.5rem)',
                    fontWeight: 400,
                  }}
                >
                  <span style={{ color: accentColor, opacity: 0.4 }}>"</span>
                  {getQuestionText(question)}
                  <span style={{ color: accentColor, opacity: 0.4 }}>"</span>
                </blockquote>

                {isAIQuestion(question) && question.conexion && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mt-6 text-sm italic text-center max-w-xl mx-auto"
                    style={{ color: theme?.mutedColor || 'hsl(var(--muted-foreground))' }}
                  >
                    {question.conexion}
                  </motion.p>
                )}

                {/* Tension indicator */}
                <div className="mt-8 flex items-center justify-center gap-3">
                  <div 
                    className="h-1 rounded-full"
                    style={{ 
                      width: `${Math.min(getQuestionTension(question) * 150, 150)}px`,
                      backgroundColor: `${accentColor}40`,
                    }}
                  />
                  <span className="text-xs font-mono" style={{ color: theme?.mutedColor || 'hsl(var(--muted-foreground))' }}>
                    Tensión: {(getQuestionTension(question) * 100).toFixed(0)}%
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading state */}
          {isLoading && !question && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: accentColor }} />
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
            <Button
              onClick={() => onOpenDialogue?.()}
              size="lg"
              className="font-serif gap-2"
              style={{ 
                backgroundColor: accentColor,
                color: 'white',
              }}
            >
              <Send className="w-4 h-4" />
              Responder
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              onClick={loadFromDifferentAxis}
              disabled={isLoading}
              className="font-serif gap-2"
              style={{ 
                borderColor: `${accentColor}50`,
                color: accentColor,
              }}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Otro eje
            </Button>
          </div>
        </div>
      </div>

      {/* Footer with metadata */}
      <div 
        className="px-4 py-4 text-center"
        style={{ borderTop: `1px solid ${theme?.borderColor || 'hsl(var(--border))'}` }}
      >
        <p className="text-xs" style={{ color: theme?.mutedColor || 'hsl(var(--muted-foreground))' }}>
          eje activo: {ejeLabels[activeAxis || ''] || activeAxis || 'ninguno'} · academia: {academy?.name || 'Genesis'}
        </p>
      </div>

      {/* Echo overlay - shown when user is silent */}
      <AnimatePresence>
        {isEchoVisible && echo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm"
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
              <p 
                className="font-serif text-xl md:text-2xl leading-relaxed"
                style={{ color: theme?.textColor || 'hsl(var(--foreground))' }}
              >
                <span style={{ color: accentColor, opacity: 0.4 }}>"</span>
                {echo.echo}
                <span style={{ color: accentColor, opacity: 0.4 }}>"</span>
              </p>
              {echo.direction && (
                <p 
                  className="mt-3 text-xs italic max-w-xs mx-auto"
                  style={{ color: theme?.mutedColor || 'hsl(var(--muted-foreground))' }}
                >
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onSubmit={handleContextSubmit}
            className="mt-6 max-w-xl mx-auto px-4"
          >
            <div className="flex gap-2">
              <Input
                value={userContext}
                onChange={(e) => setUserContext(e.target.value)}
                placeholder="¿Qué te preocupa? ¿Qué situación enfrentas?"
                className="flex-1"
                style={{ 
                  backgroundColor: theme ? `${theme.backgroundColor}50` : 'hsl(var(--input))',
                  borderColor: `${accentColor}30`,
                }}
              />
              <Button
                type="submit"
                disabled={!userContext.trim() || isLoading}
                className="gap-2"
                style={{ backgroundColor: accentColor }}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-center mt-2" style={{ color: theme?.mutedColor || 'hsl(var(--muted-foreground))' }}>
              Comparte tu contexto para una pregunta personalizada
            </p>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Contextualizar button */}
      <div className="flex justify-center mt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowContextInput(!showContextInput)}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <Send className="w-3 h-3" />
          Contextualizar
        </Button>
      </div>
    </div>
  );
}
