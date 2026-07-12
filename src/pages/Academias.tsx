import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUserAcademies } from '@/hooks/useUserRole';

interface Academy {
  id: string;
  slug: string;
  name: string;
  description: string;
  is_public: boolean;
  role?: string;
}

export default function Academias() {
  const navigate = useNavigate();
  const { academies: myAcademies, loading: loadingMy } = useUserAcademies();
  const [publicAcademies, setPublicAcademies] = useState<Academy[]>([]);
  const [loadingPublic, setLoadingPublic] = useState(true);

  useEffect(() => {
    const fetchPublicAcademies = async () => {
      try {
        const { data, error } = await supabase
          .from('academies')
          .select('id, slug, name, description, is_public')
          .eq('is_public', true)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setPublicAcademies(data || []);
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

  return (
    <div className="min-h-screen bg-lagrange-dark text-white p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl font-bold mb-4">Academias</h1>
          <p className="text-gray-400">Explora y únete a las academias del Sistema Lagrange</p>
        </header>

        {/* My Academies */}
        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Mis Academias</h2>
            <button
              onClick={handleCreateAcademy}
              className="px-6 py-3 bg-lagrange-accent hover:bg-lagrange-accent/80 rounded-lg transition-colors"
            >
              Crear Academia
            </button>
          </div>

          {loadingMy ? (
            <div className="text-gray-400">Cargando...</div>
          ) : myAcademies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myAcademies.map((academy: any) => (
                <div
                  key={academy.academy_id}
                  onClick={() => handleAcademyClick(academy.slug)}
                  className="p-6 bg-lagrange-surface rounded-lg border border-lagrange-border hover:border-lagrange-accent cursor-pointer transition-colors"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-semibold">{academy.name}</h3>
                    <span className="px-2 py-1 text-xs bg-lagrange-accent/20 text-lagrange-accent rounded">
                      {academy.role}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm line-clamp-2">
                    {academy.is_public ? 'Pública' : 'Privada'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 bg-lagrange-surface rounded-lg border border-lagrange-border text-center">
              <p className="text-gray-400 mb-4">No tienes academias todavía</p>
              <button
                onClick={handleCreateAcademy}
                className="px-6 py-3 bg-lagrange-accent hover:bg-lagrange-accent/80 rounded-lg transition-colors"
              >
                Crear tu primera academia
              </button>
            </div>
          )}
        </section>

        {/* Public Academies */}
        <section>
          <h2 className="text-2xl font-semibold mb-6">Academias Públicas</h2>

          {loadingPublic ? (
            <div className="text-gray-400">Cargando...</div>
          ) : publicAcademies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {publicAcademies.map((academy) => (
                <div
                  key={academy.id}
                  onClick={() => handleAcademyClick(academy.slug)}
                  className="p-6 bg-lagrange-surface rounded-lg border border-lagrange-border hover:border-lagrange-accent cursor-pointer transition-colors"
                >
                  <h3 className="text-xl font-semibold mb-2">{academy.name}</h3>
                  <p className="text-gray-400 text-sm line-clamp-3">
                    {academy.description || 'Sin descripción'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 bg-lagrange-surface rounded-lg border border-lagrange-border text-center">
              <p className="text-gray-400">No hay academias públicas disponibles</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
