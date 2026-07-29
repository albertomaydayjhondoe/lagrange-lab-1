/**
 * MisMaterias - Lista de materias de la carrera activa
 * 
 * Muestra las materias de la carrera seleccionada con acceso directo a:
 * - Preguntar (Oráculo)
 * - Tutorías
 * - Aportar apuntes (RAG)
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  BookOpen,           // Materia
  MessageCircle,       // Preguntar
  GraduationCap,        // Tutorías
  Upload,              // Aportar apuntes
  Loader2,
  ChevronRight,
  FolderOpen,
  FileText
} from 'lucide-react';
import { Button } from '@/compartido/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/compartido/ui/card';
import { Badge } from '@/compartido/ui/badge';
import { supabase } from '@/compartido/lib/supabaseClient';
import { fetchAcademySpaces, AcademySpace } from '@/compartido/lib/academySpacesService';
import { toast } from '@/hooks/use-toast';

interface Academy {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  role?: string | null;
  is_member?: boolean;
}

export function MisMaterias() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  const [academy, setAcademy] = useState<Academy | null>(null);
  const [materias, setMaterias] = useState<AcademySpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [userSources, setUserSources] = useState<Record<string, number>>({});

  useEffect(() => {
    if (slug) {
      loadData();
    }
  }, [slug]);

  const loadData = async () => {
    setLoading(true);
    
    // Cargar info de la academia
    const { data: academiesData } = await supabase.functions.invoke('list-academies');
    const userAcademies = (academiesData?.academies || []).filter((a: Academy) => a.is_member);
    const currentAcademy = userAcademies.find((a: Academy) => a.slug === slug);
    
    if (!currentAcademy) {
      toast({ title: 'No tienes acceso a esta carrera', variant: 'destructive' });
      navigate('/academies');
      return;
    }
    
    setAcademy(currentAcademy);

    // Cargar materias (academy_spaces)
    const spaces = await fetchAcademySpaces(currentAcademy.id);
    setMaterias(spaces.filter(s => !s.parent_space_id)); // Solo materias raíz

    // Cargar conteo de fuentes del usuario por materia
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: sources } = await supabase
        .from('corpus_fragments')
        .select('space_id')
        .eq('academy_id', currentAcademy.id)
        .eq('created_by', session.user.id);
      
      // Contar fuentes por space_id
      const counts: Record<string, number> = {};
      sources?.forEach(s => {
        if (s.space_id) {
          counts[s.space_id] = (counts[s.space_id] || 0) + 1;
        }
      });
      setUserSources(counts);
    }

    setLoading(false);
  };

  // Formatear color para contraste
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

  if (!academy) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md text-center">
          <CardHeader>
            <CardTitle>Sin acceso</CardTitle>
            <CardDescription>
              No tienes permiso para ver esta carrera.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/academies')}>
              Volver al Campus
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header de la carrera */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Badge variant="outline" className="mb-2">
              <GraduationCap className="w-3 h-3 mr-1" />
              Carrera activa
            </Badge>
            <h1 className="font-serif text-3xl md:text-4xl mb-2">
              {academy.name}
            </h1>
            {academy.description && (
              <p className="text-muted-foreground max-w-2xl">
                {academy.description}
              </p>
            )}
          </motion.div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="container mx-auto px-4 py-8">
        {/* Accesos rápidos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card 
              className="cursor-pointer hover:border-primary/50 transition-colors h-full"
              onClick={() => navigate(`/carrera/${slug}/oraculo`)}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-serif text-lg mb-1">💬 Preguntar al Oráculo</h3>
                    <p className="text-sm text-muted-foreground">
                      Diálogo socrático sobre cualquier tema de la carrera.
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card 
              className="cursor-pointer hover:border-primary/50 transition-colors h-full"
              onClick={() => navigate(`/carrera/${slug}/tutorias`)}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <GraduationCap className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-serif text-lg mb-1">🎓 Tutorías</h3>
                    <p className="text-sm text-muted-foreground">
                      Reserva sesiones con tutores y accede al apoyo de IA.
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card 
              className="cursor-pointer hover:border-primary/50 transition-colors h-full"
              onClick={() => navigate('/perfil')}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FolderOpen className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-serif text-lg mb-1">📂 Mis Apuntes</h3>
                    <p className="text-sm text-muted-foreground">
                      Diálogos guardados y materiales que has aportado.
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Lista de materias */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-2xl flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-primary" />
              Materias de la carrera
            </h2>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate(`/carrera/${slug}/gestionar`)}
              className="text-amber-500 border-amber-500/50 hover:bg-amber-500/10"
            >
              Gestionar
            </Button>
          </div>

          {materias.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-serif text-xl mb-2">Sin materias aún</h3>
                <p className="text-muted-foreground mb-4">
                  Esta carrera aún no tiene materias definidas.
                  {academy.role === 'owner' && ' Puedes crearlas desde "Gestionar".'}
                </p>
                {academy.role === 'owner' && (
                  <Button onClick={() => navigate(`/carrera/${slug}/gestionar`)}>
                    Crear primera materia
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {materias.map((materia, index) => (
                <motion.div
                  key={materia.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                >
                  <Card className="h-full hover:border-primary/50 transition-all duration-300 group">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                          style={{ 
                            backgroundColor: `${materia.color}20`,
                            color: materia.color
                          }}
                        >
                          <BookOpen className="w-5 h-5" />
                        </div>
                        {userSources[materia.id] ? (
                          <Badge variant="outline" className="text-xs">
                            <FileText className="w-3 h-3 mr-1" />
                            {userSources[materia.id]} apuntes
                          </Badge>
                        ) : null}
                      </div>
                      <CardTitle className="mt-3 font-serif">
                        {materia.name}
                      </CardTitle>
                      {materia.description && (
                        <CardDescription className="line-clamp-2">
                          {materia.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => navigate(`/carrera/${slug}/oraculo?materia=${materia.id}`)}
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Preguntar sobre esto
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => navigate(`/carrera/${slug}/tutorias?materia=${materia.id}`)}
                        >
                          <GraduationCap className="w-4 h-4 mr-2" />
                          Tutorías
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="w-full justify-start text-primary"
                          onClick={() => navigate(`/carrera/${slug}/materia/${materia.id}/aportar`)}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Aportar apuntes
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default MisMaterias;
