/**
 * Tutorias - Sistema de Tutorías en contexto de carrera
 * 
 * Incluye:
 * - Lista de materias con sesiones disponibles
 * - Chat IA de apoyo (tutoring-oracle)
 * - Reserva de sesiones (mock de pago)
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  GraduationCap, 
  BookOpen, 
  Calendar, 
  Clock, 
  Users,
  Loader2,
  ChevronRight,
  MessageSquare,
  Sparkles,
  CheckCircle,
  Send
} from 'lucide-react';
import { Button } from '@/compartido/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/compartido/ui/card';
import { Badge } from '@/compartido/ui/badge';
import { Input } from '@/compartido/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/compartido/ui/tabs';
import { cn } from '@/lib/utils';
import { supabase } from '@/compartido/lib/supabaseClient';
import { fetchAcademySpaces, AcademySpace } from '@/compartido/lib/academySpacesService';
import { toast } from '@/hooks/use-toast';
import { useTutorias, formatPrice, formatDate } from '@/caracteristicas/tutorias/hooks/useTutorias';
import { SessionWithDetails, TutoringResponse } from '@/integrations/supabase/types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Academy {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  role?: string | null;
}

export function Tutorias() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const materiaParam = searchParams.get('materia');
  
  const [academy, setAcademy] = useState<Academy | null>(null);
  const [materias, setMaterias] = useState<AcademySpace[]>([]);
  const [selectedMateria, setSelectedMateria] = useState<string | null>(materiaParam);
  const [sessions, setSessions] = useState<SessionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Chat IA state
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  const { fetchSubjects, fetchSessions, bookSession, askQuestion, loading: loadingTutorias } = useTutorias();

  useEffect(() => {
    if (slug) {
      loadData();
    }
  }, [slug, materiaParam]);

  const loadData = async () => {
    setLoading(true);
    
    // Cargar academia
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

    // Si hay materia en param, seleccionarla y cargar sesiones
    if (materiaParam) {
      setSelectedMateria(materiaParam);
    }

    setLoading(false);

    // Mensaje inicial del chat
    setChatMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Soy tu asistente de tutorías. Puedo ayudarte a entender temas de esta carrera y responder tus preguntas. ¿En qué puedo ayudarte?',
        timestamp: new Date(),
      },
    ]);
  };

  const loadSessions = async (materiaId: string) => {
    const sessionData = await fetchSessions({ subjectId: materiaId, limit: 10 });
    setSessions(sessionData);
  };

  const handleMateriaChange = async (materiaId: string) => {
    setSelectedMateria(materiaId);
    await loadSessions(materiaId);
  };

  const handleBookSession = async (sessionId: string) => {
    try {
      const result = await bookSession(sessionId);
      if (result.success) {
        toast({ 
          title: '¡Sesión reservada!',
          description: result.payment?.requiresPayment ? 'Ahora puedes proceder al pago.' : ''
        });
        if (selectedMateria) {
          await loadSessions(selectedMateria);
        }
      }
    } catch (error: any) {
      toast({ title: 'Error: ' + error.message, variant: 'destructive' });
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || isChatLoading || !selectedMateria) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: chatInput.trim(),
      timestamp: new Date(),
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const history = chatMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      const response: TutoringResponse = await askQuestion(
        selectedMateria,
        userMessage.content,
        { conversationHistory: history }
      );

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
      };

      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      toast.error('Error: ' + error.message);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Lo siento, no pude procesar tu pregunta. Intenta de nuevo.',
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const getContrastColor = (hexColor: string): string => {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#FFFFFF';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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
              <GraduationCap className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-serif text-2xl">🎓 Tutorías</h1>
              <p className="text-muted-foreground text-sm">
                {academy?.name} · Apoyo con tutores y asistencia de IA
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="chat" className="space-y-6">
          <TabsList>
            <TabsTrigger value="chat" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Chat de Apoyo
            </TabsTrigger>
            <TabsTrigger value="sesiones" className="gap-2">
              <Calendar className="w-4 h-4" />
              Sesiones Programadas
            </TabsTrigger>
          </TabsList>

          {/* Tab: Chat de Apoyo IA */}
          <TabsContent value="chat" className="space-y-4">
            {/* Selector de materia */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  Selecciona una materia
                </CardTitle>
                <CardDescription>
                  Elige sobre qué materia quieres recibir apoyo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {materias.map((materia) => (
                    <Button
                      key={materia.id}
                      variant={selectedMateria === materia.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleMateriaChange(materia.id)}
                      className={cn(
                        selectedMateria === materia.id && "bg-primary"
                      )}
                    >
                      <div 
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: materia.color }}
                      />
                      {materia.name}
                    </Button>
                  ))}
                </div>
                {!selectedMateria && (
                  <p className="text-sm text-muted-foreground mt-3">
                    Selecciona una materia para comenzar a chatear
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Chat */}
            {selectedMateria ? (
              <Card className="border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Asistente de {materias.find(m => m.id === selectedMateria)?.name}
                  </CardTitle>
                  <CardDescription>
                    Tengo acceso a los materiales de esta materia para darte respuestas precisas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Messages */}
                  <div className="h-[400px] overflow-y-auto space-y-4 p-4 bg-muted/30 rounded-lg">
                    {chatMessages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "flex",
                          message.role === 'user' && "justify-end"
                        )}
                      >
                        <div
                          className={cn(
                            "rounded-lg px-4 py-2 max-w-[80%]",
                            message.role === 'assistant'
                              ? "bg-card border"
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
                    {isChatLoading && (
                      <div className="flex justify-start">
                        <div className="bg-card border rounded-lg px-4 py-2">
                          <div className="flex gap-1">
                            <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Input */}
                  <div className="flex gap-2">
                    <Input
                      placeholder={`Pregunta sobre ${materias.find(m => m.id === selectedMateria)?.name}...`}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendChat()}
                      disabled={isChatLoading}
                      className="flex-1"
                    />
                    <Button onClick={handleSendChat} disabled={isChatLoading || !chatInput.trim()}>
                      {isChatLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-serif text-xl mb-2">Selecciona una materia</h3>
                  <p className="text-muted-foreground">
                    Elige una materia de arriba para comenzar a recibir apoyo del asistente de IA
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab: Sesiones Programadas */}
          <TabsContent value="sesiones" className="space-y-4">
            {/* Selector de materia */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Sesiones disponibles
                </CardTitle>
                <CardDescription>
                  Reserva sesiones en vivo con tutores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {materias.map((materia) => (
                    <Button
                      key={materia.id}
                      variant={selectedMateria === materia.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleMateriaChange(materia.id)}
                      className={cn(
                        selectedMateria === materia.id && "bg-primary"
                      )}
                    >
                      {materia.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Lista de sesiones */}
            {selectedMateria ? (
              sessions.length > 0 ? (
                <div className="space-y-4">
                  {sessions.map((session) => (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-serif text-lg">{session.title}</h4>
                              {session.description && (
                                <p className="text-sm text-muted-foreground mt-1">{session.description}</p>
                              )}
                            </div>
                            <Badge variant={session.price_cents > 0 ? 'default' : 'secondary'}>
                              {formatPrice(session.price_cents, session.currency)}
                            </Badge>
                          </div>
                          
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {formatDate(session.scheduled_at)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {session.duration_minutes} min
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {session.spotsRemaining} lugares
                            </span>
                            {session.tutor && (
                              <span className="flex items-center gap-1">
                                👨‍🏫 {session.tutor.full_name}
                              </span>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <Button
                              className="flex-1"
                              disabled={session.isFull || session.isBooked}
                              onClick={() => handleBookSession(session.id)}
                            >
                              {session.isBooked ? (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Ya reservado
                                </>
                              ) : session.isFull ? (
                                'Completo'
                              ) : (
                                'Reservar sesión'
                              )}
                            </Button>
                            {session.meeting_link && session.isBooked && (
                              <Button variant="outline" asChild>
                                <a href={session.meeting_link} target="_blank" rel="noopener noreferrer">
                                  Unirse
                                </a>
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <Card className="text-center py-12">
                  <CardContent>
                    <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-serif text-xl mb-2">No hay sesiones disponibles</h3>
                    <p className="text-muted-foreground">
                      Los tutores aún no han programado sesiones para esta materia.
                    </p>
                  </CardContent>
                </Card>
              )
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-serif text-xl mb-2">Selecciona una materia</h3>
                  <p className="text-muted-foreground">
                    Elige una materia de arriba para ver las sesiones disponibles
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default Tutorias;
