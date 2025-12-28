import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { LagrangeNav } from '@/components/LagrangeNav';
import { LagrangeFooter } from '@/components/LagrangeFooter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, MessageSquare, User, LogOut, Calendar, BookOpen, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

const ADMIN_EMAIL = 'sampayo@gmail.com';

interface DialogueEntry {
  type: 'oracle' | 'user';
  content: string;
  question?: {
    pregunta: string;
    eje: string;
    nivel: number;
    tension: number;
    conexion?: string;
  };
  timestamp: string;
}

interface SavedDialogue {
  id: string;
  title: string;
  eje: string | null;
  summary: string | null;
  created_at: string;
  dialogue_content: Json;
}

const ejeColors: Record<string, string> = {
  Miedo: 'bg-red-500/20 text-red-400 border-red-500/30',
  Control: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  SaludMental: 'bg-green-500/20 text-green-400 border-green-500/30',
  Legitimidad: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  Responsabilidad: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

const Profile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dialogues, setDialogues] = useState<SavedDialogue[]>([]);
  const [selectedDialogue, setSelectedDialogue] = useState<SavedDialogue | null>(null);
  const [showDialogueModal, setShowDialogueModal] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/auth');
        return;
      }

      const userEmail = session.user.email || '';
      setUser({ email: userEmail });
      setIsAdmin(userEmail === ADMIN_EMAIL);
      
      // Fetch dialogues - admin sees all, users see their own
      const { data, error } = await supabase
        .from('saved_dialogues')
        .select('id, title, eje, summary, created_at, dialogue_content')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching dialogues:', error);
        toast.error('Error al cargar los diálogos');
      } else {
        setDialogues(data || []);
      }

      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Sesión cerrada');
    navigate('/');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const openDialogueView = (dialogue: SavedDialogue) => {
    setSelectedDialogue(dialogue);
    setShowDialogueModal(true);
  };

  const parseDialogueContent = (content: Json): DialogueEntry[] => {
    if (Array.isArray(content)) {
      return content as unknown as DialogueEntry[];
    }
    return [];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <LagrangeNav />
      
      <main className="pt-24 pb-12 px-6">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h1 className="font-serif text-3xl text-foreground">Mi Perfil</h1>
                  <p className="text-muted-foreground">{user?.email}</p>
                  {isAdmin && (
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-mono">
                      Administrador
                    </span>
                  )}
                </div>
              </div>
              <Button variant="outline" onClick={handleLogout} className="gap-2">
                <LogOut className="w-4 h-4" />
                Cerrar Sesión
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="font-serif flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  {isAdmin ? 'Todos los Diálogos (Anónimos)' : 'Mis Diálogos Guardados'}
                </CardTitle>
                <CardDescription>
                  {isAdmin 
                    ? 'Vista administrativa de todos los diálogos del sistema (datos anónimos)'
                    : 'Diálogos socráticos que has guardado durante tus sesiones en la Academia'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dialogues.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">
                      No hay diálogos guardados
                    </p>
                    <Button variant="outline" onClick={() => navigate('/lab')}>
                      Ir a la Academia
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {dialogues.map((dialogue) => (
                      <motion.div
                        key={dialogue.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-4 rounded-lg border border-border/50 hover:border-primary/30 transition-colors bg-card/50"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-serif text-lg text-foreground">
                                {dialogue.title}
                              </h3>
                              {dialogue.eje && (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-mono border ${
                                  ejeColors[dialogue.eje] || 'bg-primary/10 text-primary border-primary/30'
                                }`}>
                                  {dialogue.eje}
                                </span>
                              )}
                              {isAdmin && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-muted text-muted-foreground flex items-center gap-1">
                                  <EyeOff className="w-3 h-3" />
                                  Anónimo
                                </span>
                              )}
                            </div>
                            {dialogue.summary && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                {dialogue.summary}
                              </p>
                            )}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              {formatDate(dialogue.created_at)}
                            </div>
                          </div>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDialogueView(dialogue)}
                              className="gap-2"
                            >
                              <Eye className="w-4 h-4" />
                              Ver
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-8 p-6 rounded-xl bg-secondary/20 border border-border/50"
          >
            <h3 className="font-serif text-lg text-foreground mb-2">
              Sobre tu cuenta
            </h3>
            <p className="text-muted-foreground text-sm">
              {isAdmin 
                ? 'Como administrador, puedes ver todos los diálogos del sistema de forma anónima, exportar contenido y gestionar el corpus.'
                : 'Como usuario registrado, puedes guardar tus diálogos socráticos y generar textos narrativos basados en ellos. Tus diálogos son privados y solo tú puedes acceder a ellos.'
              }
            </p>
          </motion.div>
        </div>
      </main>

      {/* Dialogue View Modal - Admin Only */}
      <Dialog open={showDialogueModal} onOpenChange={setShowDialogueModal}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              {selectedDialogue?.title}
              {selectedDialogue?.eje && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-mono border ${
                  ejeColors[selectedDialogue.eje] || 'bg-primary/10 text-primary border-primary/30'
                }`}>
                  {selectedDialogue.eje}
                </span>
              )}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              <EyeOff className="w-3 h-3" />
              Vista anónima - No se muestra información del usuario
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-4">
              {selectedDialogue && parseDialogueContent(selectedDialogue.dialogue_content).map((entry, index) => (
                <div
                  key={index}
                  className={`flex ${entry.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {entry.type === 'oracle' && entry.question ? (
                    <div className="max-w-[85%] space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-mono border ${
                          ejeColors[entry.question.eje] || 'bg-primary/10 text-primary border-primary/30'
                        }`}>
                          {entry.question.eje}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          Nivel {entry.question.nivel}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          Tensión: {(entry.question.tension * 100).toFixed(0)}%
                        </span>
                      </div>
                      <blockquote className="bg-card/50 border border-border/50 rounded-lg p-4 font-serif text-base leading-relaxed">
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
                      <p className="text-foreground text-sm">{entry.content}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
      
      <LagrangeFooter />
    </div>
  );
};

export default Profile;
