import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { LagrangeNav } from '@/components/LagrangeNav';
import { LagrangeFooter } from '@/components/LagrangeFooter';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Lock, Database, Network, MessageSquare, LogOut, Loader2, RefreshCw, Download, Upload, Volume2, Radio, Palette, MessagesSquare, Users, UserPlus, BookOpen } from 'lucide-react';
import { NodeEditor } from '@/components/admin/NodeEditor';
import { EdgeEditor } from '@/components/admin/EdgeEditor';
import { QuestionEditor } from '@/components/admin/QuestionEditor';
import { AudioGenerator } from '@/components/admin/AudioGenerator';
import { EpisodeEditor } from '@/components/admin/EpisodeEditor';
import { AxesEditor, ThematicAxis } from '@/components/admin/AxesEditor';
import { DialogueEditor } from '@/components/admin/DialogueEditor';
import { RolesEditor } from '@/components/admin/RolesEditor';
import { AccessRequestsEditor } from '@/components/admin/AccessRequestsEditor';
import { PodcastTextCurator } from '@/components/admin/PodcastTextCurator';
import { toast } from 'sonner';
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

interface PodcastEpisode {
  id: string;
  title: string;
  description: string | null;
  audio_url: string;
  duration_seconds: number | null;
  question_ids: string[] | null;
  eje: string | null;
  published: boolean | null;
  published_at: string | null;
  created_at: string;
}

