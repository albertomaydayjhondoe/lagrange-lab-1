import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { LagrangeNav } from '@/components/LagrangeNav';
import { LagrangeFooter } from '@/components/LagrangeFooter';
import { FogOverlay } from '@/components/FogOverlay';
import { SocraticOracle } from '@/components/SocraticOracle';
import { ArrowRight, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <FogOverlay />
      <LagrangeNav />
      
      {/* Hero Section - La Caverna */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Background effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-lagrange-node/5 rounded-full blur-3xl" />
        </div>

        <div className="container px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            {/* Symbol */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="mb-8"
            >
              <div className="w-24 h-24 mx-auto rounded-full border-2 border-primary/30 flex items-center justify-center animate-glow-pulse">
                <span className="text-5xl font-serif text-primary">λ</span>
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-5xl md:text-7xl lg:text-8xl font-serif tracking-tight mb-6"
            >
              <span className="text-foreground">Sistema</span>{' '}
              <span className="text-shimmer">Lagrange</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-xl md:text-2xl text-muted-foreground font-serif mb-4 leading-relaxed"
            >
              Un espejo crítico para examinar las contradicciones
              <br />
              que sostienen estructuras de poder y control.
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-lg text-muted-foreground/70 font-serif mb-12 italic"
            >
              "Si el resultado no incomoda, se descarta."
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="flex flex-wrap justify-center gap-4"
            >
              <Button
                asChild
                size="lg"
                className="font-serif text-lg gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Link to="/map">
                  Explorar el Mapa
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="font-serif text-lg border-border hover:bg-secondary"
              >
                <Link to="/lab">
                  Entrar al Laboratorio
                </Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex justify-center pt-2"
          >
            <Circle className="w-1.5 h-1.5 fill-muted-foreground/50 text-muted-foreground/50" />
          </motion.div>
        </motion.div>
      </section>

      {/* Oráculo Socrático Section */}
      <section className="py-24 px-6 border-t border-border/50">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="font-serif text-3xl md:text-4xl text-foreground mb-4">
              El Oráculo
            </h2>
            <p className="text-muted-foreground font-serif">
              No busques respuestas. Encuentra las preguntas correctas.
            </p>
          </motion.div>

          <SocraticOracle />
        </div>
      </section>

      {/* Los 5 Ejes */}
      <section className="py-24 px-6 border-t border-border/50">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-serif text-3xl md:text-4xl text-foreground mb-4">
              Los Cinco Ejes
            </h2>
            <p className="text-muted-foreground font-serif max-w-2xl mx-auto">
              No son conceptos estáticos, sino fuerzas operativas que configuran 
              la realidad social y psicológica.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-5 gap-6">
            {[
              { id: 'miedo', label: 'Miedo', desc: 'Cómo opera', color: 'bg-lagrange-tension/20 border-lagrange-tension/30' },
              { id: 'control', label: 'Control', desc: 'Quién ejerce', color: 'bg-lagrange-node/20 border-lagrange-node/30' },
              { id: 'salud', label: 'Salud Mental', desc: 'Qué patologiza', color: 'bg-lagrange-calm/20 border-lagrange-calm/30' },
              { id: 'legitimidad', label: 'Legitimidad', desc: 'Quién define', color: 'bg-primary/20 border-primary/30' },
              { id: 'responsabilidad', label: 'Responsabilidad', desc: 'Cómo se distribuye', color: 'bg-lagrange-node/20 border-lagrange-node/30' },
            ].map((eje, index) => (
              <motion.div
                key={eje.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`p-6 rounded-xl border ${eje.color} text-center hover:scale-105 transition-transform cursor-pointer`}
              >
                <h3 className="font-serif text-lg text-foreground mb-1">
                  {eje.label}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {eje.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border/50">
        <div className="container mx-auto text-center">
          <p className="text-muted-foreground font-serif text-sm">
            Sistema Lagrange · Un artefacto de resistencia cognitiva
          </p>
        </div>
      </footer>
      
      <LagrangeFooter />
    </div>
  );
};

export default Index;
