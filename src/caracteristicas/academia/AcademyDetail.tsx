import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/compartido/lib/supabaseClient';
import { useAcademyRole } from '@/caracteristicas/academia/hooks/useAcademyRole';

interface Academy {
  id: string;
  slug: string;
  name: string;
  description: string;
  is_public: boolean;
  oracle_persona_prompt: string | null;
}

export default function AcademyDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [academy, setAcademy] = useState<Academy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { role, isMember, loading: roleLoading } = useAcademyRole(academy?.id || null);

  useEffect(() => {
    const fetchAcademy = async () => {
      if (!slug) return;

      try {
        const { data, error } = await supabase
          .from('academies')
          .select('*')
          .eq('slug', slug)
          .single();

        if (error) throw error;
        setAcademy(data);
      } catch (err: any) {
        setError(err.message || 'Academia no encontrada');
      } finally {
        setLoading(false);
      }
    };

    fetchAcademy();
  }, [slug]);

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-lagrange-dark text-white flex items-center justify-center">
        <div className="text-gray-400">Cargando...</div>
      </div>
    );
  }

  if (error || !academy) {
    return (
      <div className="min-h-screen bg-lagrange-dark text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Academia no encontrada</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => navigate('/academias')}
            className="px-6 py-3 bg-lagrange-accent rounded-lg"
          >
            Volver a Academias
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-lagrange-dark text-white">
      {/* Header */}
      <header className="bg-lagrange-surface border-b border-lagrange-border p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{academy.name}</h1>
                {academy.is_public ? (
                  <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded">
                    Pública
                  </span>
                ) : (
                  <span className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded">
                    Privada
                  </span>
                )}
              </div>
              <p className="text-gray-400">/academia/{academy.slug}</p>
            </div>
            {isMember && (
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-lagrange-accent/20 text-lagrange-accent rounded-full text-sm">
                  {role}
                </span>
              </div>
            )}
          </div>
          {academy.description && (
            <p className="mt-4 text-gray-300">{academy.description}</p>
          )}
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-lagrange-surface/50 border-b border-lagrange-border">
        <div className="max-w-6xl mx-auto px-8">
          <div className="flex gap-6">
            <button
              onClick={() => navigate(`/academia/${slug}`)}
              className="py-4 border-b-2 border-lagrange-accent text-lagrange-accent"
            >
              Inicio
            </button>
            <button
              onClick={() => navigate(`/academia/${slug}/map`)}
              className="py-4 border-b-2 border-transparent hover:border-lagrange-accent transition-colors"
            >
              Mapa
            </button>
            <button
              onClick={() => navigate(`/academia/${slug}/admin`)}
              className="py-4 border-b-2 border-transparent hover:border-lagrange-accent transition-colors"
            >
              Admin
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-6xl mx-auto p-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <button
            onClick={() => navigate(`/academia/${slug}/map`)}
            className="p-6 bg-lagrange-surface rounded-lg border border-lagrange-border hover:border-lagrange-accent transition-colors text-left"
          >
            <h3 className="text-xl font-semibold mb-2">Explorar Mapa</h3>
            <p className="text-gray-400 text-sm">
              Navega la topología de conceptos y nodos
            </p>
          </button>

          <button
            onClick={() => navigate(`/lab`)}
            className="p-6 bg-lagrange-surface rounded-lg border border-lagrange-border hover:border-lagrange-accent transition-colors text-left"
          >
            <h3 className="text-xl font-semibold mb-2">Diálogo Socrático</h3>
            <p className="text-gray-400 text-sm">
              Inicia una conversación con el oráculo
            </p>
          </button>

          <button
            onClick={() => navigate(`/podcast`)}
            className="p-6 bg-lagrange-surface rounded-lg border border-lagrange-border hover:border-lagrange-accent transition-colors text-left"
          >
            <h3 className="text-xl font-semibold mb-2">Podcast</h3>
            <p className="text-gray-400 text-sm">
              Genera episodios basados en preguntas
            </p>
          </button>
        </div>

        {/* Welcome for non-members */}
        {!isMember && (
          <div className="p-8 bg-lagrange-surface rounded-lg border border-lagrange-border text-center">
            <h2 className="text-2xl font-semibold mb-4">¿Quieres unirte?</h2>
            <p className="text-gray-400 mb-6">
              {academy.is_public 
                ? "Únete a esta academia pública con un clic" 
                : "Solicita acceso para participar en esta academia"
              }
            </p>
            {academy.is_public ? (
              <button 
                onClick={async () => {
                  try {
                    const { error } = await supabase.rpc('join_public_academy', {
                      p_academy_id: academy.id
                    });
                    if (error) throw error;
                    window.location.reload();
                  } catch (err: any) {
                    alert(err.message || 'Error al unirse a la academia');
                  }
                }}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              >
                Unirme a la Academia
              </button>
            ) : (
              <button className="px-6 py-3 bg-lagrange-accent hover:bg-lagrange-accent/80 rounded-lg transition-colors">
                Solicitar Acceso
              </button>
            )}
          </div>
        )}

        {/* Role-based content */}
        {isMember && role === 'owner' && (
          <div className="p-6 bg-lagrange-surface rounded-lg border border-lagrange-accent/50">
            <h3 className="text-lg font-semibold mb-4">Panel de Administrador</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={() => navigate(`/academia/${slug}/admin?tab=ejes`)}
                className="p-4 bg-lagrange-dark rounded-lg hover:bg-lagrange-accent/10 transition-colors"
              >
                Gestionar Ejes
              </button>
              <button
                onClick={() => navigate(`/academia/${slug}/admin?tab=nodos`)}
                className="p-4 bg-lagrange-dark rounded-lg hover:bg-lagrange-accent/10 transition-colors"
              >
                Gestionar Nodos
              </button>
              <button
                onClick={() => navigate(`/academia/${slug}/admin?tab=miembros`)}
                className="p-4 bg-lagrange-dark rounded-lg hover:bg-lagrange-accent/10 transition-colors"
              >
                Miembros
              </button>
              <button
                onClick={() => navigate(`/academia/${slug}/admin?tab=fuentes`)}
                className="p-4 bg-lagrange-dark rounded-lg hover:bg-lagrange-accent/10 transition-colors"
              >
                Fuentes RAG
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
