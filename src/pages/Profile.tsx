import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { LagrangeNav } from '@/components/LagrangeNav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, MessageSquare, User, LogOut, Calendar, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface SavedDialogue {
  id: string;
  title: string;
  eje: string | null;
  summary: string | null;
  created_at: string;
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
  const [dialogues, setDialogues] = useState<SavedDialogue[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/auth');
        return;
      }

      setUser({ email: session.user.email || '' });
      
      // Fetch user's dialogues
      const { data, error } = await supabase
        .from('saved_dialogues')
        .select('id, title, eje, summary, created_at')
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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
                  Mis Diálogos Guardados
                </CardTitle>
                <CardDescription>
                  Diálogos socráticos que has guardado durante tus sesiones en la Academia
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dialogues.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">
                      No tienes diálogos guardados aún
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
              Como usuario registrado, puedes guardar tus diálogos socráticos y generar textos 
              narrativos basados en ellos. Tus diálogos son privados y solo tú puedes acceder a ellos.
            </p>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
