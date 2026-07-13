import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/compartido/ui/button';
import { User, LogIn, Menu, ChevronDown, Map, Radio, FlaskConical, Sparkles } from 'lucide-react';
import { supabase } from '@/compartido/lib/supabaseClient';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/compartido/ui/sheet';
import { useAcademy } from '@/caracteristicas/academia/AcademyContext';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/compartido/ui/dropdown-menu';

interface AcademyInfo {
  id: string;
  name: string;
  slug: string;
}

const ADMIN_EMAIL = 'sampayo@gmail.com';

/** Default theme for when not inside an AcademyProvider */
const DEFAULT_NAV_THEME = {
  primaryColor: '#8B5CF6',
  secondaryColor: '#A78BFA',
  backgroundColor: '#0F0F23',
  textColor: '#E2E8F0',
  mutedColor: '#94A3B8',
  borderColor: '#1E293B',
  gradientStart: '#1E1B4B',
  gradientEnd: '#0F172A',
  glowColor: 'rgba(139, 92, 246, 0.3)',
};

/**
 * Hook that safely gets academy context, returning null if not available
 */
function useAcademySafe() {
  try {
    return useAcademy();
  } catch {
    return null;
  }
}

/**
 * Barra de navegación principal con selector de academia prominente.
 * El tema visual cambia según la academia seleccionada.
 * Funciona incluso fuera de un AcademyProvider usando tema por defecto.
 */
