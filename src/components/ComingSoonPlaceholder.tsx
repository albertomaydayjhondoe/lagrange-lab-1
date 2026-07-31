/**
 * ComingSoonPlaceholder - Componente para módulos fuera de scope
 * 
 * Muestra un mensaje de "Próximamente en Academia Lexis" 
 * manteniendo el layout de la aplicación.
 */

import { Clock, BookOpen, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/compartido/ui/card';

interface ComingSoonPlaceholderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

export function ComingSoonPlaceholder({ 
  title, 
  description,
  icon = <Sparkles className="w-12 h-12 text-primary" />
}: ComingSoonPlaceholderProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <Card className="max-w-md w-full text-center border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="pt-8 pb-8">
          {/* Icono animado */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
              <div className="relative bg-primary/10 rounded-full p-4">
                {icon}
              </div>
            </div>
          </div>

          {/* Badge "Próximamente" */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Clock className="w-4 h-4" />
            Próximamente
          </div>

          {/* Título */}
          <h2 className="text-2xl font-serif mb-3">
            {title}
          </h2>

          {/* Descripción */}
          {description && (
            <p className="text-muted-foreground mb-6">
              {description}
            </p>
          )}

          {/* Mensaje de Academia Lexis */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground/70 pt-4 border-t border-border/50">
            <BookOpen className="w-4 h-4" />
            <span>Academia Lexis</span>
          </div>

          {/* Call to action temporal */}
          <div className="mt-6 p-4 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">
              Mientras tanto, puedes explorar el{' '}
              <a href="/carrera/academia-lexis/oraculo" className="text-primary hover:underline">
                Oráculo Socrático
              </a>{' '}
              o{' '}
              <a href="/carrera/academia-lexis/materia/paau/lengua/aportar" className="text-primary hover:underline">
                aportar materiales
              </a>{' '}
              a la biblioteca RAG.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Wrapper para componentes deshabilitados por feature flag
 */
export function withFeatureFlag<P extends object>(
  Component: React.ComponentType<P>,
  featureName: keyof typeof import('@/config/featureFlags').FEATURE_FLAGS,
  placeholderProps: { title: string; description?: string }
) {
  return function WrappedComponent(props: P) {
    const { isFeatureEnabled } = require('@/config/featureFlags');
    
    if (!isFeatureEnabled(featureName as any)) {
      return (
        <ComingSoonPlaceholder 
          title={placeholderProps.title} 
          description={placeholderProps.description}
        />
      );
    }
    
    return <Component {...props} />;
  };
}

export default ComingSoonPlaceholder;
