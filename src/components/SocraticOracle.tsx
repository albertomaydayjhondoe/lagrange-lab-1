import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchRandomQuestion, SocraticQuestion } from '@/utils/dataService';
import { generateSocraticQuestion, AIQuestion } from '@/utils/aiService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, Sparkles, Send } from 'lucide-react';
import { toast } from 'sonner';

type DisplayQuestion = SocraticQuestion | AIQuestion;

function isAIQuestion(q: DisplayQuestion): q is AIQuestion {
  return 'pregunta' in q;
}

export function SocraticOracle() {
  const [question, setQuestion] = useState<DisplayQuestion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAIMode, setIsAIMode] = useState(false);
  const [userContext, setUserContext] = useState('');
  const [showContextInput, setShowContextInput] = useState(false);

  const loadStaticQuestion = async () => {
    setIsLoading(true);
    const q = await fetchRandomQuestion();
    setQuestion(q);
    setIsAIMode(false);
    setIsLoading(false);
  };

  const loadAIQuestion = async (context?: string) => {
    setIsLoading(true);
    try {
      const q = await generateSocraticQuestion({ 
        context: context || undefined 
      });
      setQuestion(q);
      setIsAIMode(true);
      setShowContextInput(false);
      setUserContext('');
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
