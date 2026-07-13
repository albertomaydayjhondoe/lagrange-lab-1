import { useState, useEffect } from 'react';
import { supabase } from '@/compartido/lib/supabaseClient';
import { Button } from '@/compartido/ui/button';
import { Textarea } from '@/compartido/ui/textarea';
import { Loader2, Upload, FileText, Trash2, Plus, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface SourceFragment {
  id: string;
  source_file: string;
  source_section: string;
  content: string;
  source_type: 'seed' | 'user_upload';
  title: string | null;
  upload_status: string | null;
  created_at: string;
  academy_id: string | null;
}

interface RAGSourcesEditorProps {
  academyId?: string;
  isAdmin?: boolean;
}

// Status badge component
function StatusBadge({ status }: { status: string | null }) {
  const normalizedStatus = status?.toLowerCase() || 'processed';
  
  const statusConfig = {
    processed: {
      label: 'Procesada',
      icon: CheckCircle,
      className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    },
    processing: {
      label: 'Procesando',
      icon: Clock,
      className: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    },
    error: {
      label: 'Error',
      icon: AlertCircle,
      className: 'bg-red-500/20 text-red-400 border-red-500/30',
    },
    pending: {
      label: 'Pendiente',
      icon: Clock,
      className: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    },
  };

  const config = statusConfig[normalizedStatus as keyof typeof statusConfig] || statusConfig.processed;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono border ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

export function RAGSourcesEditor({ academyId, isAdmin = false }: RAGSourcesEditorProps) {
  const [sources, setSources] = useState<SourceFragment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newText, setNewText] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);

  const fetchSources = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('corpus_fragments')
        .select('id, source_file, source_section, content, source_type, title, upload_status, created_at, academy_id')
        .eq('source_type', 'user_upload')
        .order('created_at', { ascending: false })
        .limit(100);

      if (academyId) {
        query = query.eq('academy_id', academyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setSources(data || []);
    } catch (err) {
      console.error('Error fetching sources:', err);
      toast.error('Error al cargar fuentes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, [academyId, fetchSources]);

  const handleUpload = async () => {
    if (!newText.trim()) {
      toast.error('Ingresa texto para subir');
      return;
    }

    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Debes iniciar sesión');
        return;
      }

      const response = await fetch('https://ai.gateway.lovable.dev/v1/functions/ingest-source', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          academyId: academyId || '00000000-0000-0000-0000-000000000001',
          text: newText,
          title: newTitle || 'Fuente personalizada',
        }),
      });

      const result: { chunks_created?: number; error?: string } = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Error al subir fuente');
      }

      toast.success(`Fuente subida: ${result.chunks_created || 0} fragmentos creados`);
      setNewText('');
      setNewTitle('');
      setShowUploadForm(false);
      fetchSources();
    } catch (err: unknown) {
      console.error('Upload error:', err);
      const message = err instanceof Error ? err.message : 'Error al subir fuente';
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta fuente?')) return;

    try {
      const { error } = await supabase
        .from('corpus_fragments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Fuente eliminada');
      fetchSources();
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Error al eliminar');
    }
  };

  // Group by source_file
  const groupedSources = sources.reduce((acc, source) => {
    const key = source.source_file;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(source);
    return acc;
  }, {} as Record<string, SourceFragment[]>);

  return (
    <div className="space-y-6">
      {/* Header with add button */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Fuentes RAG</h3>
          <p className="text-sm text-muted-foreground">Textos que el oráculo usa como contexto</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchSources} variant="outline" size="sm">
            Actualizar
          </Button>
          <Button 
            onClick={() => setShowUploadForm(!showUploadForm)} 
            size="sm"
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Añadir fuente
          </Button>
        </div>
      </div>

      {/* Upload Form - collapsible */}
      {showUploadForm && (
        <div className="p-4 bg-card rounded-lg border border-border space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Título (opcional)</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Nombre de la fuente"
              className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Texto</label>
            <Textarea
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Pega aquí el texto que quieres usar como fuente..."
              rows={6}
              className="bg-background border-input"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {newText.length} / 50,000 caracteres
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button 
              variant="ghost" 
              onClick={() => setShowUploadForm(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading || !newText.trim()}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Subir Fuente
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Sources List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : Object.keys(groupedSources).length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">No hay fuentes subidas todavía</p>
          <p className="text-sm text-muted-foreground/70">Sube un texto arriba para comenzar</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedSources).map(([filename, fragments]) => (
            <div key={filename} className="bg-card rounded-lg border border-border overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b border-border">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{fragments[0].title || filename}</span>
                      <StatusBadge status={fragments[0].upload_status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {fragments.length} fragmentos · {new Date(fragments[0].created_at).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(fragments[0].id)}
                  className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="p-4 max-h-32 overflow-y-auto">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {fragments[0].content.substring(0, 300)}
                  {fragments[0].content.length > 300 ? '...' : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
