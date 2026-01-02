import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Edit2, Trash2, Plus, Play, Eye, EyeOff, Upload, Loader2, Music } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { fetchAxes, ThematicAxis } from '@/utils/dataService';

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

interface EpisodeEditorProps {
  episodes: PodcastEpisode[];
  onRefresh: () => void;
  isAdmin: boolean;
}

export function EpisodeEditor({ episodes, onRefresh, isAdmin }: EpisodeEditorProps) {
  const [editingEpisode, setEditingEpisode] = useState<PodcastEpisode | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [axes, setAxes] = useState<ThematicAxis[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    audio_url: '',
    eje: '',
    published: false,
  });

  useEffect(() => {
    fetchAxes().then(setAxes);
  }, []);

  const handleEdit = (episode: PodcastEpisode) => {
    setEditingEpisode(episode);
    setFormData({
      title: episode.title,
      description: episode.description || '',
      audio_url: episode.audio_url,
      eje: episode.eje || '',
      published: episode.published || false,
    });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingEpisode(null);
    setFormData({
      title: '',
      description: '',
      audio_url: '',
      eje: '',
      published: false,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.audio_url.trim()) {
      toast.error('Título y URL de audio son requeridos');
      return;
    }

    try {
      if (editingEpisode) {
        const { error } = await supabase
          .from('podcast_episodes')
          .update({
            title: formData.title,
            description: formData.description || null,
            audio_url: formData.audio_url,
            eje: formData.eje || null,
            published: formData.published,
            published_at: formData.published ? new Date().toISOString() : null,
          })
          .eq('id', editingEpisode.id);

        if (error) throw error;
        toast.success('Episodio actualizado');
      } else {
        const { error } = await supabase
          .from('podcast_episodes')
          .insert({
            title: formData.title,
            description: formData.description || null,
            audio_url: formData.audio_url,
            eje: formData.eje || null,
            published: formData.published,
            published_at: formData.published ? new Date().toISOString() : null,
          });

        if (error) throw error;
        toast.success('Episodio creado');
      }

      setIsDialogOpen(false);
      onRefresh();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error: ' + (error as Error).message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('podcast_episodes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Episodio eliminado');
      onRefresh();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error: ' + (error as Error).message);
    }
  };

  const handleTogglePublish = async (episode: PodcastEpisode) => {
    try {
      const newPublished = !episode.published;
      const { error } = await supabase
        .from('podcast_episodes')
        .update({
          published: newPublished,
          published_at: newPublished ? new Date().toISOString() : null,
        })
        .eq('id', episode.id);

      if (error) throw error;
      toast.success(newPublished ? 'Episodio publicado' : 'Episodio despublicado');
      onRefresh();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error: ' + (error as Error).message);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.includes('audio')) {
      toast.error('Por favor selecciona un archivo de audio (MP3, WAV, etc.)');
      return;
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('El archivo es demasiado grande. Máximo 50MB.');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress('Subiendo archivo...');

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `episode-${Date.now()}.${fileExt}`;

      // Upload directly to Supabase Storage
      const { data, error } = await supabase.storage
        .from('podcast-episodes')
        .upload(fileName, file, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Upload error:', error);
        throw new Error(error.message);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('podcast-episodes')
        .getPublicUrl(fileName);

      setFormData(prev => ({
        ...prev,
        audio_url: urlData.publicUrl,
        title: prev.title || file.name.replace(/\.[^/.]+$/, ''), // Use filename as default title
      }));

      toast.success('Archivo subido correctamente');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Error al subir: ' + (error as Error).message);
    } finally {
      setUploading(false);
      setUploadProgress('');
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleCreate} className="gap-2">
                <Plus className="w-4 h-4" />
                Nuevo Episodio
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingEpisode ? 'Editar Episodio' : 'Nuevo Episodio'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Título del episodio"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descripción del episodio"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Audio *</Label>
                  
                  {/* File Upload */}
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="audio-upload"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="gap-2 flex-1"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {uploadProgress}
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Subir MP3
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Show uploaded file or manual URL */}
                  {formData.audio_url ? (
                    <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded-md">
                      <Music className="w-4 h-4 text-primary" />
                      <span className="text-sm truncate flex-1">{formData.audio_url.split('/').pop()}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setFormData({ ...formData, audio_url: '' })}
                      >
                        Cambiar
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground text-center">o pega una URL</div>
                      <Input
                        id="audio_url"
                        value={formData.audio_url}
                        onChange={(e) => setFormData({ ...formData, audio_url: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eje">Eje temático</Label>
                  <select
                    id="eje"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.eje}
                    onChange={(e) => setFormData({ ...formData, eje: e.target.value })}
                  >
                    <option value="">Sin eje</option>
                    {axes.map(axis => (
                      <option key={axis.id} value={axis.id}>{axis.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="published"
                    checked={formData.published}
                    onCheckedChange={(checked) => setFormData({ ...formData, published: checked })}
                  />
                  <Label htmlFor="published">Publicar</Label>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSubmit}>
                    {editingEpisode ? 'Guardar' : 'Crear'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {episodes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No hay episodios. {isAdmin && 'Crea uno nuevo o genera audio desde las preguntas.'}
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Eje</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {episodes.map((episode) => (
                <TableRow key={episode.id}>
                  <TableCell>
                    <div className="max-w-[250px]">
                      <p className="font-medium truncate">{episode.title}</p>
                      {episode.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {episode.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {episode.eje && (
                      <Badge variant="outline" className="font-mono text-xs">
                        {episode.eje}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={episode.published ? 'default' : 'secondary'}
                      className="gap-1"
                    >
                      {episode.published ? (
                        <>
                          <Eye className="w-3 h-3" />
                          Publicado
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3 h-3" />
                          Borrador
                        </>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(episode.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(episode.audio_url, '_blank')}
                        title="Reproducir"
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                      {isAdmin && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleTogglePublish(episode)}
                            title={episode.published ? 'Despublicar' : 'Publicar'}
                          >
                            {episode.published ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(episode)}
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" title="Eliminar">
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar episodio?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. El episodio "{episode.title}" será eliminado permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(episode.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
