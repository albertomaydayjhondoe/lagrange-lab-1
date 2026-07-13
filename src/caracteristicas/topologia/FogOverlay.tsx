import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserRole } from '@/caracteristicas/academia/hooks/useAcademyRole';
import { Lock, Send, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/compartido/ui/button';
import { Input } from '@/compartido/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/compartido/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/compartido/lib/supabaseClient';

interface FogOverlayProps {
  activeAxis?: string | null;
  dominantAxis?: string | null; // The narrative center (most active this week)
  proximityToCenter?: number; // 0-1, how close user is to center
}

interface FogTeaser {
  teaser: string;
  source: 'generated' | 'cache' | 'fallback';
  proximityToCenter?: number;
  fogIntensity?: number;
}

export function FogOverlay({ activeAxis, dominantAxis, proximityToCenter = 0.5 }: FogOverlayProps) {
  const { isPlaton, loading, isAuthenticated } = useUserRole();
  const [showContactForm, setShowContactForm] = useState(false);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  
  // Dynamic fog state
  const [teaser, setTeaser] = useState<FogTeaser | null>(null);
  const [isLoadingTeaser, setIsLoadingTeaser] = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);

  // Calculate fog intensity based on proximity
  const fogIntensity = Math.max(0.3, Math.min(0.95, 0.7 + (0.5 - proximityToCenter) * 0.4));

  // Fetch fog teaser
  const fetchTeaser = useCallback(async () => {
    if (!activeAxis) return;
    
    setIsLoadingTeaser(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fog-teaser`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          activeAxis,
          dominantAxis,
          proximityToCenter,
        }),
      });

      if (response.ok) {
        const data: FogTeaser = await response.json();
        setTeaser(data);
        setShowTeaser(true);
        
        // Hide teaser after 8 seconds
        setTimeout(() => setShowTeaser(false), 8000);
      }
    } catch (error) {
      console.error('Error fetching fog teaser:', error);
    } finally {
      setIsLoadingTeaser(false);
    }
  }, [activeAxis, dominantAxis, proximityToCenter]);

  // Show teaser periodically when near content
  useEffect(() => {
    if (!activeAxis || isPlaton) return;

    // Show teaser on mount
    const initialTimer = setTimeout(fetchTeaser, 3000);

    // Show teaser every 2 minutes if user is close to center
    const periodicInterval = setInterval(() => {
      if (proximityToCenter > 0.3) {
        fetchTeaser();
      }
    }, 120000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(periodicInterval);
    };
  }, [activeAxis, proximityToCenter, fetchTeaser, isPlaton]);

  // Don't show fog for Platon users or while loading
  if (loading || isPlaton) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !email.includes('@')) {
      toast.error('Ingresa un correo válido');
      return;
    }

    setSending(true);
    
    try {
      // Get current user if authenticated
      const { data: { user } } = await supabase.auth.getUser();
      
      // Insert access request into database
      const { error } = await supabase
        .from('access_requests')
        .insert({
          email: email.trim(),
          user_id: user?.id || null,
          status: 'pending'
        });

      if (error) throw error;

      toast.success('Solicitud enviada correctamente. Te contactaremos pronto.');
      setShowContactForm(false);
      setEmail('');
    } catch (error: any) {
      console.error('Error submitting request:', error);
      toast.error('Error al enviar la solicitud. Intenta de nuevo.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1.5 }}
        className="fixed inset-0 pointer-events-none z-40"
        style={{
          background: `
            radial-gradient(ellipse at center, transparent 0%, transparent ${Math.max(10, 30 - proximityToCenter * 20)}%, hsl(var(--background) / ${fogIntensity * 0.4}) ${50 - proximityToCenter * 10}%, hsl(var(--background) / ${fogIntensity}) 70%, hsl(var(--background) / ${Math.min(0.95, fogIntensity + 0.1)}) 100%)
          `,
        }}
      >
        {/* Dynamic fog effect at edges */}
        <div 
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(to bottom, transparent 0%, transparent ${60 - proximityToCenter * 15}%, hsl(var(--background) / ${fogIntensity * 0.7}) ${80 - proximityToCenter * 10}%, hsl(var(--background) / ${fogIntensity}) 100%),
              linear-gradient(to right, hsl(var(--background) / ${fogIntensity * 0.8}) 0%, transparent ${10 + proximityToCenter * 10}%, transparent ${90 - proximityToCenter * 10}%, hsl(var(--background) / ${fogIntensity * 0.8}) 100%)
            `,
          }}
        />
        
        {/* Poetic teaser overlay */}
        <AnimatePresence>
          {showTeaser && teaser && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.8 }}
              className="absolute top-1/4 left-1/2 -translate-x-1/2 pointer-events-none text-center max-w-md px-4"
            >
              <div className="relative">
                {/* Decorative quotes */}
                <span className="absolute -left-4 top-0 text-4xl text-primary/20 font-serif">"</span>
                <span className="absolute -right-4 bottom-0 text-4xl text-primary/20 font-serif rotate-180">"</span>
                
                <p className="font-serif text-lg md:text-xl text-foreground/80 italic leading-relaxed px-6">
                  {teaser.teaser}
                </p>
                
                {/* Source indicator */}
                <div className="mt-3 flex items-center justify-center gap-2">
                  <EyeOff className="w-3 h-3 text-muted-foreground/50" />
                  <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-wider">
                    {teaser.source === 'generated' ? 'susurro del oráculo' : 
                     teaser.source === 'cache' ? 'eco anterior' : 'niebla speak'}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Proximity indicator (debug visual) */}
        <div className="absolute bottom-4 right-4 pointer-events-none opacity-30">
          <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
            <span>Niebla:</span>
            <div className="w-12 h-1 bg-muted-foreground/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary/50 rounded-full transition-all duration-500"
                style={{ width: `${fogIntensity * 100}%` }}
              />
            </div>
          </div>
        </div>
        
        {/* CTA at bottom */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 3, duration: 0.8 }}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 pointer-events-auto text-center"
        >
          <div className="bg-card/90 backdrop-blur-md border border-border/50 rounded-xl p-6 shadow-lg max-w-md mx-4">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Lock className="w-6 h-6 text-primary/70" />
              {activeAxis && (
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-mono">
                  {activeAxis}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground font-serif mb-4">
              {isAuthenticated 
                ? 'Acceso completo disponible para miembros Platón'
                : 'Inicia sesión o únete a Platón para ver sin límites'
              }
            </p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowContactForm(true)}
              className="font-serif"
            >
              Solicitar acceso Platón
            </Button>
          </div>
        </motion.div>
      </motion.div>

      {/* Contact Form Popup */}
      <Dialog open={showContactForm} onOpenChange={setShowContactForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Acceso Platón</DialogTitle>
            <DialogDescription>
              Ingresa tu correo para solicitar acceso completo al Sistema Lagrange.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div>
              <Input
                type="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full"
                required
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setShowContactForm(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={sending} className="gap-2">
                <Send className="w-4 h-4" />
                Enviar solicitud
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
