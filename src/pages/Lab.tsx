import { motion } from 'framer-motion';
import { LagrangeNav } from '@/components/LagrangeNav';
import { LabPromptEditor } from '@/components/LabPromptEditor';

const Lab = () => {
  return (
    <div className="min-h-screen bg-background">
      <LagrangeNav />
      
      <main className="pt-24 pb-12 px-6">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-mono uppercase tracking-wider mb-4">
              Academia
            </div>
            <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
              El Laboratorio
            </h1>
            <p className="text-muted-foreground font-serif max-w-2xl mx-auto">
              Este no es un espacio para encontrar consuelo. Es un espejo 
              dialéctico que te devuelve preguntas incómodas, no respuestas 
              tranquilizadoras.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border p-8"
          >
            <LabPromptEditor />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-12 p-6 rounded-xl bg-lagrange-tension/5 border border-lagrange-tension/20"
          >
            <h3 className="font-serif text-lg text-foreground mb-3">
              Regla de Oro
            </h3>
            <p className="text-muted-foreground font-serif italic">
              "El sistema rechaza respuestas terapéuticas o soluciones políticas. 
              Solo devuelve contradicciones estructurales. Si el resultado no 
              incomoda, se descarta."
            </p>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Lab;
