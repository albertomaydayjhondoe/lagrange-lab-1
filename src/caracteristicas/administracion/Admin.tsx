import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/compartido/lib/supabaseClient';
import { LagrangeNav } from '@/components/LagrangeNav';
import { LagrangeFooter } from '@/components/LagrangeFooter';
import { Button } from '@/compartido/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/compartido/ui/tabs';
import { Lock, Database, Network, MessageSquare, LogOut, Loader2, RefreshCw, Download, Upload, Volume2, Radio, Palette, MessagesSquare, Users, UserPlus, BookOpen, Archive, FileText } from 'lucide-react';
import { createGlobalBackup, downloadZip } from '@/utils/globalBackup';
import { NodeEditor } from '@/caracteristicas/administracion/NodeEditor';
import { EdgeEditor } from '@/caracteristicas/administracion/EdgeEditor';
import { QuestionEditor } from '@/caracteristicas/administracion/QuestionEditor';
import { AudioGenerator } from '@/caracteristicas/administracion/AudioGenerator';
import { EpisodeEditor } from '@/caracteristicas/administracion/EpisodeEditor';
import { AxesEditor, ThematicAxis } from '@/caracteristicas/administracion/AxesEditor';
import { DialogueEditor } from '@/caracteristicas/administracion/DialogueEditor';
import { RolesEditor } from '@/caracteristicas/administracion/RolesEditor';
import { AccessRequestsEditor } from '@/caracteristicas/administracion/AccessRequestsEditor';
import { PodcastTextCurator } from '@/caracteristicas/administracion/PodcastTextCurator';
import { DifferentialImport } from '@/caracteristicas/administracion/DifferentialImport';
import { RAGSourcesEditor } from '@/caracteristicas/administracion/RAGSourcesEditor';
import { toast } from 'sonner';

// Admin panel is now open - authentication disabled for platform admins
// Authentication is handled by Supabase RLS policies at the database level

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
  const [dataLoading, setDataLoading] = useState(true);
  const [nodes, setNodes] = useState<TopologyNode[]>([]);
  const [edges, setEdges] = useState<TopologyEdge[]>([]);
  const [questions, setQuestions] = useState<SocraticQuestion[]>([]);
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([]);
  const [axes, setAxes] = useState<ThematicAxis[]>([]);

  // Admin panel is always accessible - RLS handles security at database level
  const isAdmin = true;

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
    fetchData();
  }, [fetchData]);

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

  const [backupLoading, setBackupLoading] = useState(false);

  const handleGlobalBackup = async () => {
    setBackupLoading(true);
    try {
      const blob = await createGlobalBackup();
      downloadZip(blob);
      toast.success('Backup global creado correctamente');
    } catch (error) {
      console.error('Backup error:', error);
      toast.error('Error al crear backup: ' + (error as Error).message);
    } finally {
      setBackupLoading(false);
    }
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
                  God Mode
                </div>
                <h1 className="font-serif text-4xl text-foreground">
                  Panel de Control
                </h1>
                <p className="text-sm text-muted-foreground mt-1 font-mono">
                  Acceso de administrador de plataforma
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
                  Importar Total
                </Button>
                <DifferentialImport onRefresh={fetchData} disabled={dataLoading} />
                <Button
                  onClick={handleGlobalBackup}
                  disabled={dataLoading || backupLoading}
                  className="font-mono text-sm gap-2 bg-red-600 hover:bg-red-700 text-white border-red-600"
                >
                  {backupLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Archive className="w-4 h-4" />
                  )}
                  Backup ZIP
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
                {/* 
                  ORDEN DE TABS:
                  1. Ejes + Fuentes (las 2 tareas que definen una academia nueva)
                  2. Topología (Nodos, Tensiones)
                  3. Contenido (Preguntas, Diálogos)
                  4. Podcast (Audio, Episodios, Curador)
                  5. Admin (Solicitudes, Roles)
                */}
                <TabsList className="bg-card border border-border flex-wrap h-auto">
                  <TabsTrigger value="axes" className="font-mono text-sm gap-2">
                    <Palette className="w-4 h-4" />
                    Ejes
                  </TabsTrigger>
                  <TabsTrigger value="rag" className="font-mono text-sm gap-2">
                    <FileText className="w-4 h-4" />
                    Fuentes
                  </TabsTrigger>
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
                  <TabsTrigger value="dialogues" className="font-mono text-sm gap-2">
                    <MessagesSquare className="w-4 h-4" />
                    Diálogos
                  </TabsTrigger>
                  <TabsTrigger value="audio" className="font-mono text-sm gap-2">
                    <Volume2 className="w-4 h-4" />
                    Audio TTS
                  </TabsTrigger>
                  <TabsTrigger value="episodes" className="font-mono text-sm gap-2">
                    <Radio className="w-4 h-4" />
                    Episodios
                  </TabsTrigger>
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

                <TabsContent value="rag">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-card rounded-xl border border-border p-6"
                  >
                    <h2 className="font-serif text-xl mb-4">Fuentes RAG</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      Gestiona las fuentes de texto para Retrieval Augmented Generation. Sube documentos o sincroniza el corpus seed.
                    </p>
                    <RAGSourcesEditor academyId={null} isAdmin={isAdmin} />
                  </motion.div>
                </TabsContent>
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
