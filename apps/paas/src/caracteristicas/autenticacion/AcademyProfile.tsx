import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/compartido/ui/card';
import { Button } from '@/compartido/ui/button';
import { Loader2, User, LogOut, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/compartido/lib/supabaseClient';

/**
 * AcademyProfile - Perfil de usuario con diálogos guardados
 */
export default function AcademyProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ email: string } | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/research');
        return;
      }

      setUser({ email: session.user.email || '' });
      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Sesión cerrada');
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="font-serif text-3xl text-foreground">Mi Perfil</h1>
                <p className="text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout} className="gap-2">
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </Button>
          </div>
        </motion.div>

        <Card>
          <CardHeader>
            <CardTitle className="font-serif flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Sobre tu cuenta
            </CardTitle>
            <CardDescription>
              Accede a tus diálogos guardados y gestión de preferencias
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Bienvenido a Lagrange Lab. Aquí podrás gestionar tu perfil y acceder 
              a tus sesiones de investigación guardadas.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/research')}>
                Ir a Research Lab
              </Button>
              <Button variant="outline" onClick={() => navigate('/academies')}>
                Mis Academias
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
