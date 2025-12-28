import { Mail } from 'lucide-react';

export function LagrangeFooter() {
  return (
    <footer className="border-t border-border/30 bg-background/50 backdrop-blur-sm py-4 mt-auto">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Mail className="w-3 h-3" />
          <span className="font-serif">
            Contacto: <a 
              href="mailto:sampayo@gmail.com" 
              className="hover:text-foreground transition-colors underline-offset-2 hover:underline"
            >
              sampayo@gmail.com
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
