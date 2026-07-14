import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/compartido/ui/button';
import { User, LogIn, ChevronDown, Loader2, Menu, X } from 'lucide-react';
import { supabase } from '@/compartido/lib/supabaseClient';
import { useAcademy, useAcademyTheme } from '@/caracteristicas/academia/AcademyContext';
import { useAcademyRole } from '@/caracteristicas/academia/hooks/useAcademyRole';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/compartido/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/compartido/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';

interface AcademyInfo {
  id: string;
  name: string;
  slug: string;
}

/**
 * Header global con selector de academia prominente.
 * Se monta una vez en App.tsx y permanece visible en todas las rutas.
 * Usa useAcademyRole para determinar permisos de admin en la academia activa.
 */
export function AcademyHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { slug } = useParams();
  const isMobile = useIsMobile();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [academies, setAcademies] = useState<AcademyInfo[]>([]);
  const [loadingAcademies, setLoadingAcademies] = useState(true);
  const [userInitials, setUserInitials] = useState('');

  // Safely get academy context
  const academyContext = useAcademy();
  const academy = academyContext?.academy ?? null;
  const theme = academyContext?.theme ?? null;
  const { academyId } = academyContext;

  // Usar rol de la academia activa para determinar si es admin
  const { isAdmin } = useAcademyRole(academyId);

  // Determinar el color de acento del header
  const accentColor = theme?.primaryColor ?? 'var(--primary)';

  // Cargar academias disponibles
  useEffect(() => {
    const loadAcademies = async () => {
      setLoadingAcademies(true);
      const { data } = await supabase
        .from('academies')
        .select('id, name, slug')
        .order('name');

      if (data) {
        setAcademies(data);
      }
      setLoadingAcademies(false);
    };

    loadAcademies();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      if (session?.user?.email) {
        const parts = session.user.email.split('@')[0].split('.');
        setUserInitials(parts.map((p: string) => p[0]?.toUpperCase() || '').join('').slice(0, 2));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session);
      if (session?.user?.email) {
        const parts = session.user.email.split('@')[0].split('.');
        setUserInitials(parts.map((p: string) => p[0]?.toUpperCase() || '').join('').slice(0, 2));
      } else {
        setUserInitials('');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAcademyChange = (newSlug: string) => {
    // Mantener la sub-ruta actual si estamos en una academia
    const currentSubPath = location.pathname.match(/\/academia\/[^/]+\/(.*)/)?.[1] || '';
    navigate(`/academia/${newSlug}/${currentSubPath || 'lab'}`);
    setMobileMenuOpen(false);
  };

  // Determinar academia actual
  const currentAcademySlug = slug || 'genesis';
  const currentAcademy = academies.find((a) => a.slug === currentAcademySlug);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-xl transition-all duration-500"
      style={{
        backgroundColor: theme ? `${theme.backgroundColor}ee` : 'hsl(var(--background))',
        borderColor: theme?.borderColor || 'hsl(var(--border))',
      }}
    >
      {/* Indicador de acento superior - color de la academia */}
      <div
        className="h-[2px] w-full transition-all duration-500"
        style={{
          background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
        }}
      />

      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo + Nombre */}
          <Link
            to="/"
            className="flex items-center gap-2 group"
            style={{ color: theme?.textColor }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110"
              style={{
                backgroundColor: `${accentColor}20`,
                boxShadow: `0 0 15px ${accentColor}30`,
              }}
            >
              <span className="font-serif text-base" style={{ color: accentColor }}>
                λ
              </span>
            </div>
            <span className="font-serif text-base md:text-lg tracking-wide hidden sm:inline">
              Lagrange Lab
            </span>
          </Link>

          {/* Selector de Academia + Avatar */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Selector de Academia */}
            {!loadingAcademies && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 font-serif transition-all duration-300 hover:scale-105"
                    style={{
                      borderColor: accentColor,
                      color: accentColor,
                      backgroundColor: `${accentColor}10`,
                    }}
                  >
                    <span className="max-w-[100px] md:max-w-[150px] truncate text-xs md:text-sm">
                      {currentAcademy?.name || 'Genesis'}
                    </span>
                    <ChevronDown className="w-3 h-3 md:w-4 h-4" style={{ color: accentColor }} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="min-w-[200px]"
                  style={{
                    backgroundColor: theme?.backgroundColor || 'hsl(var(--card))',
                    borderColor: theme?.borderColor || 'hsl(var(--border))',
                  }}
                >
                  {academies.map((acad) => (
                    <DropdownMenuItem
                      key={acad.id}
                      onClick={() => handleAcademyChange(acad.slug)}
                      className={cn(
                        'cursor-pointer font-serif transition-colors',
                        acad.slug === currentAcademySlug && 'bg-primary/20'
                      )}
                      style={{ color: theme?.textColor || 'hsl(var(--foreground))' }}
                    >
                      <span className="mr-2 text-muted-foreground">Academia:</span>
                      {acad.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator
                    style={{ backgroundColor: theme?.borderColor || 'hsl(var(--border))' }}
                  />
                  <DropdownMenuItem
                    onClick={() => navigate('/academies/create')}
                    className="cursor-pointer font-serif text-muted-foreground"
                  >
                    + Crear academia
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Avatar del usuario */}
            {isAuthenticated ? (
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full overflow-hidden"
                onClick={() => navigate(`/academia/${currentAcademySlug}/profile`)}
                style={{
                  backgroundColor: `${accentColor}20`,
                  color: accentColor,
                }}
              >
                {userInitials ? (
                  <span className="text-xs font-medium">{userInitials}</span>
                ) : (
                  <User className="w-4 h-4" />
                )}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/auth')}
                className="gap-2 font-serif"
                style={{
                  borderColor: theme?.borderColor || 'hsl(var(--border))',
                }}
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Entrar</span>
              </Button>
            )}

            {/* Admin (solo desktop) */}
            {isAdmin && !isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/academia/${currentAcademySlug}/admin`)}
                className="gap-2 text-xs uppercase tracking-wider font-mono"
              >
                Admin
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
