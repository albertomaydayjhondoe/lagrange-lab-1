import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2, Sparkles, User, Bot, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/compartido/ui/button';
import { Input } from '@/compartido/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/compartido/ui/card';
import { ScrollArea } from '@/compartido/ui/scroll-area';
import { cn } from '@/lib/utils';
import { supabase } from '@/compartido/lib/supabaseClient';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/**
 * ORÁCULO - Página Principal
 * Chat dialéctico centrado en el Oráculo Socrático
 */
export function OraclePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedEje, setSelectedEje] = useState('dialéctico');
  const scrollRef = useRef<HTMLDivElement>(null);

  const ejes = ['dialéctico', 'ontológico', 'epistemológico', 'ético', 'político'];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    // Mensaje inicial del Oráculo
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: 'Soy el Oráculo. No estoy aquí para darte respuestas. Estoy aquí para quitarte las que ya tienes. ¿Qué te trae aquí esta noche?',
          timestamp: new Date(),
        },
      ]);
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Simular respuesta del Oráculo (reemplazar con llamada real a Edge Function)
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const oracleResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: generateSocraticResponse(input.trim()),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, oracleResponse]);
    } catch (error) {
      toast.error('El Oráculo no responde. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const generateSocraticResponse = (question: string): string => {
    // Respuestas socráticas predefinidas para demostración
    const responses = [
      'Cuando dices eso, ¿también estás diciendo que lo opuesto es imposible?',
      '¿Cómo defines exactamente lo que acabas de afirmar?',
      '¿Y si te dijera que la premisa central de tu argumento se contradice a sí misma?',
      'Has asumido algo que no has probado. ¿Qué te hace estar tan seguro?',
      '¿Qué pasaría si el concepto que estás usando no tiene significado en sí mismo?',
      'Tu respuesta parece más un deseo que un argumento. ¿Puedes distinguir la diferencia?',
      'Interesante. Pero has ignorado precisamente el problema más fundamental.',
      'Mmm. Antes de continuar, necesito que definas un término que acabas de usar.',
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: 'El diálogo ha sido borrado. ¿Qué te trae de vuelta?',
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header del Oráculo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-mono mb-3">
          <Sparkles className="w-4 h-4" />
          <span>Oráculo Socrático</span>
        </div>
        <h1 className="font-serif text-2xl md:text-3xl mb-2">
          El Laboratorio del Pensamiento Crítico
        </h1>
        <p className="text-muted-foreground text-sm max-w-xl mx-auto">
          No busques respuestas. Cuestiona las preguntas.
        </p>
      </motion.div>

      {/* Selector de eje */}
      <div className="flex flex-wrap gap-2 justify-center mb-6">
        {ejes.map((eje) => (
          <Button
            key={eje}
            variant={selectedEje === eje ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedEje(eje)}
            className={cn(
              "capitalize text-xs",
              selectedEje === eje && "bg-primary"
            )}
          >
            {eje}
          </Button>
        ))}
      </div>

      {/* Chat */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bot className="w-5 h-5 text-primary" />
            Diálogo
          </CardTitle>
          <CardDescription>
            {!isAuthenticated && (
              <span className="text-amber-500">Inicia sesión para acceder a funcionalidades completas</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Messages */}
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex gap-3",
                    message.role === 'user' && "flex-row-reverse"
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                      message.role === 'assistant'
                        ? "bg-primary/10 text-primary"
                        : "bg-secondary text-secondary-foreground"
                    )}
                  >
                    {message.role === 'assistant' ? (
                      <Bot className="w-4 h-4" />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                  </div>
                  <div
                    className={cn(
                      "rounded-lg px-4 py-2 max-w-[80%]",
                      message.role === 'assistant'
                        ? "bg-muted text-foreground"
                        : "bg-primary text-primary-foreground"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs opacity-50 mt-1">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-lg px-4 py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu pregunta o afirmación..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !input.trim()} size="icon">
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={clearChat}
              title="Nuevo diálogo"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-6 p-4 rounded-lg bg-muted/50 border"
      >
        <h3 className="font-serif text-sm mb-2">Regla del Oráculo</h3>
        <p className="text-xs text-muted-foreground">
          El sistema rechaza respuestas terapéuticas o políticas. Solo devuelve contradicciones 
          estructurales. Si el resultado no incomoda, se descarta.
        </p>
      </motion.div>
    </div>
  );
}
