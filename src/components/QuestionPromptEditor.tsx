import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Sparkles, Send, Loader2, Save, ArrowRight, FileText, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { fetchAxes, ThematicAxis } from '@/utils/dataService';
import { generateContextualQuestion, AIQuestion } from '@/utils/aiService';

interface QuestionPromptEditorProps {
  isAuthenticated: boolean;
  onTransferToDialogue?: (content: { question: string; generatedText: string; eje: string }) => void;
}

interface GeneratedContent {
  question: AIQuestion;
  narrative: string;
}

export function QuestionPromptEditor({ isAuthenticated, onTransferToDialogue }: QuestionPromptEditorProps) {
  const [userQuestion, setUserQuestion] = useState('');
  const [selectedEje, setSelectedEje] = useState<string>('');
  const [axes, setAxes] = useState<ThematicAxis[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAxes = async () => {
      try {
        const axesData = await fetchAxes();
        setAxes(axesData);
        if (axesData.length > 0) {
          setSelectedEje(axesData[0].id);
        }
      } catch (error) {
        console.error('Error loading axes:', error);
      } finally {
        setLoading(false);
      }
    };
    loadAxes();
  }, []);

  const handleGenerate = async () => {
    if (!userQuestion.trim()) {
      toast.error('Escribe una pregunta o reflexión');
      return;
    }

    if (!selectedEje) {
      toast.error('Selecciona un eje temático');
      return;
    }

    setIsGenerating(true);
    try {
      // Generate AI response question
      const aiQuestion = await generateContextualQuestion(userQuestion.trim(), selectedEje);

      // Generate narrative text from the question
      const { data, error } = await supabase.functions.invoke('generate-narrative', {
        body: {
          sourceType: 'custom',
          customText: `${userQuestion}\n\nPregunta generada: ${aiQuestion.pregunta}`,
          eje: selectedEje,
          length: 'medium'
        }
      });

      if (error) throw error;

      setGeneratedContent({
        question: aiQuestion,
        narrative: data.narrative || ''
      });

      toast.success('Contenido generado');
    } catch (error) {
      console.error('Error generating:', error);
      toast.error('Error al generar contenido');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!saveTitle.trim() || !generatedContent) {
      toast.error('Ingresa un título');
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      // Save as dialogue with the generated content
      const dialogueContent = [
        {
          type: 'user',
          content: userQuestion,
          timestamp: new Date().toISOString()
        },
        {
          type: 'oracle',
          content: generatedContent.question.pregunta,
          question: {
            pregunta: generatedContent.question.pregunta,
            eje: generatedContent.question.eje,
            nivel: generatedContent.question.nivel,
            tension: generatedContent.question.tension,
            conexion: generatedContent.question.conexion
          },
          timestamp: new Date().toISOString()
        }
      ];

      const { error } = await supabase
        .from('saved_dialogues')
        .insert({
          user_id: user.id,
          title: saveTitle.trim(),
          eje: selectedEje,
          dialogue_content: dialogueContent,
          curated_text: generatedContent.narrative,
          word_count: generatedContent.narrative.split(/\s+/).length,
          summary: `Pregunta personalizada sobre ${axes.find(a => a.id === selectedEje)?.label || selectedEje}`
        });

      if (error) throw error;

      toast.success('Guardado correctamente');
      setShowSaveDialog(false);
      setSaveTitle('');
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTransfer = () => {
    if (!generatedContent || !onTransferToDialogue) return;
    
    onTransferToDialogue({
      question: generatedContent.question.pregunta,
      generatedText: generatedContent.narrative,
      eje: selectedEje
    });
    
    toast.success('Trasladado a Diálogo');
  };

  const reset = () => {
    setUserQuestion('');
    setGeneratedContent(null);
  };

  if (!isAuthenticated) {
    return (
      <Card className="border-dashed">
        <CardHeader className="text-center">
          <HelpCircle className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
          <CardTitle className="font-serif">Formular Pregunta</CardTitle>
          <CardDescription>
            Inicia sesión para formular tus propias preguntas y generar textos
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-primary" />
          Formular Pregunta Propia
        </CardTitle>
        <CardDescription>
          Escribe tu pregunta o reflexión, el Oráculo responderá y generará un texto relacionado
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Eje Selection */}
        <div className="space-y-2">
          <Label>Eje temático</Label>
          <Select value={selectedEje} onValueChange={setSelectedEje} disabled={isGenerating}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un eje" />
            </SelectTrigger>
            <SelectContent>
              {axes.map(axis => (
                <SelectItem key={axis.id} value={axis.id}>
                  <span className="flex items-center gap-2">
                    <span 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: axis.color }}
                    />
                    {axis.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Question Input */}
        <div className="space-y-2">
          <Label>Tu pregunta o reflexión</Label>
          <Textarea
            value={userQuestion}
            onChange={(e) => setUserQuestion(e.target.value)}
            placeholder="¿Qué contradicción quieres explorar? Escribe tu pregunta..."
            className="min-h-[100px] resize-none"
            disabled={isGenerating}
          />
          <p className="text-xs text-muted-foreground">
            El sistema generará una respuesta socrática y un texto basado en tu pregunta
          </p>
        </div>

        <Button 
          onClick={handleGenerate} 
          disabled={isGenerating || !userQuestion.trim() || !selectedEje}
          className="w-full gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generando...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generar Respuesta y Texto
            </>
          )}
        </Button>

        {/* Generated Content */}
        <AnimatePresence>
          {generatedContent && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4 mt-6"
            >
              {/* Oracle Response */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Respuesta del Oráculo
                </Label>
                <blockquote className="bg-primary/5 border border-primary/20 rounded-lg p-4 font-serif text-lg leading-relaxed">
                  <span className="text-primary opacity-50">"</span>
                  {generatedContent.question.pregunta}
                  <span className="text-primary opacity-50">"</span>
                </blockquote>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <span className="px-2 py-0.5 bg-secondary rounded">
                    {axes.find(a => a.id === generatedContent.question.eje)?.label || generatedContent.question.eje}
                  </span>
                  <span>Nivel {generatedContent.question.nivel}</span>
                  <span>Tensión: {(generatedContent.question.tension * 100).toFixed(0)}%</span>
                </div>
              </div>

              {/* Generated Narrative */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Texto Generado
                </Label>
                <div className="p-4 bg-secondary/50 rounded-lg border border-border max-h-[300px] overflow-y-auto">
                  <p className="text-foreground whitespace-pre-wrap font-serif leading-relaxed">
                    {generatedContent.narrative}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowSaveDialog(true)}
                  className="gap-2"
                >
                  <Save className="w-4 h-4" />
                  Guardar
                </Button>
                {onTransferToDialogue && (
                  <Button
                    variant="default"
                    onClick={handleTransfer}
                    className="gap-2"
                  >
                    <ArrowRight className="w-4 h-4" />
                    Trasladar a Diálogo
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={reset}
                  className="ml-auto"
                >
                  Nueva Pregunta
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Guardar Contenido</DialogTitle>
            <DialogDescription>
              Guarda tu pregunta y el texto generado para acceder desde Diálogo
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Título..."
              value={saveTitle}
              onChange={(e) => setSaveTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !saveTitle.trim()}>
              {isSaving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
