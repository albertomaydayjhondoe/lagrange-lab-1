import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { User, LogIn } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const ADMIN_EMAIL = 'sampayo@gmail.com';

const navItems = [
  { path: '/', label: 'Caverna', description: 'La narrativa' },
  { path: '/map', label: 'Dialéctica', description: 'El mapa' },
  { path: '/podcast', label: 'Podcast', description: 'El audio' },
  { path: '/lab', label: 'Academia', description: 'El laboratorio' },
];

export function LagrangeNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
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

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <Link 
            to="/" 
            className="flex items-center gap-3 group"
          >
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
              <span className="text-primary font-serif text-lg">λ</span>
            </div>
            <span className="font-serif text-xl tracking-wide text-foreground">
              Lagrange
            </span>
          </Link>

          <div className="flex items-center gap-1">
            {allNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "relative px-4 py-2 rounded-lg font-serif text-sm transition-all duration-300",
                  "hover:bg-secondary/50",
                  location.pathname === item.path
                    ? "text-primary bg-secondary/30"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="relative z-10">{item.label}</span>
                {location.pathname === item.path && (
                  <div className="absolute inset-0 rounded-lg border border-primary/30 animate-glow-pulse" />
                )}
              </Link>
            ))}

            {/* Auth button */}
            {isAuthenticated ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/profile')}
                className={cn(
                  "ml-2 gap-2",
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
                size="sm"
                onClick={() => navigate('/auth')}
                className="ml-2 gap-2 text-muted-foreground hover:text-foreground"
              >
                <LogIn className="w-4 h-4" />
                Entrar
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
