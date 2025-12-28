import { useState } from 'react';
import { motion } from 'framer-motion';
import { LagrangeNav } from '@/components/LagrangeNav';
import { LabPromptEditor } from '@/components/LabPromptEditor';
import { SocraticDialogue } from '@/components/SocraticDialogue';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, FlaskConical } from 'lucide-react';

const Lab = () => {
  const [activeTab, setActiveTab] = useState('dialogue');

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

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="dialogue" className="gap-2">
                <MessageSquare className="w-4 h-4" />
                Diálogo Continuo
              </TabsTrigger>
              <TabsTrigger value="prompt" className="gap-2">
                <FlaskConical className="w-4 h-4" />
                Editor de Prompts
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

            <TabsContent value="prompt">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border p-8"
              >
                <LabPromptEditor />
              </motion.div>
            </TabsContent>
          </Tabs>

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
