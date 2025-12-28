import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LagrangeNav } from '@/components/LagrangeNav';
import { LagrangeFooter } from '@/components/LagrangeFooter';
import { FogOverlay } from '@/components/FogOverlay';
import { LabPromptEditor } from '@/components/LabPromptEditor';
import { SocraticDialogue } from '@/components/SocraticDialogue';
import { NarrativeGenerator } from '@/components/NarrativeGenerator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, PenTool } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const ADMIN_EMAIL = 'sampayo@gmail.com';

const Lab = () => {
  const [activeTab, setActiveTab] = useState('dialogue');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setIsAuthenticated(!!session);
        setIsAdmin(session?.user?.email === ADMIN_EMAIL);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      setIsAdmin(session?.user?.email === ADMIN_EMAIL);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <FogOverlay />
      <LagrangeNav />
      
      <main className="pt-20 md:pt-24 pb-8 md:pb-12 px-4 md:px-6">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8 md:mb-12"
          >
            <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-mono uppercase tracking-wider mb-3 md:mb-4">
              Academia
            </div>
            <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl text-foreground mb-3 md:mb-4">
              El Laboratorio
            </h1>
            <p className="text-muted-foreground font-serif max-w-2xl mx-auto text-sm md:text-base">
              Este no es un espacio para encontrar consuelo. Es un espejo 
              dialéctico que te devuelve preguntas incómodas, no respuestas 
              tranquilizadoras.
            </p>
          </motion.div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="dialogue" className="gap-2">
                <MessageSquare className="w-4 h-4" />
                Diálogo
              </TabsTrigger>
              <TabsTrigger 
                value="generator" 
                className="gap-2"
                disabled={!isAuthenticated}
                title={!isAuthenticated ? "Inicia sesión para acceder al generador" : ""}
              >
                <PenTool className="w-4 h-4" />
                Generador
                {!isAuthenticated && <span className="text-xs ml-1">(login)</span>}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dialogue">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <SocraticDialogue />
              </motion.div>
            </TabsContent>

            <TabsContent value="generator">
              {isAuthenticated ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <NarrativeGenerator isAuthenticated={isAuthenticated} isAdmin={isAdmin} />
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-12"
                >
                  <PenTool className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-serif text-xl text-foreground mb-2">
                    Generador de Textos
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Inicia sesión para generar textos narrativos con IA
                  </p>
                </motion.div>
              )}
            </TabsContent>
          </Tabs>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-8 md:mt-12 p-4 md:p-6 rounded-xl bg-lagrange-tension/5 border border-lagrange-tension/20"
          >
            <h3 className="font-serif text-base md:text-lg text-foreground mb-2 md:mb-3">
              Regla de Oro
            </h3>
            <p className="text-muted-foreground font-serif italic text-sm md:text-base">
              "El sistema rechaza respuestas terapéuticas o soluciones políticas. 
              Solo devuelve contradicciones estructurales. Si el resultado no 
              incomoda, se descarta."
            </p>
          </motion.div>
        </div>
      </main>
      
      <LagrangeFooter />
    </div>
  );
};

export default Lab;
