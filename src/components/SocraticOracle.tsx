import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchRandomQuestion, SocraticQuestion } from '@/utils/dataService';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export function SocraticOracle() {
  const [question, setQuestion] = useState<SocraticQuestion | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadQuestion = async () => {
    setIsLoading(true);
    const q = await fetchRandomQuestion();
    setQuestion(q);
    setIsLoading(false);
  };

  useEffect(() => {
    loadQuestion();
  }, []);

  const ejeLabels: Record<string, string> = {
    miedo: 'Miedo',
    control: 'Control',
    salud_mental: 'Salud Mental',
    legitimidad: 'Legitimidad',
    responsabilidad: 'Responsabilidad'
  };

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {question && (
          <motion.div
            key={question.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <div className="mb-4 flex items-center justify-center gap-3">
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-mono uppercase tracking-wider">
                {ejeLabels[question.eje] || question.eje}
              </span>
              <span className="text-muted-foreground text-xs font-mono">
                Nivel {question.nivel}
              </span>
            </div>
            
            <blockquote className="font-serif text-2xl md:text-3xl lg:text-4xl text-foreground leading-relaxed max-w-4xl mx-auto">
              <span className="text-primary opacity-50">"</span>
              {question.texto}
              <span className="text-primary opacity-50">"</span>
            </blockquote>

            <div className="mt-8 flex items-center justify-center gap-2">
              <div 
                className="h-1 rounded-full bg-primary/30"
                style={{ width: `${question.tension * 100}px` }}
              />
              <span className="text-muted-foreground text-xs font-mono">
                Tensión: {(question.tension * 100).toFixed(0)}%
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-12 flex justify-center">
        <Button
          variant="outline"
          size="lg"
          onClick={loadQuestion}
          disabled={isLoading}
          className="font-serif gap-2 border-primary/30 hover:bg-primary/10 hover:border-primary/50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Otra pregunta
        </Button>
      </div>
    </div>
  );
}
