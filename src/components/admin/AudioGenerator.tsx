import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Volume2, Download, Play, Pause, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { SocraticQuestion, groupQuestionsByAxis } from '@/utils/dataExport';

interface AudioGeneratorProps {
  questions: SocraticQuestion[];
}

const VOICES = [
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger (Calm)' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah (Warm)' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George (Deep)' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel (Narrative)' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily (Soft)' },
];

export function AudioGenerator({ questions }: AudioGeneratorProps) {
  const [selectedAxis, setSelectedAxis] = useState<string>('all');
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0].id);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const groupedQuestions = groupQuestionsByAxis(questions);
  const axes = Object.keys(groupedQuestions);

  const getQuestionsToGenerate = () => {
    if (selectedAxis === 'all') return questions;
    return groupedQuestions[selectedAxis] || [];
  };

  const generateSingleAudio = async (text: string): Promise<string> => {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text, voiceId: selectedVoice }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'TTS generation failed');
    }

    const data = await response.json();
    return data.audioContent;
  };

  const handleGenerateSingle = async (question: SocraticQuestion) => {
    try {
      setGenerating(true);
      setCurrentText(question.texto);
      setProgress(50);

      const audioContent = await generateSingleAudio(question.texto);
      const url = `data:audio/mpeg;base64,${audioContent}`;
      setAudioUrl(url);
      setProgress(100);

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
        <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-lg">
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
            Descargar MP3
          </Button>
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
