import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, Users, Plus, Lock, Globe } from 'lucide-react';

interface Academy {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  role?: string | null;
  is_member?: boolean;
}

export default function AcademiesList() {
  const { data: academiesData, isLoading } = useQuery({
    queryKey: ['academies'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('list-academies');
      if (error) throw error;
      return data;
    },
  });

  const academies = academiesData?.academies || [];
  const userId = academiesData?.userId;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white/50 animate-pulse">Cargando academias...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <header className="border-b border-white/10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GraduationCap className="w-8 h-8 text-white" />
              <div>
                <h1 className="text-2xl font-serif text-white">Academias</h1>
                <p className="text-white/50 text-sm">Explora las academias socráticas disponibles</p>
              </div>
            </div>
            <Link
              to="/academies/create"
              className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg hover:bg-white/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Crear academia
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Tus academias */}
        {academies.filter((a: Academy) => a.is_member).length > 0 && (
          <section className="mb-12">
            <h2 className="text-lg font-serif text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Tus academias
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {academies.filter((a: Academy) => a.is_member).map((academy: Academy) => (
                <motion.div
                  key={academy.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Link
                    to={`/academia/${academy.slug}`}
                    className="block p-6 bg-card/50 border border-border rounded-xl hover:border-white/20 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-serif text-lg text-white">{academy.name}</h3>
                      <span className="px-2 py-1 text-xs bg-white/10 text-white/70 rounded">
                        {academy.role}
                      </span>
                    </div>
                    {academy.description && (
                      <p className="text-white/50 text-sm mb-4 line-clamp-2">
                        {academy.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-white/30">
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        {academy.is_public ? 'Pública' : 'Privada'}
                      </span>
                      <span>@{academy.slug}</span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Academias públicas */}
        <section>
          <h2 className="text-lg font-serif text-white mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Academias públicas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {academies.filter((a: Academy) => a.is_public && !a.is_member).map((academy: Academy) => (
              <motion.div
                key={academy.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Link
                  to={`/academia/${academy.slug}`}
                  className="block p-6 bg-card/30 border border-border rounded-xl hover:border-white/20 transition-colors"
                >
                  <h3 className="font-serif text-lg text-white mb-2">{academy.name}</h3>
                  {academy.description && (
                    <p className="text-white/50 text-sm mb-4 line-clamp-2">
                      {academy.description}
                    </p>
                  )}
                  <div className="text-xs text-white/30">@{academy.slug}</div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {academies.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <GraduationCap className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-xl text-white/50 mb-2">No hay academias disponibles</h3>
            <p className="text-white/30 mb-4">Sé el primero en crear una academia socrática.</p>
            <Link
              to="/academies/create"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg hover:bg-white/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Crear academia
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
