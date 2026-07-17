// Lista de materias con búsqueda y filtro
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, BookOpen, Loader2 } from 'lucide-react';
import { useTutorias, getIcon } from './hooks/useTutorias';
import { Subject } from '@/integrations/supabase/types';
import { Input } from '@/compartido/ui/input';
import { Button } from '@/compartido/ui/button';

export default function ListaMaterias() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { fetchSubjects, loading } = useTutorias();

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    const data = await fetchSubjects();
    setSubjects(data);
  };

  const filteredSubjects = subjects.filter(subject =>
    subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    subject.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl font-serif text-foreground">Materias</h1>
                <p className="text-sm text-muted-foreground">
                  Selecciona una materia para comenzar tu tutoría
                </p>
              </div>
            </div>
            <div className="flex-1 max-w-md ml-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar materias..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredSubjects.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl text-foreground mb-2">
              {searchQuery ? 'No hay materias que coincidan' : 'No hay materias disponibles'}
            </h3>
            <p className="text-muted-foreground">
              {searchQuery ? 'Intenta con otro término de búsqueda' : 'Próximamente habrá más materias'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredSubjects.map((subject, index) => (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  to={`/tutorias/${subject.slug}`}
                  className="group block p-6 bg-card border border-border rounded-xl hover:border-primary/50 transition-all duration-300"
                >
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl mb-4"
                    style={{ backgroundColor: `${subject.color}20` }}
                  >
                    {getIcon(subject.icon)}
                  </div>
                  <h3 className="font-serif text-lg text-foreground mb-2 group-hover:text-primary transition-colors">
                    {subject.name}
                  </h3>
                  {subject.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {subject.description}
                    </p>
                  )}
                  <div className="mt-4 flex items-center gap-2 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Explorar</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-auto py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Sistema de Tutorías con IA · Powered by {import.meta.env.VITE_SUPABASE_PROJECT_ID || 'Supabase'}</p>
        </div>
      </footer>
    </div>
  );
}
