import { useState, useEffect } from 'react';
import { supabase } from '@/compartido/lib/supabaseClient';
import { Button } from '@/compartido/ui/button';
import { ScrollArea } from '@/compartido/ui/scroll-area';
import { Textarea } from '@/compartido/ui/textarea';
import { Badge } from '@/compartido/ui/badge';
import { Slider } from '@/compartido/ui/slider';
import { Label } from '@/compartido/ui/label';
import { toast } from 'sonner';
import { 
  Loader2, 
  RefreshCw, 
  Sparkles, 
  Download, 
  Volume2, 
  Check, 
  FileJson,
  BookOpen
} from 'lucide-react';

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
  selected_for_podcast: boolean;
  curated_text: string | null;
  word_count: number;
  created_at: string;
  updated_at: string;
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

export function PodcastTextCurator() {
  const [dialogues, setDialogues] = useState<SavedDialogue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDialogue, setSelectedDialogue] = useState<SavedDialogue | null>(null);
  const [curatedText, setCuratedText] = useState('');
  const [targetWordCount, setTargetWordCount] = useState(500);
  const [processing, setProcessing] = useState(false);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [saving, setSaving] = useState(false);

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

      const parsedDialogues = (data || []).map(d => ({
        ...d,
        dialogue_content: Array.isArray(d.dialogue_content)
          ? (d.dialogue_content as unknown as DialogueEntry[])
          : [],
        selected_for_podcast: d.selected_for_podcast ?? false,
        curated_text: d.curated_text ?? null,
        word_count: d.word_count ?? 0,
      }));

      setDialogues(parsedDialogues);
    } catch (error) {
      console.error('Error fetching dialogues:', error);
      toast.error('Error al cargar diálogos');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDialogue = (dialogue: SavedDialogue) => {
    setSelectedDialogue(dialogue);
    setCuratedText(dialogue.curated_text || '');
  };

  const processWithAI = async () => {
    if (!selectedDialogue) return;

    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-curate-text', {
        body: {
          dialogueContent: selectedDialogue.dialogue_content,
          targetWordCount,
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setCuratedText(data.curatedText);
      toast.success(`Texto curado: ${data.wordCount} palabras`);
    } catch (error) {
      console.error('Error processing text:', error);
      toast.error('Error al procesar texto: ' + (error as Error).message);
    } finally {
      setProcessing(false);
    }
  };

  const saveCuratedText = async () => {
    if (!selectedDialogue || !curatedText) return;

    setSaving(true);
    try {
      const wordCount = curatedText.split(/\s+/).filter(w => w.length > 0).length;

      const { error } = await supabase
        .from('saved_dialogues')
        .update({
          curated_text: curatedText,
          word_count: wordCount,
          selected_for_podcast: true,
        })
        .eq('id', selectedDialogue.id);

      if (error) throw error;

      // Update local state
      const updated = {
        ...selectedDialogue,
        curated_text: curatedText,
        word_count: wordCount,
        selected_for_podcast: true,
      };
      setSelectedDialogue(updated);
      setDialogues(prev => prev.map(d => d.id === selectedDialogue.id ? updated : d));

      toast.success('Texto guardado y marcado para podcast');
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const exportToJSON = () => {
    if (!selectedDialogue || !curatedText) return;

    const exportData = {
      id: selectedDialogue.id,
      title: selectedDialogue.title,
      eje: selectedDialogue.eje,
      curatedText,
      wordCount: curatedText.split(/\s+/).filter(w => w.length > 0).length,
      originalDialogue: selectedDialogue.dialogue_content,
      summary: selectedDialogue.summary,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `podcast-text-${selectedDialogue.title.replace(/\s+/g, '-').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('JSON exportado');
  };

  const generateTTS = async () => {
    if (!selectedDialogue || !curatedText) return;

    setGeneratingAudio(true);
    try {
      // Limit text for TTS
      const textForTTS = curatedText.length > 5000 ? curatedText.substring(0, 5000) : curatedText;

      const { data, error } = await supabase.functions.invoke('elevenlabs-tts', {
        body: {
          text: textForTTS,
          voiceId: 'CwhRBWXzGAHq8TQ4Fs17' // Roger voice
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Upload to storage
      const audioBlob = await fetch(`data:audio/mpeg;base64,${data.audioContent}`).then(r => r.blob());
      const fileName = `curated-${selectedDialogue.id}-${Date.now()}.mp3`;

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

      // Create episode
      const wordCount = curatedText.split(/\s+/).filter(w => w.length > 0).length;
      const { error: episodeError } = await supabase
        .from('podcast_episodes')
        .insert({
          title: `${selectedDialogue.title}`,
          description: selectedDialogue.summary || `Texto curado del diálogo socrático sobre ${ejeLabels[selectedDialogue.eje || ''] || 'reflexión'}`,
          audio_url: publicUrl,
          eje: selectedDialogue.eje,
          published: false,
          duration_seconds: Math.floor(wordCount / 2.5) // ~150 words per minute
        });

      if (episodeError) throw episodeError;

      toast.success('Audio generado y episodio creado');
    } catch (error) {
      console.error('Error generating TTS:', error);
      toast.error('Error al generar audio: ' + (error as Error).message);
    } finally {
      setGeneratingAudio(false);
    }
  };

  const currentWordCount = curatedText.split(/\s+/).filter(w => w.length > 0).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-lg">Curador de Textos para Podcast</h3>
          <p className="text-sm text-muted-foreground">
            Procesa diálogos de usuarios Platón con IA para generar textos optimizados para TTS
          </p>
        </div>
        <Button variant="outline" onClick={fetchDialogues} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Refrescar
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Dialogue List */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground">
            Diálogos Disponibles ({dialogues.length})
          </h4>
          <ScrollArea className="h-[500px] pr-4">
            {dialogues.map((dialogue) => (
              <div
                key={dialogue.id}
                onClick={() => handleSelectDialogue(dialogue)}
                className={`p-4 rounded-lg border cursor-pointer transition-colors mb-2 ${
                  selectedDialogue?.id === dialogue.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium truncate">{dialogue.title}</h4>
                      {dialogue.selected_for_podcast && (
                        <Check className="w-4 h-4 text-green-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(dialogue.created_at).toLocaleDateString('es-ES')}
                      {dialogue.word_count > 0 && ` · ${dialogue.word_count} palabras`}
                    </p>
                  </div>
                  {dialogue.eje && (
                    <Badge className={ejeColors[dialogue.eje] || 'bg-primary/20'}>
                      {ejeLabels[dialogue.eje] || dialogue.eje}
                    </Badge>
                  )}
                </div>
                {dialogue.curated_text && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {dialogue.curated_text.substring(0, 150)}...
                  </p>
                )}
              </div>
            ))}
          </ScrollArea>
        </div>

        {/* Editor Panel */}
        <div className="space-y-4">
          {selectedDialogue ? (
            <>
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{selectedDialogue.title}</h4>
                <Badge variant="outline" className="gap-1">
                  <BookOpen className="w-3 h-3" />
                  {currentWordCount} palabras
                </Badge>
              </div>

              {/* AI Processing Controls */}
              <div className="p-4 rounded-lg bg-muted/50 border space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm">Palabras objetivo: {targetWordCount}</Label>
                  <Slider
                    value={[targetWordCount]}
                    onValueChange={([v]) => setTargetWordCount(v)}
                    min={200}
                    max={1000}
                    step={50}
                  />
                </div>
                <Button
                  onClick={processWithAI}
                  disabled={processing}
                  className="w-full gap-2"
                >
                  {processing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  Procesar con IA
                </Button>
              </div>

              {/* Text Editor */}
              <Textarea
                value={curatedText}
                onChange={(e) => setCuratedText(e.target.value)}
                placeholder="El texto curado aparecerá aquí después de procesarlo con IA..."
                className="h-[280px] resize-none font-serif"
              />

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={saveCuratedText}
                  disabled={!curatedText || saving}
                  className="gap-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Guardar
                </Button>
                <Button
                  variant="outline"
                  onClick={exportToJSON}
                  disabled={!curatedText}
                  className="gap-2"
                >
                  <FileJson className="w-4 h-4" />
                  JSON
                </Button>
                <Button
                  variant="outline"
                  onClick={generateTTS}
                  disabled={!curatedText || generatingAudio}
                  className="gap-2"
                >
                  {generatingAudio ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                  Generar Audio
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
              <BookOpen className="w-12 h-12 mb-4 opacity-50" />
              <p>Selecciona un diálogo para curar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
