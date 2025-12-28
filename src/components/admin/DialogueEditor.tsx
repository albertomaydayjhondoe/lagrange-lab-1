import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Download, FileText, Volume2, Trash2, Loader2, RefreshCw, Search, Sparkles } from 'lucide-react';

interface DialogueEntry {
  type: 'oracle' | 'user';
  content: string;
  question?: {
    pregunta: string;
    eje: string;
    nivel: number;
    tension: number;
    conexion: string;
  };
  timestamp: string;
}

interface SavedDialogue {
  id: string;
  user_id: string;
  title: string;
  eje: string | null;
  dialogue_content: DialogueEntry[];
  summary: string | null;
  created_at: string;
  updated_at: string;
}

interface DialogueEditorProps {
  isAdmin: boolean;
}

const ejeLabels: Record<string, string> = {
  Miedo: 'Miedo',
  Control: 'Control',
  SaludMental: 'Salud Mental',
  Legitimidad: 'Legitimidad',
  Responsabilidad: 'Responsabilidad',
};

const ejeColors: Record<string, string> = {
  Miedo: 'bg-red-500/20 text-red-400',
  Control: 'bg-purple-500/20 text-purple-400',
  SaludMental: 'bg-green-500/20 text-green-400',
  Legitimidad: 'bg-amber-500/20 text-amber-400',
  Responsabilidad: 'bg-blue-500/20 text-blue-400',
};

