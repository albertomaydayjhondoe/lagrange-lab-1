import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { LagrangeNav } from '@/components/LagrangeNav';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Lock, Database, Network, MessageSquare, LogOut, Loader2, RefreshCw } from 'lucide-react';
import { NodeEditor } from '@/components/admin/NodeEditor';
import { EdgeEditor } from '@/components/admin/EdgeEditor';
import { QuestionEditor } from '@/components/admin/QuestionEditor';
import type { User, Session } from '@supabase/supabase-js';

const ADMIN_EMAIL = 'sampayo@gmail.com';

interface TopologyNode {
  id: string;
  label: string;
  description: string | null;
  x: number;
  y: number;
  weight: number;
  color: string;
  axis: string;
  type: string;
  corpus_refs: string[] | null;
  question_count: number | null;
}

interface TopologyEdge {
  id: string;
  source: string;
  target: string;
  tension: number;
  label: string | null;
  type: string;
}

interface SocraticQuestion {
  id: string;
  eje: string;
  nivel: number;
  tension: number;
  texto: string;
  corpus_ref: string | null;
}

const Admin = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [nodes, setNodes] = useState<TopologyNode[]>([]);
  const [edges, setEdges] = useState<TopologyEdge[]>([]);
  const [questions, setQuestions] = useState<SocraticQuestion[]>([]);
  const navigate = useNavigate();

  const isAdmin = user?.email === ADMIN_EMAIL;

  const fetchData = useCallback(async () => {
    setDataLoading(true);
    
    const [nodesRes, edgesRes, questionsRes] = await Promise.all([
      supabase.from('topology_nodes').select('*').order('id'),
      supabase.from('topology_edges').select('*').order('id'),
      supabase.from('socratic_questions').select('*').order('id')
    ]);

    if (nodesRes.data) setNodes(nodesRes.data);
    if (edgesRes.data) setEdges(edgesRes.data);
    if (questionsRes.data) setQuestions(questionsRes.data);
    
    setDataLoading(false);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session, fetchData]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
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
              onClick={() => navigate('/auth')}
              className="font-serif bg-primary hover:bg-primary/90"
            >
              Iniciar Sesión
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
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="inline-block px-3 py-1 rounded-full bg-lagrange-tension/10 text-lagrange-tension text-xs font-mono uppercase tracking-wider mb-2">
                  {isAdmin ? 'God Mode' : 'Modo Lectura'}
                </div>
                <h1 className="font-serif text-4xl text-foreground">
                  Panel de Control
                </h1>
                <p className="text-sm text-muted-foreground mt-1 font-mono">
                  {user?.email}
                  {!isAdmin && ' (solo lectura)'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={fetchData}
                  disabled={dataLoading}
                  className="font-mono text-sm gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${dataLoading ? 'animate-spin' : ''}`} />
                  Refrescar
                </Button>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="font-mono text-sm gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar sesión
                </Button>
              </div>
            </div>
          </motion.div>

          {dataLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <Tabs defaultValue="nodes" className="space-y-6">
                <TabsList className="bg-card border border-border">
                  <TabsTrigger value="nodes" className="font-mono text-sm gap-2">
                    <Database className="w-4 h-4" />
                    Nodos ({nodes.length})
                  </TabsTrigger>
                  <TabsTrigger value="edges" className="font-mono text-sm gap-2">
                    <Network className="w-4 h-4" />
                    Tensiones ({edges.length})
                  </TabsTrigger>
                  <TabsTrigger value="questions" className="font-mono text-sm gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Preguntas ({questions.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="nodes">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-card rounded-xl border border-border p-6"
                  >
                    <h2 className="font-serif text-xl mb-4">Nodos de la Topología</h2>
                    <NodeEditor nodes={nodes} onRefresh={fetchData} isAdmin={isAdmin} />
                  </motion.div>
                </TabsContent>

                <TabsContent value="edges">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-card rounded-xl border border-border p-6"
                  >
                    <h2 className="font-serif text-xl mb-4">Tensiones entre Nodos</h2>
                    <EdgeEditor 
                      edges={edges} 
                      nodes={nodes.map(n => ({ id: n.id, label: n.label }))} 
                      onRefresh={fetchData} 
                      isAdmin={isAdmin} 
                    />
                  </motion.div>
                </TabsContent>

                <TabsContent value="questions">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-card rounded-xl border border-border p-6"
                  >
                    <h2 className="font-serif text-xl mb-4">Preguntas Socráticas</h2>
                    <QuestionEditor questions={questions} onRefresh={fetchData} isAdmin={isAdmin} />
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
                  <span className="text-3xl font-mono text-primary">{nodes.length}</span>
                  <p className="text-sm text-muted-foreground">Nodos activos</p>
                </div>
                <div className="p-4 rounded-lg bg-card border border-border">
                  <span className="text-3xl font-mono text-lagrange-node">{edges.length}</span>
                  <p className="text-sm text-muted-foreground">Tensiones mapeadas</p>
                </div>
                <div className="p-4 rounded-lg bg-card border border-border">
                  <span className="text-3xl font-mono text-lagrange-calm">{questions.length}</span>
                  <p className="text-sm text-muted-foreground">Preguntas socráticas</p>
                </div>
              </motion.div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Admin;
