import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/compartido/ui/card';
import { Button } from '@/compartido/ui/button';
import { Loader2, User, LogOut, BookOpen, FolderOpen, MessageCircle, GraduationCap } from 'lucide-react';
import { Badge } from '@/compartido/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/compartido/lib/supabaseClient';
import { cn } from '@/lib/utils';

interface SavedDialogue {
  id: string;
  title: string;
  eje: string | null;
  summary: string | null;
  created_at: string;
  word_count: number | null;
}

interface UploadedMaterial {
  id: string;
  title: string;
  space_name: string | null;
  created_at: string;
  chunk_count: number;
}

/**
 * AcademyProfile - Mis Apuntes: Diálogos guardados + materiales subidos
 */
export default function AcademyProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [dialogues, setDialogues] = useState<SavedDialogue[]>([]);
  const [materials, setMaterials] = useState<UploadedMaterial[]>([]);
  const [loadingContent, setLoadingContent] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/auth');
        return;
      }

      setUser({ email: session.user.email || '' });
      await loadContent(session.user.id);
      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  const loadContent = async (userId: string) => {
    setLoadingContent(true);
    
    // Cargar diálogos guardados
    const { data: dialoguesData } = await supabase
      .from('saved_dialogues')
      .select('id, title, eje, summary, created_at, word_count')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    setDialogues(dialoguesData || []);

    // Cargar materiales subidos (corpus_fragments donde created_by = userId)
    const { data: materialsData } = await supabase
      .from('corpus_fragments')
      .select('id, source_file, space_id, created_at')
      .eq('created_by', userId)
      .order('created_at', { ascending: false });
    
    // Agrupar por archivo
    const materialMap = new Map<string, UploadedMaterial>();
    materialsData?.forEach(frag => {
      const key = frag.source_file || frag.id;
      if (!materialMap.has(key)) {
        materialMap.set(key, {
          id: frag.id,
          title: frag.source_file || 'Material sin nombre',
          space_name: null,
          created_at: frag.created_at,
          chunk_count: 0,
        });
      }
      const existing = materialMap.get(key)!;
      existing.chunk_count++;
    });
    
    setMaterials(Array.from(materialMap.values()));
    setLoadingContent(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: 'Sesión cerrada' });
    navigate('/');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
        <div className="container mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h1 className="font-serif text-3xl">📂 Mis Apuntes</h1>
                  <p className="text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <Button variant="outline" onClick={handleLogout} className="gap-2">
                <LogOut className="w-4 h-4" />
                Cerrar Sesión
              </Button>
            </div>
          </motion.div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Diálogos guardados */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <MessageCircle className="w-6 h-6 text-primary" />
              <h2 className="font-serif text-2xl">Diálogos con el Oráculo</h2>
            </div>
            
            {loadingContent ? (
              <Card className="p-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
              </Card>
            ) : dialogues.length === 0 ? (
              <Card className="p-8 text-center">
                <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-serif text-lg mb-2">Sin diálogos guardados</h3>
                <p className="text-muted-foreground mb-4">
                  Cuando guardes un diálogo desde el Oráculo, aparecerá aquí.
                </p>
                <Button onClick={() => navigate('/academies')}>
                  Ir al Campus
                </Button>
              </Card>
            ) : (
              <div className="space-y-4">
                {dialogues.map((dialogue) => (
                  <motion.div
                    key={dialogue.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-serif text-lg">{dialogue.title}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              {dialogue.eje && (
                                <Badge variant="outline" className="text-xs">
                                  {dialogue.eje}
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {formatDate(dialogue.created_at)}
                              </span>
                              {dialogue.word_count && (
                                <span className="text-xs text-muted-foreground">
                                  · {dialogue.word_count} palabras
                                </span>
                              )}
                            </div>
                            {dialogue.summary && (
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                {dialogue.summary}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </section>

          {/* Materiales subidos */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <FolderOpen className="w-6 h-6 text-primary" />
              <h2 className="font-serif text-2xl">Apuntes Aportados</h2>
            </div>
            
            {loadingContent ? (
              <Card className="p-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
              </Card>
            ) : materials.length === 0 ? (
              <Card className="p-8 text-center">
                <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-serif text-lg mb-2">Sin materiales subidos</h3>
                <p className="text-muted-foreground mb-4">
                  Cuando aportes apuntes a una materia, aparecerán aquí 
                  y formarán parte del conocimiento colectivo.
                </p>
                <Button onClick={() => navigate('/academies')}>
                  Explorar Carreras
                </Button>
              </Card>
            ) : (
              <div className="space-y-4">
                {materials.map((material) => (
                  <motion.div
                    key={material.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className="hover:border-primary/50 transition-colors">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <BookOpen className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-serif">{material.title}</h3>
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                <span>{material.chunk_count} fragmentos</span>
                                <span>·</span>
                                <span>{formatDate(material.created_at)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Info adicional */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-12"
        >
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <GraduationCap className="w-6 h-6 text-primary flex-shrink-0" />
                <div>
                  <h3 className="font-serif text-lg mb-2">¿Por qué Mis Apuntes?</h3>
                  <p className="text-sm text-muted-foreground">
                    Aquí se guardan tus diálogos con el Oráculo y los materiales que has contribuido 
                    al conocimiento de las carreras. Tus apuntes no solo te pertenecen — cuando 
                    los aportas, enriquecen el aprendizaje de toda la comunidad.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
