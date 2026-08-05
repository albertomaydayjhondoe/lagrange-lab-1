/**
 * SoberaniaNav - Navegación del Punto 1: Soberanía Administrativa
 * 
 * Panel único desde el que cada rol ejerce su nivel de control:
 * - Nivel PaaS (Plataforma): super-admin ve todo
 * - Nivel SaaS (Centro): tutor/owner gestiona su academia
 * 
 * SIN exponer funcionalidad de aprendizaje.
 */

import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/compartido/ui/button';
import {
  Shield,        // Nivel Plataforma
  Building2,     // Nivel Centro
  Users,         // Miembros
  BookOpen,      // Asignaturas
  Database,      // Corpus RAG
  BarChart3,     // Estadísticas
  Settings,      // Configuración
  Zap,           // Features
  CreditCard,    // Planes
  Globe,         // Global
  User,
  LogIn,
  LogOut,
  Menu,
  ChevronDown,
  Loader2,
  LayoutDashboard,
  ArrowLeft
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

const ADMIN_THEME = {
  primaryColor: '#1d3557',
  secondaryColor: '#457b9d',
  backgroundColor: '#0F172A',
  textColor: '#E2E8F0',
  mutedColor: '#94A3B8',
  borderColor: '#1E293B',
  accentColor: '#2ecc71',
};

export function SoberaniaNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userInitials, setUserInitials] = useState('');
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [userAcademies, setUserAcademies] = useState<Academy[]>([]);
  const [activeAcademy, setActiveAcademy] = useState<Academy | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [isAcademyAdmin, setIsAcademyAdmin] = useState(false);
  const [loadingAcademies, setLoadingAcademies] = useState(true);

  const theme = ADMIN_THEME;

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
        await loadUserData(session.user.id);
      }

      setLoading(false);
    };

    loadSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      setIsAuthenticated(!!session);

      if (session?.user) {
        setUserEmail(session.user.email);
        await loadUserData(session.user.id);
      } else {
        setUserEmail(null);
        setUserInitials('');
        setUserAcademies([]);
        setActiveAcademy(null);
        setIsPlatformAdmin(false);
        setIsAcademyAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserData = async (userId: string) => {
    setLoadingAcademies(true);
    try {
      // Verificar si es platform admin
      const { data: platformData } = await supabase.rpc('is_platform_admin');
      setIsPlatformAdmin(platformData === true);

      // Cargar academias del usuario
      const { data, error } = await supabase.functions.invoke('list-academies');

      if (error) {
        console.error('Error loading academies:', error);
        setUserAcademies([]);
        return;
      }

      const memberships = (data?.academies || []).filter((a: Academy) => a.is_member);
      setUserAcademies(memberships);

      // Verificar si es admin de alguna academia
      const adminAcademy = memberships.find((a: Academy) => 
        a.role === 'owner' || a.role === 'admin'
      );
      setIsAcademyAdmin(!!adminAcademy);

      if (adminAcademy) {
        setActiveAcademy(adminAcademy);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
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
    navigate(`/centro/${academy.slug}/admin`);
  };

  const isActive = (path: string) => {
    return location.pathname.includes(path);
  };

  // Items de navegación para Plataforma (L1)
  const platformItems = isPlatformAdmin ? [
    { path: '/plataforma/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/plataforma/centros', label: 'Centros', icon: Building2 },
    { path: '/plataforma/planes', label: 'Planes', icon: CreditCard },
    { path: '/plataforma/audit', label: 'Auditoría', icon: BarChart3 },
    { path: '/plataforma/settings', label: 'Configuración', icon: Settings },
  ] : [];

  // Items de navegación para Centro (L2)
  const centroItems = activeAcademy && isAcademyAdmin ? [
    { path: `/centro/${activeAcademy.slug}/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
    { path: `/centro/${activeAcademy.slug}/miembros`, label: 'Miembros', icon: Users },
    { path: `/centro/${activeAcademy.slug}/asignaturas`, label: 'Asignaturas', icon: BookOpen },
    { path: `/centro/${activeAcademy.slug}/corpus`, label: 'Corpus RAG', icon: Database },
    { path: `/centro/${activeAcademy.slug}/estadisticas`, label: 'Estadísticas', icon: BarChart3 },
    { path: `/centro/${activeAcademy.slug}/features`, label: 'Features', icon: Zap },
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
        <div className="h-[2px] bg-gradient-to-r from-transparent via-secondary to-transparent" />
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-secondary" />
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
      <div className="h-[2px] bg-gradient-to-r from-transparent via-secondary to-transparent" />
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo + Back to Learning */}
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: theme.primaryColor }}
              >
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="font-serif text-lg hidden sm:block" style={{ color: theme.textColor }}>
                Soberanía
              </span>
            </Link>

            {/* Nivel indicator */}
            <div className="hidden md:flex items-center gap-2">
              {isPlatformAdmin && (
                <span
                  className="px-2 py-0.5 rounded text-xs font-mono"
                  style={{ backgroundColor: `${theme.primaryColor}30`, color: theme.accentColor }}
                >
                  PLATAFORMA
                </span>
              )}
              {isAcademyAdmin && !isPlatformAdmin && (
                <span
                  className="px-2 py-0.5 rounded text-xs font-mono"
                  style={{ backgroundColor: `${theme.secondaryColor}30`, color: theme.secondaryColor }}
                >
                  CENTRO
                </span>
              )}
            </div>
          </div>

          {/* Desktop Nav */}
          {!isMobile && (
            <div className="hidden md:flex items-center gap-1">
              {/* Plataforma items */}
              {platformItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Button
                    key={item.path}
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(item.path)}
                    className={cn(
                      "gap-2 text-sm",
                      active && "bg-secondary/20 text-secondary"
                    )}
                    style={{ color: active ? theme.accentColor : theme.mutedColor }}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                );
              })}

              {/* Centro items */}
              {centroItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Button
                    key={item.path}
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(item.path)}
                    className={cn(
                      "gap-2 text-sm",
                      active && "bg-secondary/20 text-secondary"
                    )}
                    style={{ color: active ? theme.secondaryColor : theme.mutedColor }}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                );
              })}

              {/* Ir a Aprendizaje */}
              {activeAcademy && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/aprendizaje/${activeAcademy.slug}`)}
                  className="gap-2 text-sm ml-4"
                  style={{ color: theme.primaryColor }}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Ir a Aprendizaje
                </Button>
              )}
            </div>
          )}

          {/* Right side: Academy selector + User */}
          <div className="flex items-center gap-2">
            {/* Selector de academia (solo para admins de centro) */}
            {isAuthenticated && isAcademyAdmin && !isPlatformAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Building2 className="w-4 h-4" style={{ color: theme.secondaryColor }} />
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
                  {userAcademies
                    .filter((a) => a.role === 'owner' || a.role === 'admin')
                    .map((acad) => (
                      <DropdownMenuItem
                        key={acad.id}
                        onClick={() => handleAcademyChange(acad)}
                        className={cn(
                          "cursor-pointer font-serif transition-colors py-2",
                          acad.id === activeAcademy?.id && "bg-secondary/20"
                        )}
                        style={{ color: theme.textColor }}
                      >
                        <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
                        {acad.name}
                      </DropdownMenuItem>
                    ))}
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
                  <DropdownMenuItem onClick={() => navigate('/plataforma/settings')}>
                    <Settings className="w-4 h-4 mr-2" />
                    Configuración
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
                    {/* Nivel actual */}
                    <div className="mb-4 px-2">
                      {isPlatformAdmin && (
                        <span
                          className="px-3 py-1 rounded text-sm font-mono"
                          style={{ backgroundColor: `${theme.primaryColor}30`, color: theme.accentColor }}
                        >
                          <Globe className="w-4 h-4 inline mr-2" />
                          Nivel Plataforma
                        </span>
                      )}
                      {isAcademyAdmin && !isPlatformAdmin && (
                        <span
                          className="px-3 py-1 rounded text-sm font-mono"
                          style={{ backgroundColor: `${theme.secondaryColor}30`, color: theme.secondaryColor }}
                        >
                          <Building2 className="w-4 h-4 inline mr-2" />
                          Nivel Centro
                        </span>
                      )}
                    </div>

                    {platformItems.map((item) => {
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
                              ? "text-accentColor bg-secondary/10"
                              : "text-muted-foreground"
                          )}
                        >
                          <Icon className="w-5 h-5" />
                          {item.label}
                        </Button>
                      );
                    })}

                    {centroItems.map((item) => {
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
                              ? "text-secondary bg-secondary/10"
                              : "text-muted-foreground"
                          )}
                        >
                          <Icon className="w-5 h-5" />
                          {item.label}
                        </Button>
                      );
                    })}

                    {/* Ir a Aprendizaje */}
                    {activeAcademy && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <Button
                          variant="outline"
                          onClick={() => {
                            navigate(`/aprendizaje/${activeAcademy.slug}`);
                            setMobileMenuOpen(false);
                          }}
                          className="w-full justify-start gap-2"
                          style={{ borderColor: theme.primaryColor, color: theme.primaryColor }}
                        >
                          <ArrowLeft className="w-4 h-4" />
                          Ir a Aprendizaje
                        </Button>
                      </div>
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

export default SoberaniaNav;
