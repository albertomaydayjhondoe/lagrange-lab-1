import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles, Copy, Check, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { fetchAxes, ThematicAxis } from '@/utils/dataService';

interface NarrativeGeneratorProps {
  isAuthenticated: boolean;
}

export function NarrativeGenerator({ isAuthenticated }: NarrativeGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [selectedEje, setSelectedEje] = useState<string>('');
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [generating, setGenerating] = useState(false);
  const [narrative, setNarrative] = useState('');
  const [copied, setCopied] = useState(false);
  const [axes, setAxes] = useState<ThematicAxis[]>([]);

  useEffect(() => {
    fetchAxes().then(setAxes);
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Escribe un tema o punto de partida');
      return;
    }

    if (!isAuthenticated) {
      toast.error('Inicia sesión para generar textos');
      return;
    }

    try {
      setGenerating(true);
      setNarrative('');

      const { data, error } = await supabase.functions.invoke('generate-narrative', {
        body: { prompt, eje: selectedEje, length }
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Generador de Textos Narrativos
        </CardTitle>
        <CardDescription>
          Genera ensayos críticos explorando los ejes temáticos del sistema Lagrange
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="prompt">Tema o punto de partida</Label>
          <Textarea
            id="prompt"
            placeholder="Ej: ¿Cómo el miedo se convierte en una herramienta de control cuando se institucionaliza?"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            disabled={generating}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Eje temático (opcional)</Label>
            <Select value={selectedEje} onValueChange={setSelectedEje} disabled={generating}>
              <SelectTrigger>
                <SelectValue placeholder="Cualquiera" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Cualquiera</SelectItem>
                {axes.map(axis => (
                  <SelectItem key={axis.id} value={axis.id}>
                    {axis.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Extensión</Label>
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
        </div>

        <Button 
          onClick={handleGenerate} 
          disabled={generating || !prompt.trim()}
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
