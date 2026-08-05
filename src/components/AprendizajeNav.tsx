/**
 * AprendizajeNav - Navegación del Punto 2: Aprendizaje
 * 
 * Espacio único donde el alumno (y el centro en modo supervisión) 
 * vive todo el proceso de aprendizaje:
 * - Asignaturas
 * - Oráculo
 * - Portfolio
 * - Podcast/Topología/Research/Pitágoras/Tutorías (integrados)
 */

import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/compartido/ui/button';
import { isFeatureEnabled } from '@/config/featureFlags';
import {
  Building2,      // Campus
  BookOpen,       // Asignaturas
  MessageCircle,  // Oráculo
  GraduationCap,  // Tutorías
  FolderOpen,     // Portfolio
  Radio,          // Podcast
  Map,            // Topología
  FlaskConical,   // Research
  Calculator,     // Pitágoras
  Settings,       // Admin (centro)
  User,
  LogIn,
  LogOut,
  Menu,
  ChevronDown,
  Loader2,
  Plus,
  Home
} from 'lucide-react';
import { supabase, signOut } from '@/compartido/lib/supabaseClient';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/compartido/ui/sheet';
import { Avatar, AvatarFallback } from '@/compartido/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/compartido/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';

interface Academy {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  is_public?: boolean;
  role?: string | null;
  is_member?: boolean;
}

