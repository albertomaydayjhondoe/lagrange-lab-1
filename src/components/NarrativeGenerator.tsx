import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles, Copy, Check, BookOpen, MessageSquare, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { fetchAxes, ThematicAxis } from '@/utils/dataService';

interface NarrativeGeneratorProps {
  isAuthenticated: boolean;
}

interface SavedDialogue {
  id: string;
  title: string;
  eje: string | null;
  summary: string | null;
}

interface CorpusPrompt {
  id: string;
  texto: string;
  eje: string;
}

export function NarrativeGenerator({ isAuthenticated }: NarrativeGeneratorProps) {
  const [selectedSource, setSelectedSource] = useState<'dialogue' | 'prompt'>('dialogue');
  const [selectedDialogueId, setSelectedDialogueId] = useState<string>('');
  const [selectedPromptId, setSelectedPromptId] = useState<string>('');
  const [selectedEje, setSelectedEje] = useState<string>('any');
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [generating, setGenerating] = useState(false);
  const [narrative, setNarrative] = useState('');
  const [copied, setCopied] = useState(false);
  const [axes, setAxes] = useState<ThematicAxis[]>([]);
  const [dialogues, setDialogues] = useState<SavedDialogue[]>([]);
  const [prompts, setPrompts] = useState<CorpusPrompt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch axes
        const axesData = await fetchAxes();
        setAxes(axesData);

        // Fetch saved dialogues (user's own or all if admin)
        const { data: dialoguesData } = await supabase
          .from('saved_dialogues')
          .select('id, title, eje, summary')
          .order('created_at', { ascending: false });
        
        if (dialoguesData) {
          setDialogues(dialoguesData);
        }

        // Fetch socratic questions as prompts source
        const { data: promptsData } = await supabase
          .from('socratic_questions')
          .select('id, texto, eje')
          .order('nivel', { ascending: true });
        
        if (promptsData) {
          setPrompts(promptsData);
        }
      } catch (error) {
        console.error('Error loading sources:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  // Filter prompts by selected eje
  const filteredPrompts = selectedEje === 'any' 
    ? prompts 
    : prompts.filter(p => p.eje === selectedEje);

  // Filter dialogues by selected eje
  const filteredDialogues = selectedEje === 'any'
    ? dialogues
    : dialogues.filter(d => d.eje === selectedEje);

  const handleGenerate = async () => {
    if (selectedSource === 'dialogue' && !selectedDialogueId) {
      toast.error('Selecciona un diálogo como fuente');
      return;
    }

    if (selectedSource === 'prompt' && !selectedPromptId) {
      toast.error('Selecciona una pregunta como fuente');
      return;
    }

    if (!isAuthenticated) {
      toast.error('Inicia sesión para generar textos');
      return;
    }

    try {
      setGenerating(true);
      setNarrative('');

      const body: Record<string, unknown> = {
        sourceType: selectedSource,
        eje: selectedEje === 'any' ? undefined : selectedEje,
        length
      };

      if (selectedSource === 'dialogue') {
        body.dialogueId = selectedDialogueId;
      } else {
        body.promptId = selectedPromptId;
      }

      const { data, error } = await supabase.functions.invoke('generate-narrative', {
        body
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setNarrative(data.narrative);
      toast.success(`Texto generado (${data.wordCount} palabras)`);
    } catch (error) {
      console.error('Generation error:', error);
      toast.error((error as Error).message || 'Error al generar texto');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(narrative);
    setCopied(true);
    toast.success('Texto copiado');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isAuthenticated) {
    return (
      <Card className="border-dashed">
        <CardHeader className="text-center">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
          <CardTitle className="font-serif">Generador de Textos</CardTitle>
          <CardDescription>
            Inicia sesión para generar textos narrativos con IA
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const canGenerate = selectedSource === 'dialogue' ? !!selectedDialogueId : !!selectedPromptId;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Generador de Textos Narrativos
        </CardTitle>
        <CardDescription>
          Genera ensayos críticos a partir de diálogos guardados o preguntas del corpus
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Source Type Selection */}
        <div className="space-y-2">
          <Label>Tipo de fuente</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={selectedSource === 'dialogue' ? 'default' : 'outline'}
              onClick={() => {
                setSelectedSource('dialogue');
                setSelectedPromptId('');
              }}
              className="gap-2"
              disabled={generating}
            >
              <MessageSquare className="w-4 h-4" />
              Diálogo
            </Button>
            <Button
              type="button"
              variant={selectedSource === 'prompt' ? 'default' : 'outline'}
              onClick={() => {
                setSelectedSource('prompt');
                setSelectedDialogueId('');
              }}
              className="gap-2"
              disabled={generating}
            >
              <FileText className="w-4 h-4" />
              Pregunta
            </Button>
          </div>
        </div>

        {/* Eje Filter */}
        <div className="space-y-2">
          <Label>Filtrar por eje temático</Label>
          <Select value={selectedEje} onValueChange={setSelectedEje} disabled={generating}>
            <SelectTrigger>
              <SelectValue placeholder="Todos los ejes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Todos los ejes</SelectItem>
              {axes.map(axis => (
                <SelectItem key={axis.id} value={axis.id}>
                  {axis.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Source Selection based on type */}
        {selectedSource === 'dialogue' ? (
          <div className="space-y-2">
            <Label>Seleccionar diálogo</Label>
            {filteredDialogues.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No hay diálogos guardados{selectedEje !== 'any' ? ' en este eje' : ''}. 
                Guarda un diálogo desde la pestaña de Diálogo.
              </p>
            ) : (
              <Select value={selectedDialogueId} onValueChange={setSelectedDialogueId} disabled={generating}>
                <SelectTrigger>
                  <SelectValue placeholder="Elige un diálogo guardado" />
                </SelectTrigger>
                <SelectContent>
                  {filteredDialogues.map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      <span className="flex items-center gap-2">
                        <MessageSquare className="w-3 h-3" />
                        {d.title}
                        {d.eje && <span className="text-xs text-muted-foreground">({d.eje})</span>}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Seleccionar pregunta del corpus</Label>
            {filteredPrompts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No hay preguntas disponibles{selectedEje !== 'any' ? ' en este eje' : ''}.
              </p>
            ) : (
              <Select value={selectedPromptId} onValueChange={setSelectedPromptId} disabled={generating}>
                <SelectTrigger>
                  <SelectValue placeholder="Elige una pregunta" />
                </SelectTrigger>
                <SelectContent>
                  {filteredPrompts.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="line-clamp-1 max-w-[300px]">
                        {p.texto}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {/* Length Selection */}
        <div className="space-y-2">
          <Label>Extensión del texto</Label>
          <Select value={length} onValueChange={(v) => setLength(v as 'short' | 'medium' | 'long')} disabled={generating}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="short">Corto (~150 palabras)</SelectItem>
              <SelectItem value="medium">Medio (~300 palabras)</SelectItem>
              <SelectItem value="long">Largo (~500 palabras)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button 
          onClick={handleGenerate} 
          disabled={generating || !canGenerate}
          className="w-full gap-2"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generando...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generar Texto
            </>
          )}
        </Button>

        {narrative && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg">Resultado</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="gap-2"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copiado' : 'Copiar'}
              </Button>
            </div>
            <div className="p-4 bg-secondary/50 rounded-lg border border-border">
              <p className="text-foreground whitespace-pre-wrap font-serif leading-relaxed">
                {narrative}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
