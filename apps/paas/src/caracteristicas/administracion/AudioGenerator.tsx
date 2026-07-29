import { useState } from 'react';
import { Button } from '@/compartido/ui/button';
import { Input } from '@/compartido/ui/input';
import { Textarea } from '@/compartido/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/compartido/ui/select';
import { Progress } from '@/compartido/ui/progress';
import { Switch } from '@/compartido/ui/switch';
import { Label } from '@/compartido/ui/label';
import { Volume2, Download, Play, Pause, Loader2, Save, Cloud, Github } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/compartido/lib/supabaseClient';
import { SocraticQuestion, groupQuestionsByAxis } from '@/utils/dataExport';
import { uploadPodcastEpisode, blobToBase64 } from '@/utils/podcastService';

interface AudioGeneratorProps {
  questions: SocraticQuestion[];
  academyId: string;
}

const VOICES = [
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger (Calm)' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah (Warm)' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George (Deep)' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel (Narrative)' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily (Soft)' },
];

export function AudioGenerator({ questions, academyId }: AudioGeneratorProps) {
  const [selectedAxis, setSelectedAxis] = useState<string>('all');
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0].id);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<SocraticQuestion | null>(null);

  // Episode form
  const [episodeTitle, setEpisodeTitle] = useState('');
  const [episodeDescription, setEpisodeDescription] = useState('');
  const [publishNow, setPublishNow] = useState(false);

  const groupedQuestions = groupQuestionsByAxis(questions);
  const axes = Object.keys(groupedQuestions);

  const getQuestionsToGenerate = () => {
    if (selectedAxis === 'all') return questions;
    return groupedQuestions[selectedAxis] || [];
  };

  const generateSingleAudio = async (text: string): Promise<{ base64: string; blob: Blob }> => {
    const { data, error } = await supabase.functions.invoke('elevenlabs-tts', {
      body: { text, voiceId: selectedVoice },
    });

    if (error) {
      throw new Error(error.message || 'TTS generation failed');
    }

    if (data.error) {
      throw new Error(data.error);
    }

    // Convert base64 to blob using fetch (safer than manual conversion)
    const audioDataUrl = `data:audio/mpeg;base64,${data.audioContent}`;
    const response = await fetch(audioDataUrl);
    const blob = await response.blob();

    return { base64: data.audioContent, blob };
  };

  const handleGenerateSingle = async (question: SocraticQuestion) => {
    try {
      setGenerating(true);
      setCurrentText(question.texto);
      setSelectedQuestion(question);
      setProgress(50);

      const { base64, blob } = await generateSingleAudio(question.texto);
      const url = `data:audio/mpeg;base64,${base64}`;
      setAudioUrl(url);
      setAudioBlob(blob);
      setProgress(100);

      // Pre-fill episode form
      setEpisodeTitle(`Pregunta: ${question.texto.substring(0, 50)}...`);
      setEpisodeDescription(`Eje: ${question.eje} | Nivel: ${question.nivel} | Tensión: ${question.tension}`);

      toast.success('Audio generado');
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Error: ' + (error as Error).message);
    } finally {
      setGenerating(false);
      setProgress(0);
      setCurrentText('');
    }
  };

  const handleSaveAsEpisode = async () => {
    if (!audioBlob || !selectedQuestion) {
      toast.error('Genera un audio primero');
      return;
    }

    if (!episodeTitle.trim()) {
      toast.error('Añade un título para el episodio');
      return;
    }

    try {
      setSaving(true);

      // Convert blob to base64
      const audioBase64 = await blobToBase64(audioBlob);
      const fileName = `episode-${Date.now()}.mp3`;

      // Upload to both Supabase Storage and GitHub
      const result = await uploadPodcastEpisode(audioBase64, fileName, {
        title: episodeTitle,
        description: episodeDescription,
        eje: selectedQuestion.eje,
        questionIds: [selectedQuestion.id],
        published: publishNow,
      }, academyId);

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      // Show storage results
      const supabaseStatus = result.storage?.supabase?.success ? '✓' : '✗';
      const githubStatus = result.storage?.github?.configured === false
        ? '(no configurado)'
        : result.storage?.github?.success ? '✓' : '✗';

      toast.success(
        `Episodio guardado | Cloud: ${supabaseStatus} | GitHub: ${githubStatus}`,
        { duration: 5000 }
      );
      
      // Reset form
      setEpisodeTitle('');
      setEpisodeDescription('');
      setAudioUrl(null);
      setAudioBlob(null);
      setSelectedQuestion(null);
      setPublishNow(false);

    } catch (error) {
      console.error('Save error:', error);
      toast.error('Error al guardar: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handlePlay = () => {
    if (!audioUrl) return;

    if (audioElement) {
      if (isPlaying) {
        audioElement.pause();
        setIsPlaying(false);
      } else {
        audioElement.play();
        setIsPlaying(true);
      }
    } else {
      const audio = new Audio(audioUrl);
      audio.onended = () => setIsPlaying(false);
      audio.play();
      setAudioElement(audio);
      setIsPlaying(true);
    }
  };

  const handleDownload = () => {
    if (!audioUrl) return;
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `lagrange-audio-${Date.now()}.mp3`;
    a.click();
  };

  const questionsToShow = getQuestionsToGenerate().slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-2">
          <label className="text-sm font-mono text-muted-foreground">Eje temático</label>
          <Select value={selectedAxis} onValueChange={setSelectedAxis}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos ({questions.length})</SelectItem>
              {axes.map(axis => (
                <SelectItem key={axis} value={axis}>
                  {axis} ({groupedQuestions[axis].length})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-mono text-muted-foreground">Voz</label>
          <Select value={selectedVoice} onValueChange={setSelectedVoice}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VOICES.map(voice => (
                <SelectItem key={voice.id} value={voice.id}>
                  {voice.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {generating && (
        <div className="space-y-2 p-4 bg-secondary/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-mono">Generando audio...</span>
          </div>
          <Progress value={progress} className="h-2" />
          {currentText && (
            <p className="text-xs text-muted-foreground italic truncate">
              "{currentText}"
            </p>
          )}
        </div>
      )}

      {audioUrl && !generating && (
        <div className="space-y-4 p-4 bg-primary/10 rounded-lg border border-primary/20">
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={handlePlay}
              className="gap-2"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isPlaying ? 'Pausar' : 'Reproducir'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Descargar
            </Button>
          </div>

          <div className="border-t border-border pt-4 space-y-4">
            <h4 className="font-mono text-sm font-medium">Guardar como Episodio de Podcast</h4>
            
            <div className="space-y-2">
              <Label htmlFor="title">Título del episodio</Label>
              <Input
                id="title"
                value={episodeTitle}
                onChange={(e) => setEpisodeTitle(e.target.value)}
                placeholder="Título del episodio..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={episodeDescription}
                onChange={(e) => setEpisodeDescription(e.target.value)}
                placeholder="Descripción del episodio..."
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="publish"
                checked={publishNow}
                onCheckedChange={setPublishNow}
              />
              <Label htmlFor="publish" className="text-sm">Publicar inmediatamente</Label>
            </div>

            <Button
              onClick={handleSaveAsEpisode}
              disabled={saving || !episodeTitle.trim()}
              className="gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Guardar Episodio
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-mono text-muted-foreground">
          Preguntas disponibles ({getQuestionsToGenerate().length})
        </h3>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {questionsToShow.map(q => (
            <div
              key={q.id}
              className="flex items-center justify-between gap-4 p-3 bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{q.texto}</p>
                <div className="flex gap-2 mt-1">
                  <span className="text-xs font-mono text-muted-foreground">{q.eje}</span>
                  <span className="text-xs font-mono text-muted-foreground">N{q.nivel}</span>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleGenerateSingle(q)}
                disabled={generating}
                className="shrink-0"
              >
                <Volume2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          {getQuestionsToGenerate().length > 10 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              Mostrando 10 de {getQuestionsToGenerate().length} preguntas
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