export function DialogueEditor({ isAdmin }: DialogueEditorProps) {
  const [dialogues, setDialogues] = useState<SavedDialogue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDialogue, setSelectedDialogue] = useState<SavedDialogue | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEje, setFilterEje] = useState<string>('all');
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState('');
  const [generatingSummary, setGeneratingSummary] = useState(false);

  useEffect(() => {
    fetchDialogues();
  }, []);

  const fetchDialogues = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('saved_dialogues')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Parse dialogue_content from JSON
      const parsedDialogues = (data || []).map(d => ({
        ...d,
        dialogue_content: Array.isArray(d.dialogue_content) 
          ? (d.dialogue_content as unknown as DialogueEntry[])
          : []
      }));
      
      setDialogues(parsedDialogues);
    } catch (error) {
      console.error('Error fetching dialogues:', error);
      toast.error('Error al cargar diálogos');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) {
      toast.error('Solo el admin puede eliminar diálogos');
      return;
    }

    if (!confirm('¿Eliminar este diálogo?')) return;

    try {
      const { error } = await supabase
        .from('saved_dialogues')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Diálogo eliminado');
      setDialogues(dialogues.filter(d => d.id !== id));
      if (selectedDialogue?.id === id) {
        setSelectedDialogue(null);
      }
    } catch (error) {
      console.error('Error deleting dialogue:', error);
      toast.error('Error al eliminar diálogo');
    }
  };

  const generateSummary = async (dialogue: SavedDialogue) => {
    if (dialogue.summary) {
      if (!confirm('Este diálogo ya tiene un resumen. ¿Regenerar?')) return;
    }

    setGeneratingSummary(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-dialogue-summary', {
        body: { dialogueId: dialogue.id }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Update local state
      const updatedDialogue = { ...dialogue, summary: data.summary };
      setDialogues(prev => prev.map(d => d.id === dialogue.id ? updatedDialogue : d));
      setSelectedDialogue(updatedDialogue);

      toast.success('Resumen generado con IA');
    } catch (error) {
      console.error('Error generating summary:', error);
      toast.error('Error al generar resumen: ' + (error as Error).message);
    } finally {
      setGeneratingSummary(false);
    }
  };

  const exportToTxt = (dialogue: SavedDialogue) => {
    let txtContent = `# ${dialogue.title}\n`;
    txtContent += `Fecha: ${new Date(dialogue.created_at).toLocaleDateString('es-ES')}\n`;
    if (dialogue.eje) txtContent += `Eje temático: ${ejeLabels[dialogue.eje] || dialogue.eje}\n`;
    txtContent += `\n${'='.repeat(60)}\n\n`;

    dialogue.dialogue_content.forEach((entry, index) => {
      if (entry.type === 'oracle') {
        const q = entry.question;
        txtContent += `[ORÁCULO - ${q?.eje || 'Reflexión'} | Nivel ${q?.nivel || 1} | Tensión ${((q?.tension || 0.5) * 100).toFixed(0)}%]\n`;
        txtContent += `"${entry.content}"\n`;
        if (q?.conexion) txtContent += `→ ${q.conexion}\n`;
      } else {
        txtContent += `[USUARIO]\n`;
        txtContent += `${entry.content}\n`;
      }
      txtContent += '\n';
    });

    if (dialogue.summary) {
      txtContent += `\n${'='.repeat(60)}\n`;
      txtContent += `RESUMEN:\n${dialogue.summary}\n`;
    }

    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dialogo-${dialogue.title.replace(/\s+/g, '-').toLowerCase()}-${new Date(dialogue.created_at).toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Diálogo exportado como TXT');
  };

  const generatePodcast = async (dialogue: SavedDialogue) => {
    if (!isAdmin) {
      toast.error('Solo el admin puede generar podcasts');
      return;
    }

    setGeneratingAudio(true);
    setAudioProgress('Preparando diálogo...');

    try {
      // Create script from dialogue
      let script = '';
      dialogue.dialogue_content.forEach((entry) => {
        if (entry.type === 'oracle') {
          script += `${entry.content}... `;
        } else {
          script += `La respuesta del usuario fue: ${entry.content}... `;
        }
      });

      if (script.length > 5000) {
        script = script.substring(0, 5000);
      }

      setAudioProgress('Generando audio con ElevenLabs...');

      const { data, error } = await supabase.functions.invoke('elevenlabs-tts', {
        body: {
          text: script,
          voiceId: 'CwhRBWXzGAHq8TQ4Fs17' // Roger voice
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setAudioProgress('Subiendo a storage...');

      // Convert base64 to blob using fetch (safer)
      const audioBlob = await fetch(`data:audio/mpeg;base64,${data.audioContent}`).then(r => r.blob());
      
      const fileName = `podcast-dialogue-${dialogue.id}-${Date.now()}.mp3`;
      
      const { error: uploadError } = await supabase.storage
        .from('podcast-episodes')
        .upload(fileName, audioBlob, {
          contentType: 'audio/mpeg',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('podcast-episodes')
        .getPublicUrl(fileName);

      setAudioProgress('Creando episodio...');

      const { error: episodeError } = await supabase
        .from('podcast_episodes')
        .insert({
          title: `Diálogo: ${dialogue.title}`,
          description: dialogue.summary || `Diálogo socrático sobre ${ejeLabels[dialogue.eje || ''] || 'reflexión profunda'}`,
          audio_url: publicUrl,
          eje: dialogue.eje,
          published: false,
          duration_seconds: Math.floor(script.length / 15) // Rough estimate
        });

      if (episodeError) throw episodeError;

      toast.success('Podcast generado correctamente');
    } catch (error) {
      console.error('Error generating podcast:', error);
      toast.error('Error al generar podcast: ' + (error as Error).message);
    } finally {
      setGeneratingAudio(false);
      setAudioProgress('');
    }
  };

  const filteredDialogues = dialogues.filter(d => {
    const matchesSearch = d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.dialogue_content.some(entry => entry.content.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesEje = filterEje === 'all' || d.eje === filterEje;
    return matchesSearch && matchesEje;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar diálogos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Select value={filterEje} onValueChange={setFilterEje}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por eje" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los ejes</SelectItem>
            {Object.entries(ejeLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={fetchDialogues} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Refrescar
        </Button>
      </div>

      {filteredDialogues.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No hay diálogos guardados</p>
          <p className="text-sm">Los usuarios pueden guardar diálogos desde el Laboratorio</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* List */}
          <div className="space-y-2">
            <h3 className="font-serif text-lg mb-4">Diálogos ({filteredDialogues.length})</h3>
            <ScrollArea className="h-[500px] pr-4">
              {filteredDialogues.map((dialogue) => (
                <div
                  key={dialogue.id}
                  onClick={() => setSelectedDialogue(dialogue)}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors mb-2 ${
                    selectedDialogue?.id === dialogue.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{dialogue.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {new Date(dialogue.created_at).toLocaleDateString('es-ES')}
                        {' · '}
                        {dialogue.dialogue_content.length} mensajes
                      </p>
                    </div>
                    {dialogue.eje && (
                      <Badge className={ejeColors[dialogue.eje] || 'bg-primary/20'}>
                        {ejeLabels[dialogue.eje] || dialogue.eje}
                      </Badge>
                    )}
                  </div>
                  {dialogue.summary && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {dialogue.summary}
                    </p>
                  )}
                </div>
              ))}
            </ScrollArea>
          </div>

          {/* Detail */}
          <div>
            {selectedDialogue ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-lg">{selectedDialogue.title}</h3>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportToTxt(selectedDialogue)}
                      className="gap-2"
                    >
                      <Download className="w-4 h-4" />
                      TXT
                    </Button>
                    {isAdmin && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => generatePodcast(selectedDialogue)}
                          disabled={generatingAudio}
                          className="gap-2"
                        >
                          {generatingAudio ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Volume2 className="w-4 h-4" />
                          )}
                          MP3
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(selectedDialogue.id)}
                          className="gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {generatingAudio && audioProgress && (
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                    {audioProgress}
                  </div>
                )}

                <ScrollArea className="h-[400px] border rounded-lg p-4">
                  {selectedDialogue.dialogue_content.map((entry, index) => (
                    <div
                      key={index}
                      className={`mb-4 ${entry.type === 'user' ? 'text-right' : ''}`}
                    >
                      {entry.type === 'oracle' ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>ORÁCULO</span>
                            {entry.question && (
                              <>
                                <Badge variant="outline" className="text-xs">
                                  {ejeLabels[entry.question.eje] || entry.question.eje}
                                </Badge>
                                <span>Nivel {entry.question.nivel}</span>
                              </>
                            )}
                          </div>
                          <blockquote className="bg-card border rounded-lg p-3 text-left">
                            "{entry.content}"
                          </blockquote>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">USUARIO</span>
                          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 inline-block text-left max-w-[90%]">
                            {entry.content}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </ScrollArea>

                {selectedDialogue.summary ? (
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">Resumen (IA)</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => generateSummary(selectedDialogue)}
                        disabled={generatingSummary}
                        className="gap-1 text-xs h-7"
                      >
                        {generatingSummary ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Sparkles className="w-3 h-3" />
                        )}
                        Regenerar
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">{selectedDialogue.summary}</p>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Sin resumen</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generateSummary(selectedDialogue)}
                        disabled={generatingSummary}
                        className="gap-2"
                      >
                        {generatingSummary ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                        Generar resumen IA
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                <div className="text-center">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Selecciona un diálogo para ver detalles</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
