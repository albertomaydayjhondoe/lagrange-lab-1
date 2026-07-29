/**
 * CampusNav - Navegación estilo Universidad Digital del Siglo XXI
 * 
 * Estructura:
 * - Header fijo: nombre plataforma + selector de carrera + avatar/login
 * - Nav principal (visible para usuarios autenticados):
 *   🏛️ Campus → /academies
 *   📖 Mis Materias → /carrera/:slug
 *   💬 Preguntar → /carrera/:slug/oraculo
 *   🎓 Tutorías → /carrera/:slug/tutorias
 *   📂 Mis Apuntes → /perfil
 * - Nav contextual (botón junto al nombre de carrera, solo si es owner/admin):
 *   ⚙️ "Gestionar esta carrera"
 */

import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/compartido/ui/button';
import { 
  Building2,      // 🏛️ Campus
  BookOpen,       // 📖 Mis Materias  
  MessageCircle,  // 💬 Preguntar
  GraduationCap,  // 🎓 Tutorías
  FolderOpen,     // 📂 Mis Apuntes
  Settings,       // ⚙️ Gestionar
  User, 
  LogIn, 
  LogOut,
  Menu, 
  ChevronDown,
  Loader2,
  Plus
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

// Tipos
interface Academy {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  is_public?: boolean;
  role?: string | null;
  is_member?: boolean;
}

/** Tema visual por defecto */
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

/**
 * CampusNav - Navegación principal estilo campus universitario
 */
export function CampusNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { slug: urlSlug } = useParams();
  const isMobile = useIsMobile();
  
  // Estados de autenticación
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userInitials, setUserInitials] = useState('');
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Estados de academias
  const [userAcademies, setUserAcademies] = useState<Academy[]>([]);
  const [activeAcademy, setActiveAcademy] = useState<Academy | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loadingAcademies, setLoadingAcademies] = useState(true);
  
  // Tema (simplificado - se podría expandir con AcademyContext)
  const theme = DEFAULT_THEME;

  // Cargar sesión y academias del usuario
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
        
        // Cargar academias del usuario
        await loadUserAcademies(session.user.id);
      }
      
      setLoading(false);
    };

    loadSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      setIsAuthenticated(!!session);
      
      if (session?.user) {
        setUserEmail(session.user.email);
        const parts = session.user.email?.split('@')[0].split('.') || [];
        setUserInitials(
          parts.map((p: string) => p[0]?.toUpperCase() || '').join('').slice(0, 2)
        );
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

  // Sincronizar academia activa con la URL
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

  // Cargar academias del usuario
  const loadUserAcademies = async (userId: string) => {
    setLoadingAcademies(true);
    try {
      const { data, error } = await supabase.functions.invoke('list-academies');
      
      if (error) {
        console.error('Error loading academies:', error);
        setUserAcademies([]);
        return;
      }

      // Filtrar solo las academias donde el usuario es miembro
      const memberships = (data?.academies || []).filter((a: Academy) => a.is_member);
      setUserAcademies(memberships);
      
      // Seleccionar la primera academia por defecto
      if (memberships.length > 0 && !activeAcademy) {
        setActiveAcademy(memberships[0]);
        setIsOwner(memberships[0].role === 'owner');
        
        // Navegar a la primera academia si estamos en raíz
        if (location.pathname === '/' || location.pathname === '/auth') {
          navigate(`/carrera/${memberships[0].slug}`);
        }
      }
    } catch (error) {
      console.error('Error loading academies:', error);
      setUserAcademies([]);
    } finally {
      setLoadingAcademies(false);
    }
  };

  // Cerrar sesión
  const handleSignOut = async () => {
    await signOut();
    toast({ title: 'Sesión cerrada' });
    navigate('/');
  };

  // Cambiar academia activa
  const handleAcademyChange = (academy: Academy) => {
    setActiveAcademy(academy);
    setIsOwner(academy.role === 'owner');
    navigate(`/carrera/${academy.slug}`);
    localStorage.setItem('currentAcademySlug', academy.slug);
  };

  // Determinar qué nav item está activo
  const isActive = (path: string) => {
    if (path === '/academies') {
      return location.pathname === '/academies';
    }
    if (path === '/perfil') {
      return location.pathname === '/perfil';
    }
    return location.pathname.includes(path);
  };

  // Elementos de navegación principal
  const navItems = [
    { path: '/academies', label: 'Campus', icon: Building2 },
    ...(activeAcademy ? [
      { path: `/carrera/${activeAcademy.slug}`, label: 'Mis Materias', icon: BookOpen },
      { path: `/carrera/${activeAcademy.slug}/oraculo`, label: 'Preguntar', icon: MessageCircle },
      { path: `/carrera/${activeAcademy.slug}/tutorias`, label: 'Tutorías', icon: GraduationCap },
    ] : []),
    { path: '/perfil', label: 'Mis Apuntes', icon: FolderOpen },
  ];

  // Si está cargando, mostrar estado de carga
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
      {/* Indicador de acento superior */}
      <div 
        className="h-[2px] w-full transition-all duration-500"
        style={{ 
          background: `linear-gradient(90deg, transparent, ${theme.primaryColor}, transparent)`,
        }}
      />
      
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
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
            <span 
              className="font-serif text-lg md:text-xl tracking-wide hidden sm:inline"
              style={{ color: theme.textColor }}
            >
              Lagrange Lab
            </span>
          </Link>

          {/* Desktop Navigation - Solo para usuarios autenticados */}
          {!isMobile && isAuthenticated && (
            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Button
                    key={item.path}
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(item.path)}
                    className={cn(
                      "gap-2 font-serif transition-all duration-300",
                      active 
                        ? "text-primary bg-primary/10 shadow-sm" 
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    )}
                  >
                    <Icon className={cn("w-4 h-4", active && "animate-pulse")} />
                    {item.label}
                  </Button>
                );
              })}
              
              {/* Botón contextual "Gestionar" - Solo para owners/admins */}
              {activeAcademy && isOwner && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/carrera/${activeAcademy.slug}/gestionar`)}
                  className={cn(
                    "gap-2 font-serif transition-all duration-300 ml-2 border-l pl-3",
                    isActive(`/gestionar`) 
                      ? "text-amber-500 bg-amber-500/10" 
                      : "text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10"
                  )}
                >
                  <Settings className="w-4 h-4" />
                  Gestionar
                </Button>
              )}
            </div>
          )}

          {/* Selector de Carrera + Auth */}
          <div className="flex items-center gap-2">
            {/* Selector de carrera activa */}
            {isAuthenticated && !loadingAcademies && userAcademies.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="gap-2 font-serif transition-all duration-300 hover:scale-105 max-w-[180px]"
                    style={{ 
                      borderColor: theme.primaryColor,
                      color: theme.primaryColor,
                      backgroundColor: `${theme.primaryColor}10`,
                    }}
                  >
                    <GraduationCap className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">
                      {activeAcademy?.name || 'Elegir carrera'}
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
                    Ver todas las carreras
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Usuario autenticado - Avatar dropdown */}
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
                  <DropdownMenuItem onClick={() => navigate('/perfil')}>
                    <FolderOpen className="w-4 h-4 mr-2" />
                    Mis Apuntes
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/academies')}>
                    <Building2 className="w-4 h-4 mr-2" />
                    Cambiar de carrera
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
                    {/* Selector de carrera en móvil */}
                    {userAcademies.length > 1 && (
                      <div className="mb-4">
                        <p className="text-xs text-muted-foreground mb-2 px-2">
                          Carrera activa
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
                      const active = isActive(item.path);
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

                    {/* Gestionar en móvil */}
                    {activeAcademy && isOwner && (
                      <Button
                        variant="ghost"
                        onClick={() => {
                          navigate(`/carrera/${activeAcademy.slug}/gestionar`);
                          setMobileMenuOpen(false);
                        }}
                        className={cn(
                          "justify-start gap-3 text-base py-5 border-l-2",
                          isActive(`/gestionar`) 
                            ? "text-amber-500 bg-amber-500/10 border-l-amber-500" 
                            : "text-muted-foreground"
                        )}
                      >
                        <Settings className="w-5 h-5" />
                        Gestionar esta carrera
                      </Button>
                    )}
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

export default CampusNav;
