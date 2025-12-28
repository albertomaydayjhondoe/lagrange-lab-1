import { motion } from 'framer-motion';
import { LagrangeNav } from '@/components/LagrangeNav';
import { LagrangeFooter } from '@/components/LagrangeFooter';
import { FogOverlay } from '@/components/FogOverlay';
import { LagrangeMap } from '@/components/LagrangeMap';

const Map = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <FogOverlay />
      <LagrangeNav />
      
      <main className="pt-20 md:pt-24 pb-8 md:pb-12 px-4 md:px-6">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6 md:mb-12"
          >
            <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl text-foreground mb-3 md:mb-4">
              Mapa Dialéctico
            </h1>
            <p className="text-muted-foreground font-serif max-w-2xl mx-auto text-sm md:text-base">
              Un grafo de tensiones. Los nodos no representan conceptos estáticos, 
              sino campos de fuerza que se intensifican con tu interacción.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-card/50 backdrop-blur-sm rounded-xl md:rounded-2xl border border-border p-4 md:p-8"
          >
            <LagrangeMap />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6 md:mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6"
          >
            <div className="p-4 md:p-6 rounded-xl bg-card border border-border">
              <div className="w-4 h-4 rounded-full bg-lagrange-tension/50 mb-3 md:mb-4" />
              <h3 className="font-serif text-base md:text-lg text-foreground mb-2">Tensión Alta</h3>
              <p className="text-xs md:text-sm text-muted-foreground">
                Nodos en conflicto activo. La fricción genera movimiento crítico.
              </p>
            </div>
            <div className="p-4 md:p-6 rounded-xl bg-card border border-border">
              <div className="w-4 h-4 rounded-full bg-lagrange-node/50 mb-3 md:mb-4" />
              <h3 className="font-serif text-base md:text-lg text-foreground mb-2">Conexión</h3>
              <p className="text-xs md:text-sm text-muted-foreground">
                Relaciones estructurales entre campos de poder y control.
              </p>
            </div>
            <div className="p-4 md:p-6 rounded-xl bg-card border border-border">
              <div className="w-4 h-4 rounded-full bg-primary/50 mb-3 md:mb-4" />
              <h3 className="font-serif text-base md:text-lg text-foreground mb-2">Punto de Inflexión</h3>
              <p className="text-xs md:text-sm text-muted-foreground">
                Donde la pregunta correcta puede desestabilizar el sistema.
              </p>
            </div>
          </motion.div>
        </div>
      </main>
      
      <LagrangeFooter />
    </div>
  );
};

export default Map;
