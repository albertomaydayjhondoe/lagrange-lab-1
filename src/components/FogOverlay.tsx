import { motion } from 'framer-motion';
import { useUserRole } from '@/hooks/useUserRole';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function FogOverlay() {
  const { isPlaton, loading, isAuthenticated } = useUserRole();

  // Don't show fog for Platon users or while loading
  if (loading || isPlaton) return null;

  return (
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
            onClick={() => window.location.href = 'mailto:sampayo@gmail.com?subject=Acceso%20Platón'}
            className="font-serif"
          >
            Solicitar acceso Platón
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
