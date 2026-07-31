import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  GraduationCap, 
  BookOpen, 
  Calculator, 
  Scroll, 
  Brain, 
  Globe, 
  Landmark, 
  TrendingUp, 
  Zap,
  ChevronRight,
  Loader2,
  Users,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/compartido/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/compartido/ui/card';
import { Badge } from '@/compartido/ui/badge';
import { supabase } from '@/compartido/lib/supabaseClient';
import { toast } from '@/hooks/use-toast';

interface Materia {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon_color: string;
}

interface MateriaInfo {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: typeof BookOpen;
  color: string;
  materia_count: number;
  student_count: number;
}

// Materias PAAU disponibles
const MATERIAS_PAAU: MateriaInfo[] = [
  {
    id: '10000000-0000-0000-0000-000000000001',
    slug: 'paau/lengua',
    name: 'Lengua Castellana',
    description: 'Análisis lingüístico, literatura y expresión escrita para la selectividad.',
    icon: BookOpen,
    color: '#7C3AED',
    materia_count: 12,
    student_count: 234,
  },
  {
    id: '10000000-0000-0000-0000-000000000002',
    slug: 'paau/historia',
    name: 'Historia de España',
    description: 'Historia de España desde el siglo XIX hasta la actualidad para la prueba de selectividad.',
    icon: Scroll,
    color: '#F59E0B',
    materia_count: 15,
    student_count: 189,
  },
  {
    id: '10000000-0000-0000-0000-000000000003',
    slug: 'paau/matematicas',
    name: 'Matemáticas',
    description: 'Matemáticas II para ciencias e ingeniería. Análisis, álgebra y geometría.',
    icon: Calculator,
    color: '#059669',
    materia_count: 18,
    student_count: 312,
  },
  {
    id: '10000000-0000-0000-0000-000000000004',
    slug: 'paau/filosofia',
    name: 'Filosofía',
    description: 'Historia de la filosofía y problemas fundamentales del pensamiento.',
    icon: Brain,
    color: '#3B82F6',
    materia_count: 10,
    student_count: 156,
  },
  {
    id: '10000000-0000-0000-0000-000000000005',
    slug: 'paau/ingles',
    name: 'Inglés',
    description: 'English language preparation for university entrance exams.',
    icon: Globe,
    color: '#EC4899',
    materia_count: 8,
    student_count: 267,
  },
  {
    id: '10000000-0000-0000-0000-000000000006',
    slug: 'paau/latino',
    name: 'Latín',
    description: 'Gramática, vocabulario y traducción del latín para la selectividad.',
    icon: Landmark,
    color: '#8B5CF6',
    materia_count: 9,
    student_count: 98,
  },
  {
    id: '10000000-0000-0000-0000-000000000007',
    slug: 'paau/economia',
    name: 'Economía',
    description: 'Fundamentos de economía, mercado, oferta y demanda para selectividad.',
    icon: TrendingUp,
    color: '#10B981',
    materia_count: 7,
    student_count: 145,
  },
  {
    id: '10000000-0000-0000-0000-000000000008',
    slug: 'paau/fisica',
    name: 'Física',
    description: 'Física para selectividad. Mecánica, electromagnetismo y ondas.',
    icon: Zap,
    color: '#F97316',
    materia_count: 14,
    student_count: 201,
  },
];

export function PAAUPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [enrolledIds, setEnrolledIds] = useState<string[]>([]);

  const ACADEMIA_SLUG = 'academia-lexis';
  const ACADEMIA_NAME = 'Academia Lexis';
  const ACADEMIA_ID = '00000000-0000-0000-0000-000000000001';

  const handleSelectMateria = (materia: MateriaInfo) => {
    // Navegar a la materia específica
    navigate(`/carrera/${ACADEMIA_SLUG}/materia/${materia.slug}/aportar`);
  };

  const handleOraculo = () => {
    // Navegar al oráculo de la academia
    navigate(`/carrera/${ACADEMIA_SLUG}/oraculo`);
  };

  const getContrastColor = (hexColor: string): string => {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#FFFFFF';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(var(--primary)/0.15),transparent_50%)]" />
        <div className="relative max-w-6xl mx-auto px-6 py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            {/* Logo */}
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/20 flex items-center justify-center mb-6">
              <span className="font-serif text-4xl text-primary">λ</span>
            </div>
            
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <GraduationCap className="w-4 h-4" />
              Preparación Selectividad
            </div>
            
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Academia Lexis
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Formación de vanguardia con tutoría socrática. Elige tu materia y desarrolla tu pensamiento crítico para superar la selectividad.
            </p>
            
            {/* Stats */}
            <div className="flex justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <span>8 materias</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span>+1,500 estudiantes</span>
              </div>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Oráculo CTA */}
      <section className="py-8 px-6 border-b border-border/50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 rounded-xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-4"
          >
            <div>
              <h2 className="font-serif text-2xl md:text-3xl font-bold mb-2">
                Oráculo Socrático
              </h2>
              <p className="text-muted-foreground">
                Un diálogo que te desafía a pensar, no a consumir respuestas.
              </p>
            </div>
            <Button 
              onClick={handleOraculo}
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Brain className="w-5 h-5 mr-2" />
              Preguntar al Oráculo
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Materias */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-8">
          <BookOpen className="w-6 h-6 text-primary" />
          <h2 className="font-serif text-2xl md:text-3xl font-bold">
            Materias PAAU
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {MATERIAS_PAAU.map((materia, index) => {
            const IconComponent = materia.icon;
            return (
              <motion.div
                key={materia.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  className="h-full cursor-pointer group hover:shadow-lg hover:border-primary/50 transition-all duration-300"
                  onClick={() => handleSelectMateria(materia)}
                >
                  {/* Color header */}
                  <div 
                    className="h-2 w-full rounded-t-xl"
                    style={{ backgroundColor: materia.color }}
                  />
                  
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${materia.color}20` }}
                      >
                        <IconComponent 
                          className="w-6 h-6" 
                          style={{ color: materia.color }}
                        />
                      </div>
                      {enrolledIds.includes(materia.id) && (
                        <Badge className="bg-green-500">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Inscrito
                        </Badge>
                      )}
                    </div>
                    
                    <CardTitle className="font-serif mt-3 text-lg">
                      {materia.name}
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {materia.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        {materia.materia_count} temas
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {materia.student_count}
                      </span>
                    </div>

                    {/* Button */}
                    <Button 
                      className="w-full group-hover:gap-2 transition-all"
                      style={{ 
                        backgroundColor: materia.color,
                        color: getContrastColor(materia.color)
                      }}
                    >
                      {enrolledIds.includes(materia.id) ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Continuar
                        </>
                      ) : (
                        <>
                          Estudiar
                          <ChevronRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Info adicional */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-16 text-center"
        >
          <Card className="max-w-2xl mx-auto bg-muted/50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4 text-left">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-serif text-lg mb-2">¿Qué encontrarás aquí?</h3>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-primary">💬</span>
                      <span><strong>Oráculo Socrático:</strong> Un diálogo que te desafía a pensar, no a consumir respuestas.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">📚</span>
                      <span><strong>Materiales RAG:</strong> Apuntes y recursos organizados por materia.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">✍️</span>
                      <span><strong>Aporta tu conocimiento:</strong> Comparte tus apuntes para enriquecer el aprendizaje colectivo.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border/50">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-muted-foreground font-serif text-sm">
            Academia Lexis · λ · Preparación para selectividad y oposiciones
          </p>
        </div>
      </footer>
    </div>
  );
}

export default PAAUPage;
