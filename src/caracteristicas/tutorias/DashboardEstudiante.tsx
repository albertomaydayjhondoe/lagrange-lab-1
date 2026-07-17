// Dashboard para estudiantes
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  Calendar, 
  CreditCard, 
  Clock, 
  Loader2,
  CheckCircle,
  XCircle,
  MessageSquare
} from 'lucide-react';
import { supabase } from '@/compartido/lib/supabaseClient';
import { formatPrice, formatDate } from './hooks/useTutorias';
import { Button } from '@/compartido/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/compartido/ui/card';
import { Badge } from '@/compartido/ui/badge';

interface BookingWithDetails {
  id: string;
  status: string;
  created_at: string;
  session: {
    id: string;
    title: string;
    scheduled_at: string;
    duration_minutes: number;
    price_cents: number;
    currency: string;
    meeting_link: string;
    subject: { name: string; color: string };
    tutor: { full_name: string };
  };
  payment?: {
    id: string;
    amount_cents: number;
    status: string;
    stripe_payment_intent_id: string;
  };
}

export default function DashboardEstudiante() {
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      setUser(authUser);

      // Get user's bookings
      const { data: bookingsData, error } = await supabase
        .from('session_bookings')
        .select(`
          id,
          status,
          created_at,
          session:tutoring_sessions!inner(
            id,
            title,
            scheduled_at,
            duration_minutes,
            price_cents,
            currency,
            meeting_link,
            subject:subjects(name, color),
            tutor:profiles!tutor_id(full_name)
          )
        `)
        .eq('student_id', authUser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get payments for each booking
      const bookingsWithPayments = await Promise.all(
        (bookingsData || []).map(async (booking: any) => {
          const { data: payment } = await supabase
            .from('payments')
            .select('id, amount_cents, status, stripe_payment_intent_id')
            .eq('booking_id', booking.id)
            .maybeSingle();
          
          return { ...booking, payment };
        })
      );

      setBookings(bookingsWithPayments);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('¿Estás seguro de cancelar esta reserva?')) return;

    try {
      const { error } = await supabase.functions.invoke('cancel-booking', {
        body: { bookingId }
      });

      if (error) throw error;
      loadDashboard();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const handlePay = async (paymentId: string) => {
    try {
      const { data } = await supabase.functions.invoke('process-payment', {
        body: { paymentId, action: 'pay' }
      });

      if (data?.success) {
        alert('¡Pago realizado! (mock)');
        loadDashboard();
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const upcomingBookings = bookings.filter(b => 
    b.session && new Date(b.session.scheduled_at) > new Date()
  );
  const pastBookings = bookings.filter(b => 
    b.session && new Date(b.session.scheduled_at) <= new Date()
  );

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
              <h1 className="text-2xl font-serif text-foreground">Mi Aprendizaje</h1>
              <p className="text-sm text-muted-foreground">
                Tus tutorías y progreso
              </p>
            </div>
            <Link to="/tutorias">
              <Button>
                <BookOpen className="w-4 h-4 mr-2" />
                Nueva Tutoría
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Próximas Sesiones
                </CardTitle>
                <Calendar className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{upcomingBookings.length}</div>
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
                  Sesiones Completadas
                </CardTitle>
                <CheckCircle className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pastBookings.length}</div>
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
                  Total Gastado
                </CardTitle>
                <CreditCard className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatPrice(
                    bookings.reduce((sum, b) => sum + (b.payment?.amount_cents || 0), 0)
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Upcoming Sessions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Próximas Tutorías
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingBookings.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">No tienes tutorías programadas</p>
                <Link to="/tutorias">
                  <Button variant="outline">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Explorar Materias
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="p-4 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-foreground">{booking.session.title}</h4>
                          <Badge
                            style={{ backgroundColor: booking.session.subject.color + '20', color: booking.session.subject.color }}
                          >
                            {booking.session.subject.name}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span>📅 {formatDate(booking.session.scheduled_at)}</span>
                          <span>⏱️ {booking.session.duration_minutes} min</span>
                          <span>👨‍🏫 {booking.session.tutor.full_name}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {booking.payment && booking.payment.status === 'pending' && (
                          <Button size="sm" onClick={() => handlePay(booking.payment!.id)}>
                            Pagar {formatPrice(booking.payment.amount_cents)}
                          </Button>
                        )}
                        {booking.payment && booking.payment.status === 'paid' && (
                          <Badge variant="outline" className="text-green-600">Pagado</Badge>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCancelBooking(booking.id)}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {booking.session.meeting_link && booking.payment?.status === 'paid' && (
                      <div className="mt-3 pt-3 border-t">
                        <a
                          href={booking.session.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          🔗 Unirse a la sesión
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chat con IA */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Tutoría IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              ¿Tienes dudas antes de tu sesión? Puedes chatear con nuestro tutor IA 
              en cualquier materia para resolver dudas o practicar.
            </p>
            <Link to="/tutorias">
              <Button variant="outline">
                <MessageSquare className="w-4 h-4 mr-2" />
                Ir al Chat IA
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