const Admin = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [nodes, setNodes] = useState<TopologyNode[]>([]);
  const [edges, setEdges] = useState<TopologyEdge[]>([]);
  const [questions, setQuestions] = useState<SocraticQuestion[]>([]);
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([]);
  const [axes, setAxes] = useState<ThematicAxis[]>([]);
  const navigate = useNavigate();

  const isAdmin = user?.email === ADMIN_EMAIL;

  const fetchData = useCallback(async () => {
    setDataLoading(true);
    
    const [nodesRes, edgesRes, questionsRes, episodesRes, axesRes] = await Promise.all([
      supabase.from('topology_nodes').select('*').order('id'),
      supabase.from('topology_edges').select('*').order('id'),
      supabase.from('socratic_questions').select('*').order('id'),
      supabase.from('podcast_episodes').select('*').order('created_at', { ascending: false }),
      supabase.from('thematic_axes').select('*').order('order_index')
    ]);

    if (nodesRes.data) setNodes(nodesRes.data);
    if (edgesRes.data) setEdges(edgesRes.data);
    if (questionsRes.data) setQuestions(questionsRes.data);
    if (episodesRes.data) setEpisodes(episodesRes.data);
    if (axesRes.data) setAxes(axesRes.data as ThematicAxis[]);
    
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      topology_nodes: nodes.map(({ id, label, description, x, y, weight, color, axis, type, corpus_refs, question_count }) => ({
        id, label, description, x, y, weight, color, axis, type, corpus_refs, question_count
      })),
      topology_edges: edges.map(({ id, source, target, tension, label, type }) => ({
        id, source, target, tension, label, type
      })),
      socratic_questions: questions.map(({ id, eje, nivel, tension, texto, corpus_ref }) => ({
        id, eje, nivel, tension, texto, corpus_ref
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lagrange-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Datos exportados correctamente');
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.topology_nodes || !data.topology_edges || !data.socratic_questions) {
        throw new Error('Formato de archivo inválido');
      }

      const confirmImport = window.confirm(
        `¿Importar ${data.topology_nodes.length} nodos, ${data.topology_edges.length} tensiones y ${data.socratic_questions.length} preguntas?\n\nEsto reemplazará los datos existentes.`
      );

      if (!confirmImport) {
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      // Delete existing data
      await Promise.all([
        supabase.from('socratic_questions').delete().neq('id', ''),
        supabase.from('topology_edges').delete().neq('id', ''),
      ]);
      await supabase.from('topology_nodes').delete().neq('id', '');

      // Insert new data
      const { error: nodesError } = await supabase
        .from('topology_nodes')
        .insert(data.topology_nodes);
      
      if (nodesError) throw nodesError;

      const { error: edgesError } = await supabase
        .from('topology_edges')
        .insert(data.topology_edges);
      
      if (edgesError) throw edgesError;

      const { error: questionsError } = await supabase
        .from('socratic_questions')
        .insert(data.socratic_questions);
      
      if (questionsError) throw questionsError;

      toast.success('Datos importados correctamente');
      fetchData();
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Error al importar: ' + (error as Error).message);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
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
    <div className="min-h-screen bg-background flex flex-col">
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
              <div className="flex gap-2 flex-wrap">
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
                  onClick={handleExport}
                  disabled={dataLoading}
                  className="font-mono text-sm gap-2"
                >
                  <Download className="w-4 h-4" />
                  Exportar JSON
                </Button>
                {isAdmin && (
                  <>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImport}
                      accept=".json"
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={dataLoading}
                      className="font-mono text-sm gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Importar JSON
                    </Button>
                  </>
                )}
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
            <Tabs defaultValue="axes" className="space-y-6">
                <TabsList className="bg-card border border-border flex-wrap h-auto">
                  <TabsTrigger value="axes" className="font-mono text-sm gap-2">
                    <Palette className="w-4 h-4" />
                    Ejes ({axes.length})
                  </TabsTrigger>
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
                  <TabsTrigger value="audio" className="font-mono text-sm gap-2">
                    <Volume2 className="w-4 h-4" />
                    Audio TTS
                  </TabsTrigger>
                  <TabsTrigger value="episodes" className="font-mono text-sm gap-2">
                    <Radio className="w-4 h-4" />
                    Episodios ({episodes.length})
                  </TabsTrigger>
                  <TabsTrigger value="dialogues" className="font-mono text-sm gap-2">
                    <MessagesSquare className="w-4 h-4" />
                    Diálogos
                  </TabsTrigger>
                  {isAdmin && (
                    <>
                      <TabsTrigger value="curator" className="font-mono text-sm gap-2">
                        <BookOpen className="w-4 h-4" />
                        Curador
                      </TabsTrigger>
                      <TabsTrigger value="requests" className="font-mono text-sm gap-2">
                        <UserPlus className="w-4 h-4" />
                        Solicitudes
                      </TabsTrigger>
                      <TabsTrigger value="roles" className="font-mono text-sm gap-2">
                        <Users className="w-4 h-4" />
                        Roles
                      </TabsTrigger>
                    </>
                  )}
                </TabsList>

                <TabsContent value="axes">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-card rounded-xl border border-border p-6"
                  >
                    <h2 className="font-serif text-xl mb-4">Ejes Temáticos</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      Configura los ejes temáticos del sistema. Los ejes definen las categorías de nodos y preguntas.
                    </p>
                    <AxesEditor axes={axes} onRefresh={fetchData} isAdmin={isAdmin} />
                  </motion.div>
                </TabsContent>

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

                <TabsContent value="audio">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-card rounded-xl border border-border p-6"
                  >
                    <h2 className="font-serif text-xl mb-4">Generador de Audio TTS</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      Genera audio de las preguntas socráticas usando ElevenLabs TTS.
                    </p>
                    <AudioGenerator questions={questions} />
                  </motion.div>
                </TabsContent>

                <TabsContent value="episodes">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-card rounded-xl border border-border p-6"
                  >
                    <h2 className="font-serif text-xl mb-4">Episodios de Podcast</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      Gestiona los episodios del podcast. Los episodios publicados aparecen en /podcast.
                    </p>
                    <EpisodeEditor episodes={episodes} onRefresh={fetchData} isAdmin={isAdmin} />
                  </motion.div>
                </TabsContent>

                <TabsContent value="dialogues">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-card rounded-xl border border-border p-6"
                  >
                    <h2 className="font-serif text-xl mb-4">Diálogos Guardados</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      Gestiona los diálogos socráticos guardados por los usuarios. Exporta a TXT o convierte a podcast MP3.
                    </p>
                    <DialogueEditor isAdmin={isAdmin} />
                  </motion.div>
                </TabsContent>

                {isAdmin && (
                  <>
                    <TabsContent value="curator">
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-card rounded-xl border border-border p-6"
                      >
                        <h2 className="font-serif text-xl mb-4">Curador de Textos</h2>
                        <p className="text-sm text-muted-foreground mb-6">
                          Procesa diálogos de usuarios Platón con IA para generar textos de ~500 palabras optimizados para TTS o exportación JSON.
                        </p>
                        <PodcastTextCurator />
                      </motion.div>
                    </TabsContent>
                    <TabsContent value="requests">
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-card rounded-xl border border-border p-6"
                      >
                        <h2 className="font-serif text-xl mb-4">Solicitudes de Acceso</h2>
                        <p className="text-sm text-muted-foreground mb-6">
                          Revisa y aprueba solicitudes de acceso Platón. Al aprobar, se asigna automáticamente el rol.
                        </p>
                        <AccessRequestsEditor isAdmin={isAdmin} />
                      </motion.div>
                    </TabsContent>
                    <TabsContent value="roles">
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-card rounded-xl border border-border p-6"
                      >
                        <h2 className="font-serif text-xl mb-4">Gestión de Roles</h2>
                        <p className="text-sm text-muted-foreground mb-6">
                          Asigna roles Platón a usuarios para darles acceso completo sin neblina.
                        </p>
                        <RolesEditor isAdmin={isAdmin} />
                      </motion.div>
                    </TabsContent>
                  </>
                )}
              </Tabs>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-8 grid md:grid-cols-5 gap-4"
              >
                <div className="p-4 rounded-lg bg-card border border-border">
                  <span className="text-3xl font-mono text-lagrange-tension">{axes.length}</span>
                  <p className="text-sm text-muted-foreground">Ejes temáticos</p>
                </div>
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
                <div className="p-4 rounded-lg bg-card border border-border">
                  <span className="text-3xl font-mono text-lagrange-tension">{episodes.filter(e => e.published).length}</span>
                  <p className="text-sm text-muted-foreground">Episodios publicados</p>
                </div>
              </motion.div>
            </>
          )}
        </div>
      </main>
      
      <LagrangeFooter />
    </div>
  );
};

export default Admin;
