import { useState, useEffect } from 'react';
import { supabase } from '@/compartido/lib/supabaseClient';
import { Button } from '@/compartido/ui/button';
import { Textarea } from '@/compartido/ui/textarea';
import { Loader2, Upload, FileText, Trash2, AlertCircle } from 'lucide-react';
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

export function RAGSourcesEditor({ academyId, isAdmin = false }: RAGSourcesEditorProps) {
  const [sources, setSources] = useState<SourceFragment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newText, setNewText] = useState('');
  const [newTitle, setNewTitle] = useState('');

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
  }, [academyId]);

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

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Error al subir fuente');
      }

      toast.success(`Fuente subida: ${result.chunks_created} fragmentos creados`);
      setNewText('');
      setNewTitle('');
      fetchSources();
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error(err.message || 'Error al subir fuente');
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
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Fuentes RAG</h3>
          <p className="text-sm text-gray-400">Sube textos para que el oráculo los use como contexto</p>
        </div>
        <Button onClick={fetchSources} variant="outline" size="sm">
          Actualizar
        </Button>
      </div>

      {/* Upload Form */}
      <div className="p-4 bg-lagrange-surface rounded-lg border border-lagrange-border space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Título (opcional)</label>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Nombre de la fuente"
            className="w-full px-3 py-2 bg-lagrange-dark border border-lagrange-border rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Texto</label>
          <Textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Pega aquí el texto que quieres usar como fuente..."
            rows={6}
            className="bg-lagrange-dark border-lagrange-border"
          />
          <p className="text-xs text-gray-500 mt-1">
            {newText.length} / 50,000 caracteres
          </p>
        </div>

        <Button
          onClick={handleUpload}
          disabled={uploading || !newText.trim()}
          className="w-full"
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

      {/* Sources List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : Object.keys(groupedSources).length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No hay fuentes subidas todavía</p>
          <p className="text-sm">Sube un texto arriba para comenzar</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedSources).map(([filename, fragments]) => (
            <div key={filename} className="bg-lagrange-surface rounded-lg border border-lagrange-border overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b border-lagrange-border">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-lagrange-accent" />
                  <span className="font-medium">{filename}</span>
                  <span className="text-xs text-gray-500">({fragments.length} fragmentos)</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(fragments[0].id)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="p-4 max-h-40 overflow-y-auto">
                <p className="text-sm text-gray-300 line-clamp-3">
                  {fragments[0].content.substring(0, 300)}...
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
