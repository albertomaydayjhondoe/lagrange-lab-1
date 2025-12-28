import { useState } from 'react';
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
import { Edit2, Trash2, Plus, ExternalLink, Play, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    audio_url: '',
    eje: '',
    published: false,
  });

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
                  <Label htmlFor="audio_url">URL de Audio *</Label>
                  <Input
                    id="audio_url"
                    value={formData.audio_url}
                    onChange={(e) => setFormData({ ...formData, audio_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eje">Eje temático</Label>
                  <Input
                    id="eje"
                    value={formData.eje}
                    onChange={(e) => setFormData({ ...formData, eje: e.target.value })}
                    placeholder="miedo, control, legitimidad..."
                  />
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