const DEFAULT_THEME = {
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

export function AprendizajeNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { slug: urlSlug } = useParams();
  const isMobile = useIsMobile();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userInitials, setUserInitials] = useState('');
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [userAcademies, setUserAcademies] = useState<Academy[]>([]);
  const [activeAcademy, setActiveAcademy] = useState<Academy | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loadingAcademies, setLoadingAcademies] = useState(true);

  const theme = DEFAULT_THEME;

  // Feature flags
  const podcastEnabled = isFeatureEnabled('podcast');
  const topologiaEnabled = isFeatureEnabled('topologia');
  const researchEnabled = isFeatureEnabled('research');
  const pitagorasEnabled = isFeatureEnabled('pitagoras');
  const tutoriasEnabled = isFeatureEnabled('tutoriasTutor');

  useEffect(() => {
    const loadSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);

      if (session?.user) {
        setUserEmail(session.user.email);
        const parts = session.user.email?.split('@')[0].split('.') || [];
        setUserInitials(
          parts.map((p: string) => p[0]?.toUpperCase() || '').join('').slice(0, 2)
        );
        await loadUserAcademies(session.user.id);
      }

      setLoading(false);
    };

    loadSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      setIsAuthenticated(!!session);

      if (session?.user) {
        setUserEmail(session.user.email);
        await loadUserAcademies(session.user.id);
      } else {
        setUserEmail(null);
        setUserInitials('');
        setUserAcademies([]);
        setActiveAcademy(null);
        setIsOwner(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (urlSlug && userAcademies.length > 0) {
      const found = userAcademies.find(a => a.slug === urlSlug);
      if (found) {
        setActiveAcademy(found);
        setIsOwner(found.role === 'owner');
      }
    } else if (userAcademies.length > 0 && !activeAcademy) {
      setActiveAcademy(userAcademies[0]);
      setIsOwner(userAcademies[0].role === 'owner');
    }
  }, [urlSlug, userAcademies]);

  const loadUserAcademies = async (userId: string) => {
    setLoadingAcademies(true);
    try {
      const { data, error } = await supabase.functions.invoke('list-academies');

      if (error) {
        console.error('Error loading academies:', error);
        setUserAcademies([]);
        return;
      }

      const memberships = (data?.academies || []).filter((a: Academy) => a.is_member);
      setUserAcademies(memberships);

      if (memberships.length > 0 && !activeAcademy) {
        setActiveAcademy(memberships[0]);
        setIsOwner(memberships[0].role === 'owner');

        if (location.pathname === '/' || location.pathname === '/auth') {
          navigate(`/aprendizaje/${memberships[0].slug}`);
        }
      }
    } catch (error) {
      console.error('Error loading academies:', error);
      setUserAcademies([]);
    } finally {
      setLoadingAcademies(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast({ title: 'Sesión cerrada' });
    navigate('/');
  };

  const handleAcademyChange = (academy: Academy) => {
    setActiveAcademy(academy);
    setIsOwner(academy.role === 'owner');
    navigate(`/aprendizaje/${academy.slug}`);
    localStorage.setItem('currentAcademySlug', academy.slug);
  };

  const isActive = (path: string) => {
    return location.pathname.includes(path);
  };

  // Elementos de navegación del espacio Aprendizaje
  const navItems = [
    { path: '/aprendizaje', label: 'Inicio', icon: Home, exact: true },
    ...(activeAcademy ? [
      { path: `/aprendizaje/${activeAcademy.slug}/asignaturas`, label: 'Asignaturas', icon: BookOpen },
      { path: `/aprendizaje/${activeAcademy.slug}/oraculo`, label: 'Oráculo', icon: MessageCircle },
      { path: `/aprendizaje/${activeAcademy.slug}/portfolio`, label: 'Portfolio', icon: FolderOpen },
    ] : []),
    // Módulos integrados (visibles si están activos)
    ...(podcastEnabled && activeAcademy ? [
      { path: `/aprendizaje/${activeAcademy.slug}/podcast`, label: 'Podcast', icon: Radio },
    ] : []),
    ...(topologiaEnabled && activeAcademy ? [
      { path: `/aprendizaje/${activeAcademy.slug}/topologia`, label: 'Topología', icon: Map },
    ] : []),
    ...(researchEnabled && activeAcademy ? [
      { path: `/aprendizaje/${activeAcademy.slug}/research`, label: 'Research', icon: FlaskConical },
    ] : []),
    ...(pitagorasEnabled && activeAcademy ? [
      { path: `/aprendizaje/${activeAcademy.slug}/pitagoras`, label: 'Pitágoras', icon: Calculator },
    ] : []),
    ...(tutoriasEnabled && activeAcademy ? [
      { path: `/aprendizaje/${activeAcademy.slug}/tutorias`, label: 'Tutorías', icon: GraduationCap },
    ] : []),
  ];

  // Items de admin del centro (visibles solo para owner/admin)
  const adminItems = activeAcademy && isOwner ? [
    { path: `/centro/${activeAcademy.slug}/admin`, label: 'Gestionar', icon: Settings },
  ] : [];

  if (loading) {
    return (
      <nav
        className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-xl"
        style={{
          backgroundColor: `${theme.backgroundColor}ee`,
          borderColor: theme.borderColor,
        }}
      >
        <div className="h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" />
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      </nav>
    );
  }

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-xl transition-all duration-500"
      style={{
        backgroundColor: `${theme.backgroundColor}ee`,
        borderColor: theme.borderColor,
      }}
    >
      <div className="h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo + Home */}
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: theme.primaryColor }}
              >
                <span className="text-white font-bold text-sm">L</span>
              </div>
              <span className="font-serif text-lg hidden sm:block" style={{ color: theme.textColor }}>
                Aprendizaje
              </span>
            </Link>
          </div>

          {/* Desktop Nav */}
          {!isMobile && (
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = item.exact
                  ? location.pathname === item.path
                  : isActive(item.path);
                return (
                  <Button
                    key={item.path}
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(item.path)}
                    className={cn(
                      "gap-2 text-sm",
                      active && "bg-primary/20 text-primary"
                    )}
                    style={{ color: active ? theme.primaryColor : theme.mutedColor }}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                );
              })}

              {/* Admin del centro */}
              {adminItems.map((item) => (
                <Button
                  key={item.path}
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(item.path)}
                  className="gap-2 text-sm text-amber-500 hover:text-amber-400"
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Button>
              ))}
            </div>
          )}

          {/* Right side: Academy selector + User */}
          <div className="flex items-center gap-2">
            {/* Selector de academia */}
            {isAuthenticated && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <GraduationCap className="w-4 h-4" style={{ color: theme.primaryColor }} />
                    <span className="hidden sm:inline text-sm" style={{ color: theme.textColor }}>
                      {activeAcademy?.name || 'Elegir academia'}
                    </span>
                    <ChevronDown className="w-4 h-4 flex-shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="min-w-[220px]"
                  style={{
                    backgroundColor: theme.backgroundColor,
                    borderColor: theme.borderColor,
                  }}
                >
                  {userAcademies.map((acad) => (
                    <DropdownMenuItem
                      key={acad.id}
                      onClick={() => handleAcademyChange(acad)}
                      className={cn(
                        "cursor-pointer font-serif transition-colors py-2",
                        acad.id === activeAcademy?.id && "bg-primary/20"
                      )}
                      style={{ color: theme.textColor }}
                    >
                      <GraduationCap className="w-4 h-4 mr-2 text-muted-foreground" />
                      {acad.name}
                      {acad.role === 'owner' && (
                        <span className="ml-2 text-xs text-amber-500">(Gestiono)</span>
                      )}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator style={{ backgroundColor: theme.borderColor }} />
                  <DropdownMenuItem
                    onClick={() => navigate('/academies')}
                    className="cursor-pointer font-serif text-primary"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Ver todas las academias
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* User menu */}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Avatar className="w-7 h-7">
                      <AvatarFallback
                        className="text-xs"
                        style={{ backgroundColor: `${theme.primaryColor}30`, color: theme.primaryColor }}
                      >
                        {userInitials || <User className="w-4 h-4" />}
                      </AvatarFallback>
                    </Avatar>
                    {!isMobile && (
                      <ChevronDown className="w-3 h-3 text-muted-foreground" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5 text-sm text-muted-foreground truncate">
                    {userEmail}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate(`/aprendizaje/${activeAcademy?.slug || ''}/portfolio`)}>
                    <FolderOpen className="w-4 h-4 mr-2" />
                    Mi Portfolio
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/auth')}
                className="gap-2"
              >
                <LogIn className="w-4 h-4" />
                {!isMobile && <span>Acceder</span>}
              </Button>
            )}

            {/* Mobile Menu */}
            {isMobile && isAuthenticated && (
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10"
                    style={{ color: theme.primaryColor }}
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="w-[300px] pt-16"
                  style={{ backgroundColor: theme.backgroundColor }}
                >
                  <div className="flex flex-col gap-2">
                    {userAcademies.length > 1 && (
                      <div className="mb-4">
                        <p className="text-xs text-muted-foreground mb-2 px-2">
                          Academia activa
                        </p>
                        <select
                          className="w-full p-2 rounded-lg border bg-card text-foreground"
                          value={activeAcademy?.id || ''}
                          onChange={(e) => {
                            const acad = userAcademies.find(a => a.id === e.target.value);
                            if (acad) handleAcademyChange(acad);
                          }}
                        >
                          {userAcademies.map((acad) => (
                            <option key={acad.id} value={acad.id}>
                              {acad.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const active = item.exact
                        ? location.pathname === item.path
                        : isActive(item.path);
                      return (
                        <Button
                          key={item.path}
                          variant="ghost"
                          onClick={() => {
                            navigate(item.path);
                            setMobileMenuOpen(false);
                          }}
                          className={cn(
                            "justify-start gap-3 text-base py-5",
                            active
                              ? "text-primary bg-primary/10"
                              : "text-muted-foreground"
                          )}
                        >
                          <Icon className="w-5 h-5" />
                          {item.label}
                        </Button>
                      );
                    })}

                    {adminItems.map((item) => (
                      <Button
                        key={item.path}
                        variant="ghost"
                        onClick={() => {
                          navigate(item.path);
                          setMobileMenuOpen(false);
                        }}
                        className="justify-start gap-3 text-base py-5 text-amber-500"
                      >
                        <item.icon className="w-5 h-5" />
                        {item.label}
                      </Button>
                    ))}
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default AprendizajeNav;
