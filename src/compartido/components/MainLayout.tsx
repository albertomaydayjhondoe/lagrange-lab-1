import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/compartido/ui/button';
import { 
  Sparkles, 
  Map, 
  GraduationCap, 
  Settings,
  BookOpen,
  User,
  LogIn,
  LogOut,
  Menu,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { supabase, signOut } from '@/compartido/lib/supabaseClient';
import { Sheet, SheetContent, SheetTrigger } from '@/compartido/ui/sheet';
import { Avatar, AvatarFallback } from '@/compartido/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/compartido/ui/dropdown-menu';

/**
 * NAVEGACIÓN PRINCIPAL - Lagrange Lab
 * Arquitectura por pestañas:
 * 1. Oráculo - Chat IA socrático (principal)
 * 2. Biblioteca - RAG universal
 * 3. Mapa - Topología de conocimiento
 * 4. Academias - Gestión de espacios
 */
export function MainLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userInitials, setUserInitials] = useState('');
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Determinar pestaña activa
  const getActiveTab = () => {
    const path = location.pathname;
    if (path === '/' || path.startsWith('/oracle')) return 'oracle';
    if (path.startsWith('/library') || path.startsWith('/rag')) return 'library';
    if (path.startsWith('/map')) return 'map';
    if (path.startsWith('/academies') || path.startsWith('/academia')) return 'academies';
    if (path.startsWith('/config') || path.startsWith('/settings')) return 'config';
    return 'oracle';
  };

  useEffect(() => {
    const loadSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      if (session?.user) {
        setUserEmail(session.user.email);
        const parts = session.user.email?.split('@')[0].split('.') || [];
        setUserInitials(parts.map((p: string) => p[0]?.toUpperCase() || '').join('').slice(0, 2));
      }
      setLoading(false);
    };

    loadSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session);
      if (session?.user) {
        setUserEmail(session.user.email);
        const parts = session.user.email?.split('@')[0].split('.') || [];
        setUserInitials(parts.map((p: string) => p[0]?.toUpperCase() || '').join('').slice(0, 2));
      } else {
        setUserEmail(null);
        setUserInitials('');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navItems = [
    { id: 'oracle', path: '/', label: 'Oráculo', icon: Sparkles },
    { id: 'library', path: '/library', label: 'Biblioteca', icon: BookOpen },
    { id: 'map', path: '/map', label: 'Mapa', icon: Map },
    { id: 'academies', path: '/academies', label: 'Academias', icon: GraduationCap },
    { id: 'config', path: '/config', label: 'Config', icon: Settings },
  ];

  const activeTab = getActiveTab();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <span className="font-serif text-lg text-primary">λ</span>
              </div>
              <span className="font-serif text-lg tracking-wide hidden sm:inline">Lagrange Lab</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id || (item.id === 'oracle' && location.pathname === '/');
                return (
                  <Button
                    key={item.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(item.path)}
                    className={cn(
                      "gap-2 font-serif transition-all",
                      isActive 
                        ? "text-primary bg-primary/10" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className={cn("w-4 h-4", isActive && "animate-pulse")} />
                    {item.label}
                  </Button>
                );
              })}
            </nav>

            {/* Auth */}
            <div className="flex items-center gap-2">
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              ) : isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2">
                      <Avatar className="w-7 h-7">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {userInitials || <User className="w-4 h-4" />}
                        </AvatarFallback>
                      </Avatar>
                      <ChevronDown className="w-3 h-3 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5 text-sm text-muted-foreground truncate">
                      {userEmail}
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/profile')}>
                      <User className="w-4 h-4 mr-2" />
                      Mi Perfil
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/config')}>
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
                  <span className="hidden sm:inline">Entrar</span>
                </Button>
              )}

              {/* Mobile Menu */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden h-9 w-9">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px]">
                  <nav className="flex flex-col gap-2 mt-8">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <Button
                          key={item.id}
                          variant="ghost"
                          onClick={() => {
                            navigate(item.path);
                            setMobileMenuOpen(false);
                          }}
                          className={cn(
                            "justify-start gap-3 text-lg py-6",
                            isActive 
                              ? "text-primary bg-primary/10" 
                              : "text-muted-foreground"
                          )}
                        >
                          <Icon className="w-5 h-5" />
                          {item.label}
                        </Button>
                      );
                    })}
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-14">
        {children}
      </main>
    </div>
  );
}
