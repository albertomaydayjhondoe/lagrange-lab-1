/**
 * AportarApuntes - Subir materiales de conocimiento a una materia
 * 
 * Presenta la carga RAG como labor didáctica:
 * - "Aportar apuntes" en vez de "Subir fuente RAG"
 * - Lenguaje didáctico en estados
 * - Alerta clara cuando el contenido está disponible
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Upload, 
  FileText, 
  Link as LinkIcon,
  File,
  Loader2,
  CheckCircle,
  X,
  ChevronRight,
  BookOpen,
  GraduationCap
} from 'lucide-react';
import { Button } from '@/compartido/ui/button';
import { Input } from '@/compartido/ui/input';
import { Textarea } from '@/compartido/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/compartido/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/compartido/ui/dialog';
import { cn } from '@/lib/utils';
import { supabase } from '@/compartido/lib/supabaseClient';
import { fetchAcademySpaces, AcademySpace } from '@/compartido/lib/academySpacesService';
import { toast } from '@/hooks/use-toast';

interface Academy {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  role?: string | null;
}

interface IngestFormat {
  id: string;
  name: string;
  icon: typeof FileText;
  description: string;
}

export function AportarApuntes() {
  const { slug, materiaId } = useParams<{ slug: string; materiaId: string }>();
  const navigate = useNavigate();
  
  const [academy, setAcademy] = useState<Academy | null>(null);
  const [materias, setMaterias] = useState<AcademySpace[]>([]);
  const [selectedMateria, setSelectedMateria] = useState<string | null>(materiaId || null);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [showDialog, setShowDialog] = useState(false);
  const [ingestType, setIngestType] = useState<string>('text');
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestSuccess, setIngestSuccess] = useState(false);
  
  // Text input
  const [textContent, setTextContent] = useState('');
  const [textTitle, setTextTitle] = useState('');
  
  // URL input
  const [urlContent, setUrlContent] = useState('');
  const [urlTitle, setUrlTitle] = useState('');
  
  // File input
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [fileTitle, setFileTitle] = useState('');

  const formats: IngestFormat[] = [
    { id: 'text', name: 'Texto', icon: FileText, description: 'Pega texto plano o con formato' },
    { id: 'url', name: 'URL', icon: LinkIcon, description: 'Extraer contenido de página web' },
    { id: 'file', name: 'Archivo', icon: File, description: 'PDF, DOCX, TXT (extraer texto)' },
  ];

  useEffect(() => {
    if (slug) {
      loadData();
    }
  }, [slug, materiaId]);

  const loadData = async () => {
    setLoading(true);
    
    // Cargar academia
    const { data: academiesData } = await supabase.functions.invoke('list-academies');
    const userAcademies = (academiesData?.academies || []).filter((a: Academy) => a.is_member);
    const currentAcademy = userAcademies.find((a: Academy) => a.slug === slug);
    
    if (!currentAcademy) {
      toast({ title: 'No tienes acceso a esta carrera', variant: 'destructive' });
      navigate('/academies');
      return;
    }
    
    setAcademy(currentAcademy);

    // Cargar materias
    const spaces = await fetchAcademySpaces(currentAcademy.id);
    setMaterias(spaces.filter(s => !s.parent_space_id));

    // Si hay materia en param, seleccionarla
    if (materiaId) {
      setSelectedMateria(materiaId);
    }

    setLoading(false);
  };

  const resetForm = () => {
    setTextContent('');
    setTextTitle('');
    setUrlContent('');
    setUrlTitle('');
    setSelectedFile(null);
    setFileContent('');
    setFileTitle('');
    setIngestType('text');
    setIngestSuccess(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setFileTitle(file.name.replace(/\.[^/.]+$/, ''));

    try {
      let text = '';
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.txt') || fileName.endsWith('.md')) {
        text = await file.text();
      } else if (fileName.endsWith('.pdf')) {
        toast.info('PDF detectado. Extrayendo texto...');
        text = await extractTextFromPDF(file);
      } else if (fileName.endsWith('.docx')) {
        toast.info('DOCX detectado. Extrayendo texto...');
        text = await extractTextFromDOCX(file);
      } else {
        toast.error('Formato no soportado');
        return;
      }

      setFileContent(btoa(unescape(encodeURIComponent(text))));
      toast.success(`Texto extraído: ${text.length} caracteres`);
    } catch (error) {
      console.error('Error reading file:', error);
      toast.error('Error al leer archivo');
    }
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= Math.min(pdf.numPages, 50); i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n\n';
    }

    return fullText;
  };

  const extractTextFromDOCX = async (file: File): Promise<string> => {
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const getMimeType = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      txt: 'text/plain',
      md: 'text/markdown',
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  };

  const handleIngest = async () => {
    if (!selectedMateria) {
      toast.error('Selecciona una materia');
      return;
    }

    // Obtener space para la materia seleccionada
    const materia = materias.find(m => m.id === selectedMateria);
    if (!materia) {
      toast.error('Materia no encontrada');
      return;
    }

    setIsIngesting(true);

    try {
      if (ingestType === 'text') {
        if (!textContent.trim() || !textTitle.trim()) {
          toast.error('Completa título y contenido');
          setIsIngesting(false);
          return;
        }

        const { data: ingestData, error: ingestError } = await supabase.functions.invoke('ingest-source', {
          body: {
            academyId: academy?.id,
            spaceId: selectedMateria,
            text: textContent,
            title: textTitle,
          }
        });

        if (ingestError) throw ingestError;

        setIngestSuccess(true);
        toast.success('Tus apuntes ya forman parte del conocimiento de esta materia');
        setTimeout(() => {
          resetForm();
          setShowDialog(false);
        }, 2000);
        return;

      } else if (ingestType === 'url') {
        if (!urlContent.trim() || !urlTitle.trim()) {
          toast.error('Completa URL y título');
          setIsIngesting(false);
          return;
        }

        const { data: ingestData, error: ingestError } = await supabase.functions.invoke('ingest-source', {
          body: {
            academyId: academy?.id,
            spaceId: selectedMateria,
            url: urlContent,
            title: urlTitle,
          }
        });

        if (ingestError) throw ingestError;

        setIngestSuccess(true);
        toast.success('Tus apuntes ya forman parte del conocimiento de esta materia');
        setTimeout(() => {
          resetForm();
          setShowDialog(false);
        }, 2000);
        return;

      } else if (ingestType === 'file') {
        if (!selectedFile) {
          toast.error('Selecciona un archivo');
          setIsIngesting(false);
          return;
        }
        
        const { data: ingestData, error: ingestError } = await supabase.functions.invoke('ingest-source', {
          body: {
            academyId: academy?.id,
            spaceId: selectedMateria,
            file: fileContent,
            filename: selectedFile.name,
            mimeType: selectedFile.type || getMimeType(selectedFile.name),
            title: fileTitle || selectedFile.name,
          }
        });

        if (ingestError) throw ingestError;

        setIngestSuccess(true);
        toast.success('Tus apuntes ya forman parte del conocimiento de esta materia');
        setTimeout(() => {
          resetForm();
          setShowDialog(false);
        }, 2000);
        return;
      }
    } catch (error) {
      console.error('Ingest error:', error);
      toast.error('Error al aportar material');
    } finally {
      setIsIngesting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate(`/carrera/${slug}`)}
              className="text-muted-foreground"
            >
              <ChevronRight className="w-4 h-4 rotate-180 mr-1" />
              Volver a {academy?.name}
            </Button>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-serif text-2xl">📤 Aportar Apuntes</h1>
              <p className="text-muted-foreground text-sm">
                {academy?.name} · Enriquece el conocimiento compartido de la carrera
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Info */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="mb-8 border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-serif text-lg mb-2">¿Por qué aportar apuntes?</h3>
                  <p className="text-sm text-muted-foreground">
                    Cuando subes apuntes, no solo los guardas para ti — los incorporas al 
                    conocimiento colectivo de la carrera. El Oráculo y los tutores podrán 
                    usarlos para enriquecer sus respuestas. Es una forma de enseñar y aprender 
                    al mismo tiempo.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Selector de materia */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              Selecciona la materia
            </CardTitle>
            <CardDescription>
              Elige a qué materia quieres aportar tus apuntes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {materias.map((materia) => (
                <Button
                  key={materia.id}
                  variant={selectedMateria === materia.id ? 'default' : 'outline'}
                  onClick={() => setSelectedMateria(materia.id)}
                  className={cn(
                    selectedMateria === materia.id && "bg-primary"
                  )}
                >
                  <div 
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: materia.color }}
                  />
                  {materia.name}
                </Button>
              ))}
            </div>
            {!selectedMateria && (
              <p className="text-sm text-muted-foreground mt-3">
                Selecciona una materia para continuar
              </p>
            )}
          </CardContent>
        </Card>

        {/* Botón de aportar */}
        {selectedMateria && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card 
              className="cursor-pointer hover:border-primary/50 transition-all"
              onClick={() => setShowDialog(true)}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Upload className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-serif text-lg">
                        Aportar nuevo material
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Sube texto, una URL o un archivo (PDF, DOCX, TXT)
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Diálogo de subida */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" />
                Aportar Apuntes
              </DialogTitle>
              <DialogDescription>
                Añade materiales al conocimiento de {materias.find(m => m.id === selectedMateria)?.name}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Selector de formato */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Formato del material</label>
                <div className="grid grid-cols-3 gap-2">
                  {formats.map((format) => {
                    const Icon = format.icon;
                    return (
                      <button
                        key={format.id}
                        type="button"
                        onClick={() => setIngestType(format.id)}
                        className={cn(
                          "flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors",
                          ingestType === format.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:bg-muted"
                        )}
                      >
                        <Icon className="w-6 h-6" />
                        <span className="text-sm font-medium">{format.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Formularios según tipo */}
              {ingestType === 'text' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Título / Fuente</label>
                    <Input
                      value={textTitle}
                      onChange={(e) => setTextTitle(e.target.value)}
                      placeholder="Ej: Capítulo 1 - Introducción a la Filosofía"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Contenido</label>
                    <Textarea
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      placeholder="Pega aquí el texto o contenido del material..."
                      className="min-h-[200px] font-mono text-sm"
                    />
                  </div>
                </div>
              )}

              {ingestType === 'url' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Título</label>
                    <Input
                      value={urlTitle}
                      onChange={(e) => setUrlTitle(e.target.value)}
                      placeholder="Nombre del material"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">URL</label>
                    <Input
                      value={urlContent}
                      onChange={(e) => setUrlContent(e.target.value)}
                      placeholder="https://ejemplo.com/articulo"
                      type="url"
                    />
                  </div>
                </div>
              )}

              {ingestType === 'file' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Archivo (PDF, DOCX, TXT, MD)</label>
                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                      <input
                        type="file"
                        id="file-input"
                        accept=".pdf,.docx,.txt,.md"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <label htmlFor="file-input" className="cursor-pointer">
                        <File className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        {selectedFile ? (
                          <div>
                            <p className="font-medium">{selectedFile.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {(selectedFile.size / 1024).toFixed(1)} KB
                            </p>
                            {fileContent && (
                              <p className="text-sm text-green-500 mt-2">
                                ✓ Texto extraído: {(atob(fileContent).length / 1024).toFixed(1)} KB
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-muted-foreground">
                            Haz clic o arrastra un archivo para seleccionarlo
                          </p>
                        )}
                      </label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Título (opcional)</label>
                    <Input
                      value={fileTitle}
                      onChange={(e) => setFileTitle(e.target.value)}
                      placeholder="Nombre del material (se usa el nombre del archivo si está vacío)"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { resetForm(); setShowDialog(false); }}>
                Cancelar
              </Button>
              <Button 
                onClick={handleIngest}
                disabled={isIngesting || ingestSuccess}
              >
                {isIngesting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Procesando...
                  </>
                ) : ingestSuccess ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    ¡Aportado!
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Aportar
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

export default AportarApuntes;
