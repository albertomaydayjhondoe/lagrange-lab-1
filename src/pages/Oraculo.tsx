/**
 * Oraculo - El Oráculo Socrático en contexto de carrera
 * 
 * Chat dialéctico centrado en el Oráculo Socrático
 * USA academy_id de la carrera seleccionada para filtrar corpus
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Send, Loader2, Sparkles, User, Bot, RefreshCw, GraduationCap, BookOpen, ChevronRight } from 'lucide-react';
import { Button } from '@/compartido/ui/button';
import { Input } from '@/compartido/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/compartido/ui/card';
import { ScrollArea } from '@/compartido/ui/scroll-area';
import { Badge } from '@/compartido/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/compartido/lib/supabaseClient';
import { toast } from 'sonner';
import { fetchAcademySpaces, AcademySpace } from '@/compartido/lib/academySpacesService';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: any[];
}

interface Academy {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  role?: string | null;
  is_member?: boolean;
}

export function Oraculo() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const materiaParam = searchParams.get('materia');
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedEje, setSelectedEje] = useState('dialéctico');
  const [academy, setAcademy] = useState<Academy | null>(null);
  const [materias, setMaterias] = useState<AcademySpace[]>([]);
  const [selectedMateria, setSelectedMateria] = useState<string | null>(materiaParam);
  const [loadingData, setLoadingData] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ejes = ['dialéctico', 'ontológico', 'epistemológico', 'ético', 'político'];

  // Cargar datos iniciales
  useEffect(() => {
    const loadData = async () => {
      // Check auth
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);

      if (!session) {
        setLoadingData(false);
        return;
      }

      // Cargar academia actual
      const { data: academiesData } = await supabase.functions.invoke('list-academies');
      const userAcademies = (academiesData?.academies || []).filter((a: Academy) => a.is_member);
      const currentAcademy = userAcademies.find((a: Academy) => a.slug === slug);
      
      if (!currentAcademy) {
        toast({ title: 'No tienes acceso a esta carrera', variant: 'destructive' });
        navigate('/academies');
        return;
      }
      
      setAcademy(currentAcademy);

      // Cargar materias
      const spaces = await fetchAcademySpaces(currentAcademy.id);
      setMaterias(spaces.filter(s => !s.parent_space_id));

      // Si hay materia en param, seleccionarla
      if (materiaParam) {
        setSelectedMateria(materiaParam);
      }

      setLoadingData(false);
    };

    loadData();

    // Mensaje inicial del Oráculo
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: 'Soy el Oráculo de esta carrera. No estoy aquí para darte respuestas. Estoy aquí para quitarte las que ya tienes. ¿Qué te trae aquí esta noche?',
          timestamp: new Date(),
        },
      ]);
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Llamada real al Oráculo
  const callOracle = async (question: string, history: { role: string; content: string }[]): Promise<any> => {
    if (!academy) {
      throw new Error('Selecciona una carrera');
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Inicia sesión');
    }

    const response = await supabase.functions.invoke('socratic-oracle', {
      body: {
        academyId: academy.id,
        context: question,
        eje: selectedEje,
        spaceId: selectedMateria, // Pasar materia seleccionada
        conversationHistory: history,
        includeCorpus: true,
      },
    });

    if (response.error) {
      throw new Error(response.error.message || 'Error del Oráculo');
    }

    return response.data;
  };

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
      const history = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'oracle',
        content: m.content,
      }));

      const response = await callOracle(input.trim(), history);

      const oracleResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.pregunta || generateSocraticResponse(input.trim()),
        timestamp: new Date(),
        sources: response.wikipedia_provenance,
      };

      setMessages((prev) => [...prev, oracleResponse]);
    } catch (error: any) {
      toast.error(error.message || 'El Oráculo no responde. Intenta de nuevo.');
      const oracleResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: generateSocraticResponse(input.trim()),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, oracleResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateSocraticResponse = (question: string): string => {
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

  const saveDialogue = async () => {
    if (messages.length < 3) {
      toast({ title: 'El diálogo es muy corto para guardar' });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: 'Inicia sesión para guardar', variant: 'destructive' });
        return;
      }

      const { error } = await supabase.functions.invoke('save-dialogue', {
        body: {
          dialogueContent: messages,
          eje: selectedEje,
          title: `Diálogo sobre ${selectedEje} - ${new Date().toLocaleDateString()}`,
        },
      });

      if (error) throw error;
      toast({ title: 'Diálogo guardado en Mis Apuntes' });
      navigate('/perfil');
    } catch (error) {
      toast({ title: 'Error al guardar', variant: 'destructive' });
    }
  };

  if (loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate(`/carrera/${slug}`)}
              className="text-muted-foreground"
            >
              <ChevronRight className="w-4 h-4 rotate-180 mr-1" />
              Volver a {academy?.name}
            </Button>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-serif text-2xl">💬 Oráculo Socrático</h1>
              <p className="text-muted-foreground text-sm">
                {academy?.name} · No busques respuestas. Cuestiona las preguntas.
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Selector de materia + eje */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Selector de materia */}
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-muted-foreground" />
              <select
                value={selectedMateria || ''}
                onChange={(e) => setSelectedMateria(e.target.value || null)}
                className="bg-background border rounded-md px-3 py-1.5 text-sm"
              >
                <option value="">Todas las materias</option>
                {materias.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Selector de eje */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Eje:</span>
              <div className="flex flex-wrap gap-1">
                {ejes.map((eje) => (
                  <Button
                    key={eje}
                    variant={selectedEje === eje ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setSelectedEje(eje)}
                    className={cn(
                      "text-xs capitalize",
                      selectedEje === eje && "bg-primary"
                    )}
                  >
                    {eje}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat principal */}
      <div className="flex-1 flex flex-col container mx-auto px-4 py-6 max-w-4xl">
        <Card className="flex-1 flex flex-col border-primary/20">
          <CardHeader className="pb-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bot className="w-5 h-5 text-primary" />
                Diálogo Socrático
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={saveDialogue}
                  className="text-xs"
                >
                  Guardar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearChat}
                  className="text-xs"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Nuevo
                </Button>
              </div>
            </div>
            <CardDescription>
              {!isAuthenticated && (
                <span className="text-amber-500">Inicia sesión para acceder a funcionalidades completas</span>
              )}
              {isAuthenticated && selectedMateria && (
                <span className="text-primary">
                  Explorando: {materias.find(m => m.id === selectedMateria)?.name}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col min-h-0">
            {/* Messages */}
            <ScrollArea className="flex-1 pr-4 mb-4">
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
                        "rounded-lg px-4 py-2 max-w-[85%]",
                        message.role === 'assistant'
                          ? "bg-muted text-foreground"
                          : "bg-primary text-primary-foreground"
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-border/50">
                          <p className="text-xs text-muted-foreground">
                            📚 {message.sources.length} fuentes consultadas
                          </p>
                        </div>
                      )}
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
            <form onSubmit={handleSubmit} className="flex gap-2 flex-shrink-0">
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
            </form>
          </CardContent>
        </Card>

        {/* Info del Oráculo */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-4 p-4 rounded-lg bg-muted/50 border"
        >
          <h3 className="font-serif text-sm mb-2">Regla del Oráculo</h3>
          <p className="text-xs text-muted-foreground">
            El sistema rechaza respuestas terapéuticas o políticas. Solo devuelve contradicciones 
            estructurales. Si el resultado no incomoda, se descarta.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default Oraculo;
