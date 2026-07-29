import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/compartido/lib/supabaseClient';
import { useUserAcademies } from '@/caracteristicas/academia/hooks/useAcademyRole';
import { GraduationCap, Users, BookOpen, ChevronRight } from 'lucide-react';

interface Academy {
  id: string;
  slug: string;
  name: string;
  description: string;
  is_public: boolean;
  role?: string;
  student_count?: number;
}

// Mock data for demo (will be replaced by real data when available)
const CATEGORIES = [
  { id: 'tecnologia', label: 'Tecnología', icon: '💻' },
  { id: 'ciencias', label: 'Ciencias', icon: '🔬' },
  { id: 'humanidades', label: 'Humanidades', icon: '📚' },
  { id: 'salud', label: 'Salud', icon: '🏥' },
  { id: 'negocios', label: 'Negocios', icon: '💼' },
  { id: 'artes', label: 'Artes', icon: '🎨' },
];

export default function Academias() {
  const navigate = useNavigate();
  const { academies: myAcademies, loading: loadingMy } = useUserAcademies();
  const [publicAcademies, setPublicAcademies] = useState<Academy[]>([]);
  const [loadingPublic, setLoadingPublic] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    const fetchPublicAcademies = async () => {
      try {
        const { data, error } = await supabase
          .from('academies')
          .select('id, slug, name, description, is_public')
          .eq('is_public', true)
          .order('created_at', { ascending: false });

        if (error) throw error;
        // Add mock student counts for demo
        const withCounts = (data || []).map((a, i) => ({
          ...a,
          student_count: Math.floor(Math.random() * 500) + 50,
        }));
        setPublicAcademies(withCounts);
      } catch (err) {
        console.error('Error fetching public academies:', err);
      } finally {
        setLoadingPublic(false);
      }
    };

    fetchPublicAcademies();
  }, []);

  const handleCreateAcademy = () => {
    navigate('/academias/crear');
  };

  const handleAcademyClick = (slug: string) => {
    navigate(`/academia/${slug}`);
  };

  const filteredAcademies = selectedCategory
    ? publicAcademies.filter((_, i) => i % 6 === CATEGORIES.findIndex(c => c.id === selectedCategory))
    : publicAcademies;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-uni-primary">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(357_90%_50%/0.15),transparent_50%)]" />
        <div className="relative max-w-6xl mx-auto px-6 py-16 md:py-24">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/90 text-sm font-medium mb-6">
              <GraduationCap className="w-5 h-5" />
              Universidad del Siglo XXI
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
              Explora nuestras Carreras
            </h1>
            <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto">
              Formación de vanguardia con tutoría socrática. Elige tu camino y desarrolla tu pensamiento crítico.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Category Filter */}
        <div className="flex flex-wrap gap-3 mb-10">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              !selectedCategory
                ? 'bg-primary text-white'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            Todas
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                selectedCategory === cat.id
                  ? 'bg-primary text-white'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              <span>{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* My Enrolled Careers */}
        {myAcademies.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <BookOpen className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold">Mis Carreras</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myAcademies.map((academy: any) => (
                <div
                  key={academy.academy_id}
                  onClick={() => handleAcademyClick(academy.slug)}
                  className="card-carrera p-6 cursor-pointer group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                      {academy.name}
                    </h3>
                    <span className="badge-carrera badge-publica">
                      <GraduationCap className="w-3 h-3" />
                      {academy.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {Math.floor(Math.random() * 500) + 50} estudiantes
                    </span>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-primary font-medium">
                    Continuar
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Public Careers Catalog */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <GraduationCap className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold">Carreras Disponibles</h2>
          </div>

          {loadingPublic ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-48 bg-muted animate-pulse rounded-xl" />
              ))}
            </div>
          ) : filteredAcademies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAcademies.map((academy, index) => (
                <div
                  key={academy.id}
                  onClick={() => handleAcademyClick(academy.slug)}
                  className="card-carrera p-6 cursor-pointer group"
                >
                  {/* Header with category */}
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">{CATEGORIES[index % CATEGORIES.length].icon}</span>
                    <span className="text-sm text-muted-foreground">
                      {CATEGORIES[index % CATEGORIES.length].label}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {academy.name}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4 min-h-[2.5rem]">
                    {academy.description || 'Carrera disponible para inscripción inmediata'}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {academy.student_count || Math.floor(Math.random() * 500) + 50}
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      {Math.floor(Math.random() * 8) + 3} asignaturas
                    </span>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <span className="badge-carrera badge-publica">
                      Pública
                    </span>
                    <button className="btn-matricular text-sm py-2 px-4">
                      Matricularme
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card-carrera p-12 text-center">
              <GraduationCap className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No hay carreras en esta categoría</h3>
              <p className="text-muted-foreground mb-6">
                Explora otras categorías o crea tu propia carrera
              </p>
              <button
                onClick={handleCreateAcademy}
                className="btn-secundario"
              >
                Crear Carrera
              </button>
            </div>
          )}
        </section>

        {/* CTA for creating new career */}
        <section className="mt-16">
          <div className="card-carrera-accent p-8 md:p-12 text-center">
            <h3 className="text-2xl md:text-3xl font-bold mb-4">
              ¿No encuentras tu carrera?
            </h3>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              Crea tu propia carrera con tus propias asignaturas, materiales de estudio 
              y configura tu propio Tutor Virtual con personalidad única.
            </p>
            <button
              onClick={handleCreateAcademy}
              className="btn-matricular"
            >
              <GraduationCap className="w-5 h-5" />
              Crear Nueva Carrera
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
