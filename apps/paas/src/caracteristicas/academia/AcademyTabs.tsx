import { useParams, useLocation } from 'react-router-dom';
import { Link, useMatch } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Sparkles, Map, Radio, FlaskConical, Settings } from 'lucide-react';
import { useAcademy, useAcademyTheme } from '@/caracteristicas/academia/AcademyContext';
import { useUserRole } from '@/caracteristicas/academia/hooks/useAcademyRole';

/**
 * Navegación secundaria en forma de tabs.
 * Se muestra debajo del header y cambia según la academia activa.
 */
export function AcademyTabs() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const academyContext = useAcademy();
  const theme = academyContext?.theme ?? null;
  const { academyId } = academyContext;
  
  // Obtener rol del usuario en esta academia
  const { isAdmin, isOwner, loading: roleLoading } = useUserRole();

  const currentSlug = slug || 'genesis';

  // Determinar tab activo según pathname
  const isActive = (path: string) => {
    if (path === '' || path === 'lab') {
      return location.pathname === `/academia/${currentSlug}` || 
             location.pathname === `/academia/${currentSlug}/lab`;
    }
    return location.pathname.includes(`/${path}`);
  };

  const tabs = [
    {
      id: 'oracle',
      label: 'Oráculo',
      path: `/academia/${currentSlug}`,
      icon: Sparkles,
      exact: true,
    },
    {
      id: 'map',
      label: 'Mapa',
      path: `/academia/${currentSlug}/map`,
      icon: Map,
    },
    {
      id: 'podcast',
      label: 'Podcast',
      path: `/academia/${currentSlug}/podcast`,
      icon: Radio,
    },
    // Admin tab - solo visible para admins/owners
    ...(isAdmin || isOwner
      ? [
          {
            id: 'admin',
            label: 'Admin',
            path: `/academia/${currentSlug}/admin`,
            icon: Settings,
          },
        ]
      : []),
  ];

  const accentColor = theme?.primaryColor ?? 'var(--primary)';

  return (
    <nav
      className="sticky top-14 z-40 border-b transition-all duration-300"
      style={{
        backgroundColor: theme ? `${theme.backgroundColor}dd` : 'hsl(var(--background))',
        borderColor: theme?.borderColor || 'hsl(var(--border))',
      }}
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const active = isActive(tab.path.replace(`/academia/${currentSlug}`, '').replace(/^\//, '') || 'lab');
            const Icon = tab.icon;

            return (
              <Link
                key={tab.id}
                to={tab.path}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 font-serif text-sm transition-all duration-200 whitespace-nowrap border-b-2',
                  active
                    ? 'border-current text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50'
                )}
                style={{
                  color: active ? accentColor : undefined,
                  borderColor: active ? accentColor : 'transparent',
                }}
              >
                <Icon
                  className={cn('w-4 h-4', active && 'animate-pulse')}
                  style={{ color: active ? accentColor : undefined }}
                />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
