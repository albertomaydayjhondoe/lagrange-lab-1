import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/compartido/ui/button';
import { User, LogIn, Menu, X } from 'lucide-react';
import { supabase } from '@/compartido/lib/supabaseClient';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/compartido/ui/sheet';

const ADMIN_EMAIL = 'sampayo@gmail.com';

const navItems = [
  { path: '/', label: 'Caverna', description: 'La narrativa' },
  { path: '/map', label: 'Dialéctica', description: 'El mapa' },
  { path: '/podcast', label: 'Podcast', description: 'El audio' },
  { path: '/lab', label: 'Academia', description: 'El laboratorio' },
];

const defaultAcademySlug = 'genesis';

export function LagrangeNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [academyName, setAcademyName] = useState('Genesis');

  useEffect(() => {
    const loadAcademy = async () => {
      const { data } = await supabase.from('academies').select('name').eq('slug', defaultAcademySlug).maybeSingle();
      if (data?.name) {
        setAcademyName(data.name);
      }
    };

    loadAcademy();

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

  const allNavItems = isAdmin 
    ? [...navItems, { path: '/admin', label: 'Poder', description: 'El control' }]
    : navItems;

  const handleNavClick = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      {allNavItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          onClick={() => mobile && setMobileMenuOpen(false)}
          className={cn(
            "relative rounded-lg font-serif transition-all duration-300",
            mobile 
              ? "block px-4 py-3 text-lg hover:bg-secondary/50"
              : "px-4 py-2 text-sm hover:bg-secondary/50",
            location.pathname === item.path
              ? "text-primary bg-secondary/30"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <span className="relative z-10">{item.label}</span>
          {!mobile && location.pathname === item.path && (
            <div className="absolute inset-0 rounded-lg border border-primary/30 animate-glow-pulse" />
          )}
        </Link>
      ))}
    </>
  );

  const AuthButton = ({ mobile = false }: { mobile?: boolean }) => (
    isAuthenticated ? (
      <Button
        variant="ghost"
        size={mobile ? "default" : "sm"}
        onClick={() => handleNavClick('/profile')}
        className={cn(
          "gap-2",
          mobile && "w-full justify-start text-lg",
          location.pathname === '/profile' 
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
        onClick={() => handleNavClick('/auth')}
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
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-16">
          <Link 
            to="/" 
            className="flex items-center gap-2 md:gap-3 group"
          >
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
              <span className="text-primary font-serif text-lg">λ</span>
            </div>
            <span className="font-serif text-lg md:text-xl tracking-wide text-foreground">
              Lagrange
            </span>
            <span className="hidden md:inline-flex rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] text-primary">
              {academyName}
            </span>
          </Link>

          {/* Desktop Navigation */}
          {!isMobile && (
            <div className="flex items-center gap-1">
              <NavLinks />
              <div className="ml-2">
                <AuthButton />
              </div>
            </div>
          )}

          {/* Mobile Navigation */}
          {isMobile && (
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] pt-12">
                <div className="flex flex-col gap-2">
                  <NavLinks mobile />
                  <div className="border-t border-border my-4" />
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
