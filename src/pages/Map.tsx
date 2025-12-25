import { motion } from 'framer-motion';
import { LagrangeNav } from '@/components/LagrangeNav';
import { LagrangeMap } from '@/components/LagrangeMap';

const Map = () => {
  return (
    <div className="min-h-screen bg-background">
      <LagrangeNav />
      
      <main className="pt-24 pb-12 px-6">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
              Mapa Dialéctico
            </h1>
            <p className="text-muted-foreground font-serif max-w-2xl mx-auto">
              Un grafo de tensiones. Los nodos no representan conceptos estáticos, 
              sino campos de fuerza que se intensifican con tu interacción.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border p-8"
          >
            <LagrangeMap />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-12 grid md:grid-cols-3 gap-6"
          >
            <div className="p-6 rounded-xl bg-card border border-border">
              <div className="w-4 h-4 rounded-full bg-lagrange-tension/50 mb-4" />
              <h3 className="font-serif text-lg text-foreground mb-2">Tensión Alta</h3>
              <p className="text-sm text-muted-foreground">
                Nodos en conflicto activo. La fricción genera movimiento crítico.
              </p>
            </div>
            <div className="p-6 rounded-xl bg-card border border-border">
              <div className="w-4 h-4 rounded-full bg-lagrange-node/50 mb-4" />
              <h3 className="font-serif text-lg text-foreground mb-2">Conexión</h3>
              <p className="text-sm text-muted-foreground">
                Relaciones estructurales entre campos de poder y control.
              </p>
            </div>
            <div className="p-6 rounded-xl bg-card border border-border">
              <div className="w-4 h-4 rounded-full bg-primary/50 mb-4" />
              <h3 className="font-serif text-lg text-foreground mb-2">Punto de Inflexión</h3>
              <p className="text-sm text-muted-foreground">
                Donde la pregunta correcta puede desestabilizar el sistema.
              </p>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Map;
