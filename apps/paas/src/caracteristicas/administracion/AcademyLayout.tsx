import { useParams, Outlet, useNavigate } from 'react-router-dom';
import { AcademyProvider, useAcademy as useAcademyContext } from '@/caracteristicas/academia/AcademyContext';
import { AcademyTabs } from '@/caracteristicas/academia/AcademyTabs';

interface Academy {
  id: string;
  slug: string;
  name: string;
  description: string;
  is_public: boolean;
  role: string | null;
  is_member: boolean;
}

function AcademyLayoutContent() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { academy, loading, isMember, academyId } = useAcademyContext();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-14">
        <div className="text-muted-foreground animate-pulse">Cargando academia...</div>
      </div>
    );
  }

  if (!academy) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-14">
        <div className="text-center">
          <h1 className="text-2xl text-foreground mb-4">Academia no encontrada</h1>
          <p className="text-muted-foreground mb-4">La academia "{slug}" no existe o no tienes acceso.</p>
          <button
            onClick={() => navigate('/academies')}
            className="px-4 py-2 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
          >
            Ver academias disponibles
          </button>
        </div>
      </div>
    );
  }

  // If academy is private and user is not member, redirect
  if (!academy.is_public && !isMember) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-14">
        <div className="text-center">
          <h1 className="text-2xl text-foreground mb-4">Acceso restringido</h1>
          <p className="text-muted-foreground mb-4">Esta academia es privada.</p>
          <button
            onClick={() => navigate('/academies')}
            className="px-4 py-2 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Tabs de navegación secundaria */}
      <AcademyTabs />
      <main className="pt-0">
        <Outlet context={{ academy, academyId: academy.id }} />
      </main>
    </div>
  );
}

export default function AcademyLayout() {
  const { slug } = useParams<{ slug: string }>();
  
  return (
    <AcademyProvider initialSlug={slug}>
      <AcademyLayoutContent />
    </AcademyProvider>
  );
}

// Re-export useAcademy from AcademyContext for backward compatibility
export { useAcademyContext as useAcademy };
