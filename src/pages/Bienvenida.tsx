/**
 * Bienvenida - Página de bienvenida para nuevos usuarios
 * 
 * Muestra las academias de ejemplo pre-cargadas para que el usuario
 * pueda inscribirse inmediatamente y tener una experiencia viva desde el primer momento.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  GraduationCap, 
  Users, 
  BookOpen, 
  Sparkles,
  ChevronRight,
  Loader2,
  CheckCircle,
  Lock
} from 'lucide-react';
import { Button } from '@/compartido/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/compartido/ui/card';
import { Badge } from '@/compartido/ui/badge';
import { supabase } from '@/compartido/lib/supabaseClient';
import { toast } from '@/hooks/use-toast';

interface SampleAcademy {
  id: string;
  name: string;
  slug: string;
  description: string;
  materia_count: number;
  student_count: number;
  materias_destacadas: string[];
  color: string;
}

// Academias de ejemplo pre-cargadas (seed data)
const SAMPLE_ACADEMIES: SampleAcademy[] = [
  {
    id: 'sample-philosophy',
    name: 'Facultad de Filosofía',
    slug: 'filosofia',
    description: 'Explora las grandes preguntas del pensamiento humano. Del ser al deber ser, de la lógica a la ética.',
    materia_count: 4,
    student_count: 128,
    materias_destacadas: ['Metafísica', 'Lógica', 'Ética', 'Epistemología'],
    color: '#7C3AED',
  },
  {
    id: 'sample-sciences',
    name: 'Facultad de Ciencias',
    slug: 'ciencias',
    description: 'Método, experimentación y la belleza de descubrir cómo funciona el universo.',
    materia_count: 3,
    student_count: 245,
    materias_destacadas: ['Física Cuántica', 'Biología Molecular', 'Matemáticas Puras'],
    color: '#059669',
  },
  {
    id: 'sample-literature',
    name: 'Facultad de Literatura',
    slug: 'literatura',
    description: 'Palabras que transforman. Analiza, interpreta y crea a través de la expresión literaria.',
    materia_count: 3,
    student_count: 89,
    materias_destacadas: ['Poesía Moderna', 'Narrativa Contemporánea', 'Teoría Literaria'],
    color: '#DC2626',
  },
  {
    id: 'sample-history',
    name: 'Facultad de Historia',
    slug: 'historia',
    description: 'El pasado ilumina el presente. Comprende las civilizations que nos precedieron.',
    materia_count: 3,
    student_count: 156,
    materias_destacadas: ['Historia Antigua', 'Edad Media', 'Historia Contemporánea'],
    color: '#F59E0B',
  },
  {
    id: 'sample-psychology',
    name: 'Facultad de Psicología',
    slug: 'psicologia',
    description: 'La mente humana es el último frontera. Explora la conducta, la cognición y la emoción.',
    materia_count: 2,
    student_count: 112,
    materias_destacadas: ['Psicología Cognitiva', 'Neurociencia'],
    color: '#3B82F6',
  },
];

export function Bienvenida() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [enrolledIds, setEnrolledIds] = useState<string[]>([]);
  const [existingAcademies, setExistingAcademies] = useState<string[]>([]);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      
      if (session?.user) {
        setUserEmail(session.user.email);
        
        // Cargar academias donde ya está inscrito
        const { data: academiesData } = await supabase.functions.invoke('list-academies');
        const userAcademies = (academiesData?.academies || []).filter((a: any) => a.is_member);
        setExistingAcademies(userAcademies.map((a: any) => a.id));
        
        // Si ya tiene carreras, redirigir
        if (userAcademies.length > 0) {
          navigate(`/carrera/${userAcademies[0].slug}`);
        }
      }
      
      setLoading(false);
    };

    checkSession();
  }, []);

  const handleInscribirse = async (academy: SampleAcademy) => {
    if (!isAuthenticated) {
      toast({ title: 'Inicia sesión para inscribirte', variant: 'destructive' });
      navigate('/auth');
      return;
    }

    setEnrollingId(academy.id);

    try {
      // Verificar si la academia existe en la BD
      const { data: existingAcademy } = await supabase
        .from('academies')
        .select('id, slug')
        .eq('slug', academy.slug)
        .maybeSingle();

      if (!existingAcademy) {
        // Crear academia de ejemplo
        const { data: newAcademy, error: createError } = await supabase
          .from('academies')
          .insert({
            name: academy.name,
            slug: academy.slug,
            description: academy.description,
            is_public: true,
            oracle_persona_prompt: `Eres un oráculo filosófico de la ${academy.name}. Desafías al estudiante a pensar más allá de lo obvio.`,
          })
          .select()
          .single();

        if (createError) throw createError;

        // Inscribirse como member
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await supabase
            .from('academy_members')
            .insert({
              academy_id: newAcademy.id,
              user_id: session.user.id,
              role: 'member',
            });
        }
      } else {
        // Ya existe, solo inscribirse
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { error: memberError } = await supabase
            .from('academy_members')
            .insert({
              academy_id: existingAcademy.id,
              user_id: session.user.id,
              role: 'member',
            });

          // Ignorar error si ya está inscrito
          if (memberError && !memberError.message.includes('already')) {
            throw memberError;
          }
        }
      }

      setEnrolledIds(prev => [...prev, academy.id]);
      toast({ 
        title: `¡Inscrito en ${academy.name}!`,
        description: 'Ya puedes acceder a sus materias.'
      });

      // Redirigir a la primera inscrita o a Campus
      setTimeout(() => {
        navigate(`/carrera/${academy.slug}`);
      }, 1000);

    } catch (error: any) {
      console.error('Error enrolling:', error);
      toast({ 
        title: 'Error al inscribirse',
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setEnrollingId(null);
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
        <div className="container mx-auto px-4 py-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <span className="font-serif text-3xl text-primary">λ</span>
            </div>
            <h1 className="font-serif text-3xl md:text-4xl mb-2">
              Bienvenido al Campus
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {isAuthenticated 
                ? 'Elige una carrera para comenzar tu viaje de aprendizaje.'
                : 'Inicia sesión o explora las carreras disponibles para inscribirte.'}
            </p>
            {isAuthenticated && userEmail && (
              <Badge variant="outline" className="mt-2">
                {userEmail}
              </Badge>
            )}
          </motion.div>
        </div>
      </header>

      {/* Carreras disponibles */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-2xl flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-primary" />
            Carreras Disponibles
          </h2>
          {!isAuthenticated && (
            <Button onClick={() => navigate('/auth')} size="sm">
              <Lock className="w-4 h-4 mr-2" />
              Iniciar Sesión para Inscribirse
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SAMPLE_ACADEMIES.map((academy, index) => (
            <motion.div
              key={academy.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full hover:border-primary/50 transition-all duration-300 group overflow-hidden">
                {/* Header con color */}
                <div 
                  className="h-2 w-full"
                  style={{ backgroundColor: academy.color }}
                />
                
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${academy.color}20` }}
                    >
                      <GraduationCap 
                        className="w-6 h-6" 
                        style={{ color: academy.color }}
                      />
                    </div>
                    {enrolledIds.includes(academy.id) && (
                      <Badge className="bg-green-500">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Inscrito
                      </Badge>
                    )}
                  </div>
                  
                  <CardTitle className="font-serif mt-3">
                    {academy.name}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {academy.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Materias destacadas */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      Materias
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {academy.materias_destacadas.map((m) => (
                        <Badge key={m} variant="outline" className="text-xs">
                          {m}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      {academy.materia_count} materias
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {academy.student_count} estudiantes
                    </span>
                  </div>

                  {/* Botón */}
                  <Button 
                    className="w-full group-hover:gap-3 transition-all"
                    disabled={enrollingId === academy.id || enrolledIds.includes(academy.id)}
                    onClick={() => handleInscribirse(academy)}
                    style={{ 
                      backgroundColor: enrolledIds.includes(academy.id) ? '#22c55e' : academy.color,
                      color: getContrastColor(academy.color)
                    }}
                  >
                    {enrollingId === academy.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Inscribiéndose...
                      </>
                    ) : enrolledIds.includes(academy.id) ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Inscrito
                      </>
                    ) : (
                      <>
                        Inscribirme
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Info adicional */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >
          <Card className="max-w-2xl mx-auto bg-muted/50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4 text-left">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-serif text-lg mb-2">¿Qué encontrarás aquí?</h3>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-primary">💬</span>
                      <span><strong>Oráculo Socrático:</strong> Un diálogo que te desafía a pensar, no a consumir respuestas.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">🎓</span>
                      <span><strong>Tutorías:</strong> Sesiones con tutores y apoyo de IA para profundizar en cada materia.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">📚</span>
                      <span><strong>Conocimiento colectivo:</strong> Los apuntes que aportes enriquecerán el aprendizaje de todos.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}

export default Bienvenida;
