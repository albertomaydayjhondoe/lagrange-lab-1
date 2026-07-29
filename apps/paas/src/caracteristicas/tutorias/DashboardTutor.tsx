// Dashboard para tutores
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  DollarSign, 
  Users, 
  Clock, 
  Plus, 
  TrendingUp,
  Loader2,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { supabase } from '@/compartido/lib/supabaseClient';
import { formatPrice, formatDate } from './hooks/useTutorias';
import { Button } from '@/compartido/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/compartido/ui/card';

interface TutorStats {
  totalSessions: number;
  completedSessions: number;
  totalStudents: number;
  totalEarnings: number;
  avgRating: number;
  upcomingSessions: number;
}

interface UpcomingSession {
  id: string;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  student_name: string;
  status: string;
}

export default function DashboardTutor() {
  const [stats, setStats] = useState<TutorStats | null>(null);
  const [upcomingSessions, setUpcomingSessions] = useState<UpcomingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      // Get current user
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      setUser(authUser);

      // Get tutor profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profile?.role !== 'tutor' && profile?.role !== 'admin') {
        alert('No tienes permisos de tutor');
        return;
      }

      // Get stats from RPC
      const { data: statsData } = await supabase.rpc('get_tutor_stats', {
        p_tutor_id: authUser.id
      });

      if (statsData) {
        setStats({
          totalSessions: statsData.total_sessions || 0,
          completedSessions: statsData.completed_sessions || 0,
          totalStudents: statsData.total_students || 0,
          totalEarnings: statsData.total_earnings_cents || 0,
          avgRating: parseFloat(statsData.avg_rating) || 0,
          upcomingSessions: statsData.upcoming_sessions || 0,
        });
      }

      // Get upcoming sessions
      const { data: sessions } = await supabase
        .from('tutoring_sessions')
        .select(`
          id,
          title,
          scheduled_at,
          duration_minutes,
          status,
          session_bookings!inner(
            student:profiles!student_id(full_name)
          )
        `)
        .eq('tutor_id', authUser.id)
        .eq('status', 'scheduled')
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at')
        .limit(5);

      setUpcomingSessions(sessions?.map(s => ({
        id: s.id,
        title: s.title,
        scheduled_at: s.scheduled_at,
        duration_minutes: s.duration_minutes,
        student_name: (s.session_bookings as any[])?.[0]?.student?.full_name || 'Sin estudiante',
        status: s.status,
      })) || []);

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-serif text-foreground">Panel de Tutor</h1>
              <p className="text-sm text-muted-foreground">
                Bienvenido{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ''}
              </p>
            </div>
            <Link to="/tutorias/crear-sesion">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nueva Sesión
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="container mx-auto px-4 py-8">
        {/* Simulated Payment Notice */}
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-3">
          <div className="text-amber-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <div>
            <p className="font-medium text-amber-500">Modo Simulación</p>
            <p className="text-sm text-amber-500/80">
              Los cobros son simulados — no se genera dinero real. 
              Los pagos mostrados son datos de prueba para demostración del sistema.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Sesiones Totales
                </CardTitle>
                <Calendar className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalSessions || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.completedSessions || 0} completadas
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Ingresos Totales
                </CardTitle>
                <DollarSign className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatPrice(stats?.totalEarnings || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Ganancias acumuladas
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Estudiantes
                </CardTitle>
                <Users className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalStudents || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Únicos atendidos
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Próximas Sesiones
                </CardTitle>
                <Clock className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.upcomingSessions || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Programadas
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Upcoming Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Próximas Sesiones
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingSessions.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No hay sesiones programadas</p>
                <Link to="/tutorias/crear-sesion" className="mt-3 inline-block">
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Crear primera sesión
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <h4 className="font-medium text-foreground">{session.title}</h4>
                      <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                        <span>{formatDate(session.scheduled_at)}</span>
                        <span>·</span>
                        <span>{session.duration_minutes} min</span>
                        <span>·</span>
                        <span>👤 {session.student_name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-sm text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        Confirmada
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <Link to="/tutorias/mis-materiales">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">Gestionar Materiales</h4>
                    <p className="text-sm text-muted-foreground">Sube y organiza contenido RAG</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/tutorias/mis-sesiones">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">Ver Todas las Sesiones</h4>
                    <p className="text-sm text-muted-foreground">Historial y estadísticas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/tutorias/pagos">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">Mis Pagos</h4>
                    <p className="text-sm text-muted-foreground">Historial de cobros</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
