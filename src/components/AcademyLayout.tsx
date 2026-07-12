import { useEffect, useState } from 'react';
import { useParams, Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { LagrangeNav } from '@/components/LagrangeNav';
import { useQuery } from '@tanstack/react-query';

interface Academy {
  id: string;
  slug: string;
  name: string;
  description: string;
  is_public: boolean;
  role: string | null;
  is_member: boolean;
}

export default function AcademyLayout() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [academyId, setAcademyId] = useState<string | null>(null);

  const { data: academy, isLoading, error } = useQuery({
    queryKey: ['academy', slug],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-academy', {
        body: { slug },
      });
      
      if (error || !data?.academy) {
        throw new Error(data?.error || 'Academia no encontrada');
      }
      
      return data.academy as Academy;
    },
    enabled: !!slug,
  });

  useEffect(() => {
    if (academy?.id) {
      setAcademyId(academy.id);
      // Store academy context
      localStorage.setItem('currentAcademyId', academy.id);
      localStorage.setItem('currentAcademySlug', academy.slug);
      localStorage.setItem('currentAcademyRole', academy.role || '');
    }
  }, [academy]);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      localStorage.removeItem('currentAcademyId');
      localStorage.removeItem('currentAcademySlug');
      localStorage.removeItem('currentAcademyRole');
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white/50 animate-pulse">Cargando academia...</div>
      </div>
    );
  }

  if (error || !academy) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-white mb-4">Academia no encontrada</h1>
          <p className="text-white/50 mb-4">La academia "{slug}" no existe o no tienes acceso.</p>
          <button
            onClick={() => navigate('/academies')}
            className="px-4 py-2 bg-white/10 text-white rounded hover:bg-white/20 transition-colors"
          >
            Ver academias disponibles
          </button>
        </div>
      </div>
    );
  }

  // If academy is private and user is not member, redirect
  if (!academy.is_public && !academy.is_member) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-white mb-4">Acceso restringido</h1>
          <p className="text-white/50 mb-4">Esta academia es privada.</p>
          <button
            onClick={() => navigate('/academies')}
            className="px-4 py-2 bg-white/10 text-white rounded hover:bg-white/20 transition-colors"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <LagrangeNav 
        academy={academy}
        academyId={academy.id}
      />
      <main className="pt-16">
        <Outlet context={{ academy, academyId: academy.id }} />
      </main>
    </div>
  );
}

// Hook para acceder al contexto de la academia desde child routes
export function useAcademy() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const context = (window as any).__reactRouterContext;
  return context?.academy as Academy | undefined;
}
