import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Sparkles, RotateCcw, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { continueDialogue, DialogueMessage, AIQuestion } from '@/utils/aiService';

const ejeLabels: Record<string, string> = {
  Miedo: 'Miedo',
  Control: 'Control',
  SaludMental: 'Salud Mental',
  Legitimidad: 'Legitimidad',
  Responsabilidad: 'Responsabilidad',
};

const ejeColors: Record<string, string> = {
  Miedo: 'bg-red-500/20 text-red-400 border-red-500/30',
  Control: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  SaludMental: 'bg-green-500/20 text-green-400 border-green-500/30',
  Legitimidad: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  Responsabilidad: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

interface DialogueEntry {
  type: 'oracle' | 'user';
  content: string;
  question?: AIQuestion;
  timestamp: Date;
}

export function SocraticDialogue() {
  const [dialogue, setDialogue] = useState<DialogueEntry[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [dialogue]);

  const buildConversationHistory = (): DialogueMessage[] => {
    return dialogue.map(entry => ({
      role: entry.type === 'oracle' ? 'oracle' : 'user',
      content: entry.type === 'oracle' 
        ? entry.question?.pregunta || entry.content 
        : entry.content
    }));
  };

  const startDialogue = async () => {
    setIsLoading(true);
    try {
      const response = await continueDialogue([]);
      setDialogue([{
        type: 'oracle',
        content: response.pregunta,
        question: response,
        timestamp: new Date()
      }]);
      setIsStarted(true);
    } catch (error) {
      console.error('Error starting dialogue:', error);
      toast.error('Error al iniciar el diálogo');
    } finally {
      setIsLoading(false);
    }
  };

  const sendResponse = async () => {
    if (!userInput.trim() || isLoading) return;

    const userMessage = userInput.trim();
    setUserInput('');
    
    // Add user response to dialogue
    const newDialogue: DialogueEntry[] = [
      ...dialogue,
      {
        type: 'user',
        content: userMessage,
        timestamp: new Date()
      }
    ];
    setDialogue(newDialogue);
    
    setIsLoading(true);
    try {
      const history = buildConversationHistory();
      history.push({ role: 'user', content: userMessage });
      
      const response = await continueDialogue(history);
      
      setDialogue(prev => [
        ...prev,
        {
          type: 'oracle',
          content: response.pregunta,
          question: response,
          timestamp: new Date()
        }
      ]);
    } catch (error) {
      console.error('Error continuing dialogue:', error);
      toast.error('Error al continuar el diálogo');
    } finally {
      setIsLoading(false);
    }
  };

  const resetDialogue = () => {
    setDialogue([]);
    setIsStarted(false);
    setUserInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendResponse();
    }
  };

  if (!isStarted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-xl"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
            <MessageCircle className="w-10 h-10 text-primary" />
          </div>
          <h2 className="font-serif text-3xl md:text-4xl text-foreground mb-4">
            Diálogo Socrático
          </h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            Inicia una conversación profunda con el Oráculo. Cada respuesta tuya 
            generará una nueva pregunta que desafía tus asunciones y expone 
            contradicciones. No hay respuestas correctas, solo fricción productiva.
          </p>
          <Button
            size="lg"
            onClick={startDialogue}
            disabled={isLoading}
            className="font-serif gap-2"
          >
            <Sparkles className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Iniciando...' : 'Comenzar Diálogo'}
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px] max-h-[70vh] border border-border/50 rounded-lg bg-background/50 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="font-serif text-lg">Diálogo Socrático</span>
          <span className="text-xs text-muted-foreground">
            ({Math.floor(dialogue.length / 2)} intercambios)
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={resetDialogue}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="w-4 h-4" />
          Reiniciar
        </Button>
      </div>

      {/* Dialogue Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        <AnimatePresence mode="popLayout">
          {dialogue.map((entry, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className={`flex ${entry.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {entry.type === 'oracle' && entry.question ? (
                <div className="max-w-[85%] space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-mono border ${
                      ejeColors[entry.question.eje] || 'bg-primary/10 text-primary border-primary/30'
                    }`}>
                      {ejeLabels[entry.question.eje] || entry.question.eje}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      Nivel {entry.question.nivel}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      Tensión: {(entry.question.tension * 100).toFixed(0)}%
                    </span>
                  </div>
                  <blockquote className="bg-card/50 border border-border/50 rounded-lg p-4 font-serif text-lg leading-relaxed">
                    <span className="text-primary opacity-50">"</span>
                    {entry.question.pregunta}
                    <span className="text-primary opacity-50">"</span>
                  </blockquote>
                  {entry.question.conexion && (
                    <p className="text-xs text-muted-foreground italic pl-2">
                      {entry.question.conexion}
                    </p>
                  )}
                </div>
              ) : (
                <div className="max-w-[85%] bg-primary/10 border border-primary/20 rounded-lg p-4">
                  <p className="text-foreground">{entry.content}</p>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-card/50 border border-border/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Sparkles className="w-4 h-4 animate-spin" />
                <span className="text-sm">El Oráculo reflexiona...</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-border/50 p-4">
        <div className="flex gap-2">
          <Textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu respuesta o reflexión..."
            className="flex-1 min-h-[60px] max-h-[120px] resize-none bg-background/50"
            disabled={isLoading}
          />
          <Button
            onClick={sendResponse}
            disabled={!userInput.trim() || isLoading}
            className="self-end"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Presiona Enter para enviar, Shift+Enter para nueva línea
        </p>
      </div>
    </div>
  );
}
