import { useState } from 'react';
import { motion } from 'framer-motion';
import { useUserRole } from '@/hooks/useUserRole';
import { Lock, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export function FogOverlay() {
  const { isPlaton, loading, isAuthenticated } = useUserRole();
  const [showContactForm, setShowContactForm] = useState(false);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

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
            radial-gradient(ellipse at center, transparent 0%, transparent 30%, hsl(var(--background) / 0.3) 50%, hsl(var(--background) / 0.7) 70%, hsl(var(--background) / 0.9) 100%)
          `,
        }}
      >
        {/* Subtle fog effect at edges */}
        <div 
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(to bottom, transparent 0%, transparent 60%, hsl(var(--background) / 0.5) 80%, hsl(var(--background) / 0.8) 100%),
              linear-gradient(to right, hsl(var(--background) / 0.6) 0%, transparent 15%, transparent 85%, hsl(var(--background) / 0.6) 100%)
            `,
          }}
        />
        
        {/* CTA at bottom */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 3, duration: 0.8 }}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 pointer-events-auto text-center"
        >
          <div className="bg-card/90 backdrop-blur-md border border-border/50 rounded-xl p-6 shadow-lg max-w-md mx-4">
            <Lock className="w-8 h-8 mx-auto mb-3 text-primary/70" />
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