export function LagrangeNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { slug } = useParams();
  const isMobile = useIsMobile();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [academies, setAcademies] = useState<AcademyInfo[]>([]);
  const [loadingAcademies, setLoadingAcademies] = useState(true);
  
  // Safely get academy context - may be null if not inside AcademyProvider
  const academyContext = useAcademySafe();
  const academy = academyContext?.academy ?? null;
  const theme = academyContext?.theme ?? DEFAULT_NAV_THEME;

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
      setIsAdmin(session?.user?.email === ADMIN_EMAIL);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session);
      setIsAdmin(session?.user?.email === ADMIN_EMAIL);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Navegación principal - Oráculo es la entrada principal
  const navItems = [
    { path: 'lab', label: 'Oráculo', icon: Sparkles, description: 'El corazón' },
    { path: 'map', label: 'Mapa', icon: Map, description: 'La topología' },
    { path: 'podcast', label: 'Podcast', icon: Radio, description: 'El audio' },
  ];

  const handleAcademyChange = (newSlug: string) => {
    navigate(`/academia/${newSlug}/lab`);
  };

  const handleNavClick = (path: string) => {
    const baseSlug = slug || 'genesis';
    navigate(`/academia/${baseSlug}/${path}`);
    setMobileMenuOpen(false);
  };

  // Determinar si estamos dentro de una academia
  const isInAcademy = location.pathname.includes('/academia/');
  const currentAcademySlug = slug || 'genesis';
  const currentAcademy = academies.find(a => a.slug === currentAcademySlug);

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      {navItems.map((item) => {
        const isActive = location.pathname.includes(`/${item.path}`);
        const Icon = item.icon;
        return (
          <Button
            key={item.path}
            variant="ghost"
            size={mobile ? "default" : "sm"}
            onClick={() => handleNavClick(item.path)}
            className={cn(
              "gap-2 font-serif transition-all duration-300",
              mobile ? "w-full justify-start text-lg" : "px-3",
              isActive 
                ? "text-primary bg-primary/10 shadow-sm" 
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            )}
          >
            <Icon className={cn("w-4 h-4", isActive && "animate-pulse")} />
            {item.label}
          </Button>
        );
      })}
    </>
  );

  const AuthButton = ({ mobile = false }: { mobile?: boolean }) => (
    isAuthenticated ? (
      <Button
        variant="ghost"
        size={mobile ? "default" : "sm"}
        onClick={() => handleNavClick('profile')}
        className={cn(
          "gap-2",
          mobile && "w-full justify-start text-lg",
          location.pathname.includes('profile') 
            ? "text-primary bg-secondary/30" 
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <User className="w-4 h-4" />
        Perfil
      </Button>
    ) : (
      <Button
        variant="ghost"
        size={mobile ? "default" : "sm"}
        onClick={() => navigate('/auth')}
        className={cn(
          "gap-2 text-muted-foreground hover:text-foreground",
          mobile && "w-full justify-start text-lg"
        )}
      >
        <LogIn className="w-4 h-4" />
        Entrar
      </Button>
    )
  );

  return (
    <nav 
      className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-xl transition-all duration-500"
      style={{ 
        backgroundColor: `${theme.backgroundColor}cc`,
        borderColor: theme.borderColor,
      }}
    >
      {/* Indicador de acento superior */}
      <div 
        className="h-[2px] w-full transition-all duration-500"
        style={{ 
          background: `linear-gradient(90deg, transparent, ${theme.primaryColor}, transparent)`,
        }}
      />
      
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo + Selector de Academia */}
          <div className="flex items-center gap-2 md:gap-3">
            <Link to="/" className="flex items-center gap-2 group">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                style={{ 
                  backgroundColor: `${theme.primaryColor}20`,
                  boxShadow: `0 0 20px ${theme.glowColor}`
                }}
              >
                <span 
                  className="font-serif text-lg transition-colors duration-300"
                  style={{ color: theme.primaryColor }}
                >
                  λ
                </span>
              </div>
              <span className="font-serif text-lg md:text-xl tracking-wide" style={{ color: theme.textColor }}>
                Lagrange
              </span>
            </Link>

            {/* Selector de Academia - PROMINENTE */}
            {!loadingAcademies && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="gap-2 font-serif transition-all duration-300 hover:scale-105"
                    style={{ 
                      borderColor: theme.primaryColor,
                      color: theme.primaryColor,
                      backgroundColor: `${theme.primaryColor}10`,
                    }}
                  >
                    <span className="max-w-[100px] md:max-w-[150px] truncate">
                      {currentAcademy?.name || 'Genesis'}
                    </span>
                    <ChevronDown className="w-4 h-4" style={{ color: theme.primaryColor }} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="start"
                  className="min-w-[200px]"
                  style={{ 
                    backgroundColor: theme.backgroundColor,
                    borderColor: theme.borderColor,
                  }}
                >
                  {academies.map((acad) => (
                    <DropdownMenuItem
                      key={acad.id}
                      onClick={() => handleAcademyChange(acad.slug)}
                      className={cn(
                        "cursor-pointer font-serif transition-colors",
                        acad.slug === currentAcademySlug && "bg-primary/20"
                      )}
                      style={{ color: theme.textColor }}
                    >
                      {acad.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator style={{ backgroundColor: theme.borderColor }} />
                  <DropdownMenuItem
                    onClick={() => navigate('/academies')}
                    className="cursor-pointer font-serif text-muted-foreground"
                  >
                    + Crear academia
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Desktop Navigation - Centrado */}
          {!isMobile && (
            <div className="flex items-center gap-1">
              <NavLinks />
            </div>
          )}

          {/* Auth + Admin */}
          <div className="flex items-center gap-2">
            {!isMobile && <AuthButton />}
            {isAdmin && !isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleNavClick('admin')}
                className={cn(
                  "gap-2 text-xs uppercase tracking-wider",
                  location.pathname.includes('admin') 
                    ? "text-primary bg-secondary/30" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Admin
              </Button>
            )}
          </div>

          {/* Mobile Navigation */}
          {isMobile && (
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10" style={{ color: theme.primaryColor }}>
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] pt-12" style={{ backgroundColor: theme.backgroundColor }}>
                <div className="flex flex-col gap-2">
                  <NavLinks mobile />
                  <div className="border-t my-4" style={{ borderColor: theme.borderColor }} />
                  <AuthButton mobile />
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>
    </nav>
  );
}
