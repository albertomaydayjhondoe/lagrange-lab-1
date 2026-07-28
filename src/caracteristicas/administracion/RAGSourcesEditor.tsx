import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/compartido/lib/supabaseClient';
import { Button } from '@/compartido/ui/button';
import { Textarea } from '@/compartido/ui/textarea';
import { Input } from '@/compartido/ui/input';
import { 
  Loader2, 
  Upload, 
  FileText, 
  Trash2, 
  Plus, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  File,
  FileAudio,
  FileVideo,
  Image,
  Link as LinkIcon,
  X,
  AlertTriangle,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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

// Supported file types with icons
const SUPPORTED_TYPES = [
  { type: 'pdf', icon: FileText, label: 'PDF', color: 'text-red-500' },
  { type: 'docx', icon: FileText, label: 'Word', color: 'text-blue-500' },
  { type: 'txt', icon: FileText, label: 'TXT', color: 'text-gray-500' },
  { type: 'md', icon: FileText, label: 'Markdown', color: 'text-gray-600' },
  { type: 'csv', icon: FileText, label: 'CSV', color: 'text-emerald-500' },
  { type: 'mp3', icon: FileAudio, label: 'Audio', color: 'text-orange-500' },
  { type: 'mp4', icon: FileVideo, label: 'Video', color: 'text-purple-500' },
  { type: 'png', icon: Image, label: 'Imagen', color: 'text-green-500' },
  { type: 'jpg', icon: Image, label: 'Imagen', color: 'text-green-500' },
];

// Status badge component - Universidad palette
function StatusBadge({ status }: { status: string | null }) {
  const normalizedStatus = status?.toLowerCase() || 'processed';
  
  const statusConfig = {
    completed: {
      label: 'Completado',
      icon: CheckCircle,
      className: 'status-listo',
    },
    processed: {
      label: 'Listo',
      icon: CheckCircle,
      className: 'status-listo',
    },
    processing: {
      label: 'Procesando',
      icon: Loader2,
      className: 'status-procesando',
    },
    error: {
      label: 'Error',
      icon: AlertCircle,
      className: 'status-error',
    },
    failed: {
      label: 'Fallido',
      icon: AlertCircle,
      className: 'status-error',
    },
    pending: {
      label: 'Pendiente',
      icon: Clock,
      className: 'status-procesando',
    },
    embedding_failed: {
      label: 'Embedding fallido',
      icon: AlertTriangle,
      className: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    },
  };

  const config = statusConfig[normalizedStatus as keyof typeof statusConfig] || statusConfig.processed;
  const Icon = config.icon;

  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono border", config.className)}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

// File type icon helper
function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const type = SUPPORTED_TYPES.find(t => t.type === ext);
  if (type) {
    return { Icon: type.icon, color: type.color };
  }
  return { Icon: File, color: 'text-gray-500' };
}

// File upload item component
function FileUploadItem({ 
  file, 
  onRemove 
}: { 
  file: File;
  onRemove: () => void;
}) {
  const { Icon, color } = getFileIcon(file.name);
  
  return (
    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
      <Icon className={cn("w-5 h-5", color)} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{file.name}</p>
        <p className="text-xs text-muted-foreground">
          {(file.size / 1024).toFixed(1)} KB
        </p>
      </div>
      <button
        onClick={onRemove}
        className="p-1 hover:bg-muted rounded-full transition-colors"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>
    </div>
  );
}

export function RAGSourcesEditor({ academyId, isAdmin = false }: RAGSourcesEditorProps) {
  const [sources, setSources] = useState<SourceFragment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newText, setNewText] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'text' | 'file'>('text');
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSources = useCallback(async () => {
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
  }, [academyId]);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const validFiles = selectedFiles.filter(file => {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const isValid = SUPPORTED_TYPES.some(t => t.type === ext);
      if (!isValid) {
        toast.error(`Tipo de archivo no soportado: ${ext}`);
      }
      return isValid;
    });
    
    setFiles(prev => [...prev, ...validFiles]);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove file from selection
  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Upload text content
  const handleTextUpload = async () => {
    if (!newText.trim()) {
      toast.error('Ingresa texto para subir');
      return;
    }

    setUploading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('ingest-source', {
        body: {
          academyId: academyId || '00000000-0000-0000-0000-000000000001',
          text: newText,
          title: newTitle || 'Fuente personalizada',
        },
      });

      if (error) {
        throw new Error(error.message || 'Error al subir fuente');
      }

      if (result?.error) {
        throw new Error(result.error);
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

  // Upload files
  const handleFileUpload = async () => {
    if (files.length === 0) {
      toast.error('Selecciona al menos un archivo');
      return;
    }

    setUploading(true);
    setUploadProgress({});
    setUploadErrors({});

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(prev => ({ ...prev, [file.name]: 10 }));

      try {
        setUploadProgress(prev => ({ ...prev, [file.name]: 30 }));
        
        const base64 = await fileToBase64(file);
        // Remove data URL prefix
        const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;

        setUploadProgress(prev => ({ ...prev, [file.name]: 50 }));

        const { data: result, error } = await supabase.functions.invoke('ingest-source', {
          body: {
            academyId: academyId || '00000000-0000-0000-0000-000000000001',
            file: base64Data,
            filename: file.name,
            mimeType: file.type,
            title: file.name.replace(/\.[^/.]+$/, ''),
          },
        });

        setUploadProgress(prev => ({ ...prev, [file.name]: 90 }));

        if (error || result?.error) {
          throw new Error(error?.message || result?.error || 'Error desconocido');
        }

        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
        successCount++;
      } catch (err) {
        console.error(`Error uploading ${file.name}:`, err);
        setUploadErrors(prev => ({ 
          ...prev, 
          [file.name]: err instanceof Error ? err.message : 'Error desconocido' 
        }));
        errorCount++;
      }
    }

    setUploading(false);

    if (successCount > 0) {
      toast.success(`${successCount} archivo(s) subido(s) exitosamente`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} archivo(s) no se pudieron subir`);
    }

    setFiles([]);
    fetchSources();
  };

  // Upload URL
  const [url, setUrl] = useState('');
  
  const handleURLUpload = async () => {
    if (!url.trim()) {
      toast.error('Ingresa una URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      toast.error('URL inválida');
      return;
    }

    setUploading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('ingest-source', {
        body: {
          academyId: academyId || '00000000-0000-0000-0000-000000000001',
          url: url,
          title: new URL(url).hostname,
        },
      });

      if (error) {
        throw new Error(error.message || 'Error al subir URL');
      }

      if (result?.error) {
        throw new Error(result.error);
      }

      toast.success(`URL procesada: ${result.chunks_created || 0} fragmentos creados`);
      setUrl('');
      setShowUploadForm(false);
      fetchSources();
    } catch (err: unknown) {
      console.error('Upload error:', err);
      const message = err instanceof Error ? err.message : 'Error al subir URL';
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
          <h3 className="text-lg font-medium">Material de Estudio</h3>
          <p className="text-sm text-muted-foreground">Textos que el Tutor Virtual usa como contexto</p>
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
            Subir apuntes
          </Button>
        </div>
      </div>

      {/* Upload Form - collapsible */}
      {showUploadForm && (
        <div className="p-4 bg-card rounded-lg border border-border space-y-4">
          {/* Tabs */}
          <div className="flex gap-2 border-b border-border pb-3">
            <Button
              variant={activeTab === 'text' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('text')}
            >
              Texto
            </Button>
            <Button
              variant={activeTab === 'file' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('file')}
            >
              Archivos
            </Button>
          </div>

          {/* Text Upload */}
          {activeTab === 'text' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Título (opcional)</label>
                <Input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Nombre de la fuente"
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
                  onClick={handleTextUpload}
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
                      Cargar material
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* File Upload */}
          {activeTab === 'file' && (
            <div className="space-y-4">
              {/* Supported types info */}
              <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <Info className="w-4 h-4 text-blue-500 mt-0.5" />
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium text-blue-600 dark:text-blue-400 mb-1">Formatos soportados:</p>
                  <div className="flex flex-wrap gap-2">
                    {SUPPORTED_TYPES.map(({ type, icon: Icon, label, color }) => (
                      <span key={type} className={cn("inline-flex items-center gap-1", color)}>
                        <Icon className="w-3 h-3" />
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* File input */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.docx,.txt,.md,.csv,.mp3,.wav,.mp4,.webm,.png,.jpg,.jpeg"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Seleccionar archivos
                </Button>
              </div>

              {/* Selected files list */}
              {files.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{files.length} archivo(s) seleccionado(s)</p>
                  {files.map((file, index) => (
                    <div key={index}>
                      <FileUploadItem 
                        file={file} 
                        onRemove={() => removeFile(index)} 
                      />
                      {uploadProgress[file.name] !== undefined && (
                        <div className="mt-1">
                          <div className="h-1 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full bg-primary transition-all",
                                uploadErrors[file.name] && "bg-destructive"
                              )}
                              style={{ width: `${uploadProgress[file.name]}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {uploadErrors[file.name] && (
                        <p className="text-xs text-destructive mt-1">
                          {uploadErrors[file.name]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setShowUploadForm(false);
                    setFiles([]);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleFileUpload}
                  disabled={uploading || files.length === 0}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Subir {files.length} archivo(s)
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sources List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : Object.keys(groupedSources).length === 0 ? (
        <div className="card-carrera text-center py-12 px-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/10 flex items-center justify-center">
            <FileText className="w-8 h-8 text-accent" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Sé el primero en aportar apuntes</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Esta asignatura aún no tiene material de estudio. Sube tus apuntes para que el Tutor Virtual pueda usarlo como contexto.
          </p>
          <button 
            onClick={() => setShowUploadForm(true)}
            className="btn-secundario"
          >
            <Upload className="w-4 h-4" />
            Subir apuntes
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedSources).map(([filename, fragments]) => {
            const { Icon, color } = getFileIcon(filename);
            
            return (
              <div key={filename} className="bg-card rounded-lg border border-border overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b border-border">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Icon className={cn("w-5 h-5 flex-shrink-0", color)} />
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
            );
          })}
        </div>
      )}
    </div>
  );
}
