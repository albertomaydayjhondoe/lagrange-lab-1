import { useState } from 'react';
import { motion } from 'framer-motion';
import { LagrangeNav } from '@/components/LagrangeNav';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Lock, Database, Network, MessageSquare } from 'lucide-react';
import nodesData from '@/data/topology/nodes.json';
import edgesData from '@/data/topology/edges.json';
import questionsData from '@/data/topology/socratic_questions.json';

const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <LagrangeNav />
        
        <main className="pt-24 pb-12 px-6 flex items-center justify-center min-h-[80vh]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-md"
          >
            <div className="w-20 h-20 mx-auto rounded-full bg-secondary flex items-center justify-center mb-6">
              <Lock className="w-8 h-8 text-muted-foreground" />
            </div>
            <h1 className="font-serif text-3xl text-foreground mb-4">
              El Poder
            </h1>
            <p className="text-muted-foreground font-serif mb-8">
              Acceso restringido. Este es el nivel de control absoluto sobre 
              el sistema. God mode.
            </p>
            <Button
              onClick={() => setIsAuthenticated(true)}
              className="font-serif bg-primary hover:bg-primary/90"
            >
              Acceder (Demo)
            </Button>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <LagrangeNav />
      
      <main className="pt-24 pb-12 px-6">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="inline-block px-3 py-1 rounded-full bg-lagrange-tension/10 text-lagrange-tension text-xs font-mono uppercase tracking-wider mb-2">
                  God Mode
                </div>
                <h1 className="font-serif text-4xl text-foreground">
                  Panel de Control
                </h1>
              </div>
              <Button
                variant="outline"
                onClick={() => setIsAuthenticated(false)}
                className="font-mono text-sm"
              >
                Cerrar sesión
              </Button>
            </div>
          </motion.div>

          <Tabs defaultValue="nodes" className="space-y-6">
            <TabsList className="bg-card border border-border">
              <TabsTrigger value="nodes" className="font-mono text-sm gap-2">
                <Database className="w-4 h-4" />
                Nodos
              </TabsTrigger>
              <TabsTrigger value="edges" className="font-mono text-sm gap-2">
                <Network className="w-4 h-4" />
                Tensiones
              </TabsTrigger>
              <TabsTrigger value="questions" className="font-mono text-sm gap-2">
                <MessageSquare className="w-4 h-4" />
                Preguntas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="nodes">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-card rounded-xl border border-border p-6"
              >
                <h2 className="font-serif text-xl mb-4">nodes.json</h2>
                <pre className="bg-secondary/50 rounded-lg p-4 overflow-auto max-h-[500px] text-sm font-mono text-muted-foreground">
                  {JSON.stringify(nodesData, null, 2)}
                </pre>
              </motion.div>
            </TabsContent>

            <TabsContent value="edges">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-card rounded-xl border border-border p-6"
              >
                <h2 className="font-serif text-xl mb-4">edges.json</h2>
                <pre className="bg-secondary/50 rounded-lg p-4 overflow-auto max-h-[500px] text-sm font-mono text-muted-foreground">
                  {JSON.stringify(edgesData, null, 2)}
                </pre>
              </motion.div>
            </TabsContent>

            <TabsContent value="questions">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-card rounded-xl border border-border p-6"
              >
                <h2 className="font-serif text-xl mb-4">socratic_questions.json</h2>
                <pre className="bg-secondary/50 rounded-lg p-4 overflow-auto max-h-[500px] text-sm font-mono text-muted-foreground">
                  {JSON.stringify(questionsData, null, 2)}
                </pre>
              </motion.div>
            </TabsContent>
          </Tabs>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8 grid md:grid-cols-3 gap-4"
          >
            <div className="p-4 rounded-lg bg-card border border-border">
              <span className="text-3xl font-mono text-primary">{nodesData.length}</span>
              <p className="text-sm text-muted-foreground">Nodos activos</p>
            </div>
            <div className="p-4 rounded-lg bg-card border border-border">
              <span className="text-3xl font-mono text-lagrange-node">{edgesData.length}</span>
              <p className="text-sm text-muted-foreground">Tensiones mapeadas</p>
            </div>
            <div className="p-4 rounded-lg bg-card border border-border">
              <span className="text-3xl font-mono text-lagrange-calm">{questionsData.length}</span>
              <p className="text-sm text-muted-foreground">Preguntas socráticas</p>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Admin;
