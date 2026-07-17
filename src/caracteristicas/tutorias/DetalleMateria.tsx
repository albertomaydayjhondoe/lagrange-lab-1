// Detalle de materia con chat de tutoría IA
import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, Loader2, Sparkles, BookOpen, MessageSquare } from 'lucide-react';
import { supabase } from '@/compartido/lib/supabaseClient';
import { useTutorias, getIcon, formatPrice, formatDate } from './hooks/useTutorias';
import { Subject, SessionWithDetails, TutoringResponse } from '@/integrations/supabase/types';
import { Button } from '@/compartido/ui/button';
import { Input } from '@/compartido/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/compartido/ui/tabs';
import { Badge } from '@/compartido/ui/badge';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    materials_used?: number;
    rag_context_used?: boolean;
  };
}

export default function DetalleMateria() {
  const { slug } = useParams<{ slug: string }>();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [sessions, setSessions] = useState<SessionWithDetails[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { fetchSubjects, fetchSessions, bookSession, askQuestion, loading } = useTutorias();

  useEffect(() => {
    loadData();
  }, [slug]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadData = async () => {
    if (!slug) return;
    
    // Cargar materias
    const subjects = await fetchSubjects();
    const foundSubject = subjects.find(s => s.slug === slug);
    setSubject(foundSubject || null);

    // Cargar sesiones
    if (foundSubject) {
      const sessionData = await fetchSessions({ subjectId: foundSubject.id, limit: 10 });
      setSessions(sessionData);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !subject || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      const history = messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      const response: TutoringResponse = await askQuestion(
        subject.id,
        userMessage.content,
        { conversationHistory: history }
      );

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
        metadata: {
          materials_used: response.materials_used,
          rag_context_used: response.rag_context_used,
        },
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Lo siento, hubo un error: ${error.message || 'Error desconocido'}. Asegúrate de que AI_API_KEY esté configurada en Supabase.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleBookSession = async (sessionId: string) => {
    try {
      const result = await bookSession(sessionId);
      if (result.success) {
        alert('¡Sesión reservada! ' + (result.payment?.requiresPayment ? 'Ahora puedes proceder al pago.' : ''));
        loadData(); // Recargar sesiones
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  if (!subject) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              to="/tutorias"
              className="p-2 hover:bg-accent rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
              style={{ backgroundColor: `${subject.color}20` }}
            >
              {getIcon(subject.icon)}
            </div>
            <div>
              <h1 className="text-xl font-serif text-foreground">{subject.name}</h1>
              <p className="text-sm text-muted-foreground">
                Tutoría inteligente con IA
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <Tabs defaultValue="chat" className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0">
          <TabsTrigger
            value="chat"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Chat IA
          </TabsTrigger>
          <TabsTrigger
            value="sessions"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Sesiones ({sessions.length})
          </TabsTrigger>
        </TabsList>

        {/* Chat Tab */}
        <TabsContent value="chat" className="flex-1 flex flex-col m-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12"
              >
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-serif text-foreground mb-2">
                  Asistente de {subject.name}
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Puedo ayudarte con cualquier tema de {subject.name}. 
                  Tengo acceso a materiales de referencia para darte respuestas precisas.
                  {subject.description && ` ${subject.description}`}
                </p>
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  <Badge variant="outline">💡 Explicaciones claras</Badge>
                  <Badge variant="outline">📚 Basado en materiales</Badge>
                  <Badge variant="outline">🎯 Preguntas de práctica</Badge>
                </div>
              </motion.div>
            )}

            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border border-border'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.metadata && message.role === 'assistant' && (
                    <div className="mt-2 pt-2 border-t border-border/50 text-xs text-muted-foreground flex gap-2">
                      {message.metadata.materials_used && (
                        <span>📚 {message.metadata.materials_used} materiales</span>
                      )}
                      {message.metadata.rag_context_used && (
                        <Badge variant="outline" className="text-xs">RAG activo</Badge>
                      )}
                    </div>
                  )}
                  <p className={`text-xs mt-1 ${
                    message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </motion.div>
            ))}

            {isTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="bg-card border border-border rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t p-4 bg-card/50">
            <div className="container mx-auto max-w-4xl">
              <div className="flex gap-2">
                <Input
                  placeholder={`Pregunta sobre ${subject.name}...`}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  disabled={isTyping}
                  className="flex-1"
                />
                <Button onClick={handleSendMessage} disabled={isTyping || !inputValue.trim()}>
                  {isTyping ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Presiona Enter para enviar · Shift+Enter para nueva línea
              </p>
            </div>
          </div>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="flex-1 m-0 p-4">
          <div className="container mx-auto max-w-4xl">
            {sessions.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl text-foreground mb-2">No hay sesiones disponibles</h3>
                <p className="text-muted-foreground">
                  Los tutores aún no han programado sesiones para esta materia.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {sessions.map((session) => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card border border-border rounded-xl p-4"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-serif text-foreground">{session.title}</h4>
                        {session.description && (
                          <p className="text-sm text-muted-foreground mt-1">{session.description}</p>
                        )}
                      </div>
                      <Badge variant={session.price_cents > 0 ? 'default' : 'secondary'}>
                        {formatPrice(session.price_cents, session.currency)}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                      <span>📅 {formatDate(session.scheduled_at)}</span>
                      <span>⏱️ {session.duration_minutes} min</span>
                      <span>👥 {session.spotsRemaining} lugares</span>
                      {session.tutor && (
                        <span>👨‍🏫 {session.tutor.full_name}</span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        disabled={session.isFull || session.isBooked}
                        onClick={() => handleBookSession(session.id)}
                      >
                        {session.isBooked ? 'Ya reservado' : session.isFull ? 'Completo' : 'Reservar'}
                      </Button>
                      {session.meeting_link && (
                        <Button variant="outline" asChild>
                          <a href={session.meeting_link} target="_blank" rel="noopener noreferrer">
                            Unirse
                          </a>
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
