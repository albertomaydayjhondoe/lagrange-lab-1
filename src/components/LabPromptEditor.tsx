import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/compartido/ui/button';
import { Textarea } from '@/compartido/ui/textarea';
import { Send, Sparkles, Brain, Loader2 } from 'lucide-react';
import { fetchQuestionsByEje } from '@/compartido/lib/dataService';
import { generateContextualQuestion, AIQuestion } from '@/utils/aiService';
import { toast } from 'sonner';

interface LabResponse {
  type: 'question' | 'reflection' | 'ai-question';
  content: string;
  eje?: string;
  tension?: number;
  conexion?: string;
  isAI?: boolean;
}

export function LabPromptEditor() {
  const [input, setInput] = useState('');
  const [responses, setResponses] = useState<LabResponse[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [useAI, setUseAI] = useState(true);

  const detectEje = (text: string): string => {
    const keywords = {
      miedo: ['miedo', 'temor', 'pánico', 'ansiedad', 'terror', 'asustado'],
      control: ['control', 'poder', 'autoridad', 'dominio', 'mando', 'libertad'],
      salud_mental: ['loco', 'enfermo', 'trastorno', 'sensible', 'exagerado', 'depresión'],
      legitimidad: ['verdad', 'prueba', 'razón', 'derecho', 'justo', 'mentira'],
      responsabilidad: ['culpa', 'responsable', 'deber', 'obligación', 'consecuencias']
    };

    const inputLower = text.toLowerCase();
    
    for (const [eje, words] of Object.entries(keywords)) {
      if (words.some(word => inputLower.includes(word))) {
        return eje;
      }
    }
    return 'miedo';
  };

  const ejeToAPIFormat = (eje: string): string => {
    const map: Record<string, string> = {
      miedo: 'Miedo',
      control: 'Control',
      salud_mental: 'SaludMental',
      legitimidad: 'Legitimidad',
      responsabilidad: 'Responsabilidad'
    };
    return map[eje] || 'Miedo';
  };

  const processInput = async () => {
    if (!input.trim()) return;
    
    setIsProcessing(true);
    const detectedEje = detectEje(input);

    try {
      if (useAI) {
        // Usar el Oráculo Socrático con IA
        const aiResponse = await generateContextualQuestion(
          input,
          ejeToAPIFormat(detectedEje)
        );

        const newResponses: LabResponse[] = [
          {
            type: 'reflection',
            content: `El Oráculo analiza tu inquietud en el eje de ${aiResponse.eje}...`,
            eje: detectedEje,
            isAI: true
          },
          {
            type: 'ai-question',
            content: aiResponse.pregunta,
            eje: detectedEje,
            tension: aiResponse.tension,
            conexion: aiResponse.conexion,
            isAI: true
          }
        ];

        setResponses(prev => [...prev, ...newResponses]);
        toast.success('Pregunta generada por el Oráculo IA');
      } else {
        // Fallback a preguntas estáticas
        const questions = await fetchQuestionsByEje(detectedEje);
        const randomQuestion = questions[Math.floor(Math.random() * questions.length)];

        const newResponses: LabResponse[] = [
          {
            type: 'reflection',
            content: `Tu inquietud parece orbitar alrededor del eje de ${detectedEje.replace('_', ' ')}.`,
            eje: detectedEje
          },
          {
            type: 'question',
            content: randomQuestion?.texto || '¿Qué pasaría si dejaras de tener miedo?',
            eje: detectedEje
          }
        ];

        setResponses(prev => [...prev, ...newResponses]);
      }
    } catch (error) {
      console.error('Error processing input:', error);
      toast.error('Error al generar pregunta. Usando modo estático.');
      
      // Fallback en caso de error
      const questions = await fetchQuestionsByEje(detectedEje);
      const randomQuestion = questions[Math.floor(Math.random() * questions.length)];

      setResponses(prev => [...prev, {
        type: 'question',
        content: randomQuestion?.texto || '¿Qué pasaría si dejaras de tener miedo?',
        eje: detectedEje
      }]);
    }

    setInput('');
    setIsProcessing(false);
  };

  const ejeLabels: Record<string, string> = {
    miedo: 'Miedo',
    control: 'Control',
    salud_mental: 'Salud Mental',
    legitimidad: 'Legitimidad',
    responsabilidad: 'Responsabilidad',
    Miedo: 'Miedo',
    Control: 'Control',
    SaludMental: 'Salud Mental',
    Legitimidad: 'Legitimidad',
    Responsabilidad: 'Responsabilidad'
  };

  const clearResponses = () => {
    setResponses([]);
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* AI Toggle */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant={useAI ? "default" : "outline"}
          size="sm"
          onClick={() => setUseAI(!useAI)}
          className="gap-2"
        >
          <Brain className="w-4 h-4" />
          {useAI ? 'Oráculo IA Activo' : 'Modo Estático'}
        </Button>
        
        {responses.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearResponses}
            className="text-muted-foreground"
          >
            Limpiar
          </Button>
        )}
      </div>

      {/* Response area */}
      <div className="mb-8 space-y-6 min-h-[200px]">
        <AnimatePresence mode="popLayout">
          {responses.length === 0 ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12 text-muted-foreground"
            >
              <Sparkles className="w-8 h-8 mx-auto mb-4 opacity-50" />
              <p className="font-serif text-lg">
                Expresa tu inquietud. El Oráculo {useAI ? 'IA' : ''} no te dará respuestas, 
                te devolverá preguntas.
              </p>
              {useAI && (
                <p className="text-sm mt-2 text-primary/70">
                  Powered by Lagrange AI Oracle
                </p>
              )}
            </motion.div>
          ) : (
            responses.map((response, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                className={`p-6 rounded-xl ${
                  response.type === 'ai-question'
                    ? 'bg-gradient-to-br from-primary/10 to-lagrange-tension/10 border border-primary/30'
                    : response.type === 'question'
                    ? 'bg-primary/5 border border-primary/20'
                    : 'bg-card border border-border'
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  {response.eje && (
                    <span className="inline-block px-2 py-1 rounded text-xs font-mono uppercase tracking-wider bg-primary/10 text-primary">
                      {ejeLabels[response.eje] || response.eje}
                    </span>
                  )}
                  {response.isAI && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-mono bg-lagrange-tension/10 text-lagrange-tension">
                      <Brain className="w-3 h-3" />
                      IA
                    </span>
                  )}
                  {response.tension !== undefined && (
                    <span className="inline-block px-2 py-1 rounded text-xs font-mono bg-muted text-muted-foreground">
                      Tensión: {Math.round(response.tension * 100)}%
                    </span>
                  )}
                </div>
                
                <p className={`font-serif ${
                  response.type === 'ai-question' || response.type === 'question'
                    ? 'text-xl text-foreground' 
                    : 'text-muted-foreground'
                }`}>
                  {(response.type === 'question' || response.type === 'ai-question') && (
                    <span className="text-primary">"</span>
                  )}
                  {response.content}
                  {(response.type === 'question' || response.type === 'ai-question') && (
                    <span className="text-primary">"</span>
                  )}
                </p>

                {response.conexion && (
                  <p className="mt-3 text-sm text-muted-foreground italic border-t border-border/50 pt-3">
                    {response.conexion}
                  </p>
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Input area */}
      <div className="relative">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={useAI 
            ? "¿Qué te inquieta? El Oráculo IA analizará tu contexto..." 
            : "¿Qué te inquieta? ¿Qué contradicción observas?"
          }
          className="min-h-[120px] pr-16 font-serif text-lg bg-card border-border resize-none focus:border-primary/50"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.metaKey) {
              processInput();
            }
          }}
          disabled={isProcessing}
        />
        <Button
          onClick={processInput}
          disabled={isProcessing || !input.trim()}
          size="icon"
          className="absolute bottom-4 right-4 bg-primary hover:bg-primary/90"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
      
      <p className="text-center text-muted-foreground text-sm mt-4 font-mono">
        ⌘ + Enter para enviar
      </p>
    </div>
  );
}
