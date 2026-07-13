import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/compartido/ui/button';
import { Textarea } from '@/compartido/ui/textarea';
import { Input } from '@/compartido/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/compartido/ui/select';
import { Label } from '@/compartido/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/compartido/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/compartido/ui/dialog';
import { ScrollArea } from '@/compartido/ui/scroll-area';
import { Sparkles, Loader2, Save, ArrowRight, FileText, HelpCircle, History, Download, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/compartido/lib/supabaseClient';
import { fetchAxes, ThematicAxis } from '@/compartido/lib/dataService';
import { generateContextualQuestion, AIQuestion } from '@/utils/aiService';
import jsPDF from 'jspdf';

const ADMIN_EMAIL = 'sampayo@gmail.com';

interface QuestionPromptEditorProps {
  isAuthenticated: boolean;
  onTransferToDialogue?: (content: { question: string; generatedText: string; eje: string }) => void;
}

interface GeneratedContent {
  question: AIQuestion;
  narrative: string;
}

interface QuestionHistoryItem {
  id: string;
  userQuestion: string;
  oracleResponse: string;
  narrative: string;
  eje: string;
  timestamp: Date;
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [questionHistory, setQuestionHistory] = useState<QuestionHistoryItem[]>([]);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const axesData = await fetchAxes();
        setAxes(axesData);
        if (axesData.length > 0) {
          setSelectedEje(axesData[0].id);
        }

        // Check admin status
        const { data: { session } } = await supabase.auth.getSession();
        setIsAdmin(session?.user?.email === ADMIN_EMAIL);

        // Load history from localStorage for admin
        if (session?.user?.email === ADMIN_EMAIL) {
          const savedHistory = localStorage.getItem('questionHistory');
          if (savedHistory) {
            const parsed = JSON.parse(savedHistory);
            setQuestionHistory(parsed.map((item: QuestionHistoryItem) => ({
              ...item,
              timestamp: new Date(item.timestamp)
            })));
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Persist history to localStorage
  useEffect(() => {
    if (isAdmin && questionHistory.length > 0) {
      localStorage.setItem('questionHistory', JSON.stringify(questionHistory));
    }
  }, [questionHistory, isAdmin]);

  const handleGenerate = async (length: 'medium' | 'long' = 'medium') => {
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
      const aiQuestion = await generateContextualQuestion(userQuestion.trim(), selectedEje);

      const { data, error } = await supabase.functions.invoke('generate-narrative', {
        body: {
          sourceType: 'custom',
          customText: `${userQuestion}\n\nPregunta generada: ${aiQuestion.pregunta}`,
          eje: selectedEje,
          length
        }
      });

      if (error) throw error;

      const content: GeneratedContent = {
        question: aiQuestion,
        narrative: data.narrative || ''
      };

      setGeneratedContent(content);

      // Add to history for admin
      if (isAdmin) {
        const historyItem: QuestionHistoryItem = {
          id: crypto.randomUUID(),
          userQuestion: userQuestion.trim(),
          oracleResponse: aiQuestion.pregunta,
          narrative: content.narrative,
          eje: selectedEje,
          timestamp: new Date()
        };
        setQuestionHistory(prev => [historyItem, ...prev].slice(0, 50)); // Keep last 50
      }

      toast.success(`Contenido generado (~${data.wordCount} palabras)`);
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

  const handleReuseQuestion = (item: QuestionHistoryItem) => {
    setUserQuestion(item.userQuestion);
    setSelectedEje(item.eje);
    setShowHistoryPanel(false);
    toast.success('Pregunta cargada');
  };

  const handleExportPDF = async (item?: QuestionHistoryItem) => {
    const contentToExport = item || (generatedContent ? {
      userQuestion,
      oracleResponse: generatedContent.question.pregunta,
      narrative: generatedContent.narrative,
      eje: selectedEje,
      timestamp: new Date()
    } : null);

    if (!contentToExport) {
      toast.error('No hay contenido para exportar');
      return;
    }

    setIsExporting(true);
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 20;
      const maxWidth = pageWidth - margin * 2;
      let yPosition = 20;

      // Title
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Sistema Lagrange', margin, yPosition);
      yPosition += 10;

      // Subtitle with axis
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      const axisLabel = axes.find(a => a.id === contentToExport.eje)?.label || contentToExport.eje;
      pdf.text(`Eje: ${axisLabel}`, margin, yPosition);
      yPosition += 8;
      pdf.text(`Fecha: ${new Date(contentToExport.timestamp).toLocaleDateString('es-ES')}`, margin, yPosition);
      yPosition += 15;

      // User Question
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Pregunta del Usuario:', margin, yPosition);
      yPosition += 7;
      pdf.setFont('helvetica', 'normal');
      const userLines = pdf.splitTextToSize(contentToExport.userQuestion, maxWidth);
      pdf.text(userLines, margin, yPosition);
      yPosition += userLines.length * 6 + 10;

      // Oracle Response
      pdf.setFont('helvetica', 'bold');
      pdf.text('Respuesta del Oráculo:', margin, yPosition);
      yPosition += 7;
      pdf.setFont('helvetica', 'italic');
      const oracleLines = pdf.splitTextToSize(`"${contentToExport.oracleResponse}"`, maxWidth);
      pdf.text(oracleLines, margin, yPosition);
      yPosition += oracleLines.length * 6 + 10;

      // Narrative
      pdf.setFont('helvetica', 'bold');
      pdf.text('Texto Generado:', margin, yPosition);
      yPosition += 7;
      pdf.setFont('helvetica', 'normal');
      const narrativeLines = pdf.splitTextToSize(contentToExport.narrative, maxWidth);
      
      // Handle page breaks for long text
      for (const line of narrativeLines) {
        if (yPosition > pdf.internal.pageSize.getHeight() - 20) {
          pdf.addPage();
          yPosition = 20;
        }
        pdf.text(line, margin, yPosition);
        yPosition += 6;
      }

      // Word count footer
      yPosition += 10;
      if (yPosition > pdf.internal.pageSize.getHeight() - 20) {
        pdf.addPage();
        yPosition = 20;
      }
      pdf.setFontSize(9);
      pdf.setTextColor(128);
      const wordCount = contentToExport.narrative.split(/\s+/).length;
      pdf.text(`Palabras: ${wordCount}`, margin, yPosition);

      pdf.save(`lagrange-${axisLabel.toLowerCase()}-${Date.now()}.pdf`);
      toast.success('PDF exportado');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Error al exportar PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteHistoryItem = (id: string) => {
    setQuestionHistory(prev => prev.filter(item => item.id !== id));
    toast.success('Eliminado del historial');
  };

  const handleClearHistory = () => {
    setQuestionHistory([]);
    localStorage.removeItem('questionHistory');
    toast.success('Historial limpiado');
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
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-serif flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-primary" />
                Formular Pregunta Propia
              </CardTitle>
              <CardDescription>
                Escribe tu pregunta, el Oráculo responderá y generará un texto
              </CardDescription>
            </div>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistoryPanel(!showHistoryPanel)}
                className="gap-2"
              >
                <History className="w-4 h-4" />
                Historial ({questionHistory.length})
              </Button>
            )}
          </div>
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
          </div>

          {/* Generate Buttons */}
          <div className="flex gap-2">
            <Button 
              onClick={() => handleGenerate('medium')} 
              disabled={isGenerating || !userQuestion.trim() || !selectedEje}
              className="flex-1 gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generar (~300 palabras)
                </>
              )}
            </Button>
            {isAdmin && (
              <Button 
                onClick={() => handleGenerate('long')} 
                disabled={isGenerating || !userQuestion.trim() || !selectedEje}
                variant="secondary"
                className="gap-2"
              >
                <FileText className="w-4 h-4" />
                Largo (~500)
              </Button>
            )}
          </div>

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
                    Texto Generado ({generatedContent.narrative.split(/\s+/).length} palabras)
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
                  {isAdmin && (
                    <Button
                      variant="outline"
                      onClick={() => handleExportPDF()}
                      disabled={isExporting}
                      className="gap-2"
                    >
                      <Download className="w-4 h-4" />
                      {isExporting ? 'Exportando...' : 'Exportar PDF'}
                    </Button>
                  )}
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
      </Card>

      {/* History Panel for Admin */}
      <AnimatePresence>
        {isAdmin && showHistoryPanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-serif text-lg flex items-center gap-2">
                    <History className="w-5 h-5 text-primary" />
                    Historial de Preguntas
                  </CardTitle>
                  {questionHistory.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearHistory}
                      className="gap-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                      Limpiar
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {questionHistory.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No hay preguntas en el historial
                  </p>
                ) : (
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-3">
                      {questionHistory.map(item => (
                        <div 
                          key={item.id}
                          className="p-3 rounded-lg border border-border bg-card hover:bg-secondary/30 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1">
                              <p className="text-sm font-medium line-clamp-2">
                                {item.userQuestion}
                              </p>
                              <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                                <span className="px-2 py-0.5 bg-secondary rounded">
                                  {axes.find(a => a.id === item.eje)?.label || item.eje}
                                </span>
                                <span>{item.timestamp.toLocaleDateString('es-ES')}</span>
                                <span>{item.narrative.split(/\s+/).length} palabras</span>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleReuseQuestion(item)}
                                title="Reutilizar pregunta"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleExportPDF(item)}
                                title="Exportar PDF"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteHistoryItem(item.id)}
                                className="text-destructive hover:text-destructive"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground italic line-clamp-1">
                            "{item.oracleResponse}"
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

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
    </div>
  );
}
