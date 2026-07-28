import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  GraduationCap, 
  Users, 
  Plus, 
  Lock, 
  Globe, 
  Upload,
  FileText,
  Link as LinkIcon,
  File,
  Loader2,
  X,
  Check,
  BookOpen,
  Sparkles
} from 'lucide-react';
import { Button } from '@/compartido/ui/button';
import { Input } from '@/compartido/ui/input';
import { Textarea } from '@/compartido/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/compartido/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/compartido/ui/tabs';
import { Badge } from '@/compartido/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/compartido/ui/dialog';
import { cn } from '@/lib/utils';
import { supabase } from '@/compartido/lib/supabaseClient';
import { toast } from 'sonner';

interface Academy {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  role?: string | null;
  is_member?: boolean;
}

interface IngestFormat {
  id: string;
  name: string;
  icon: typeof FileText;
  description: string;
  accept: string;
}

/**
 * ACADEMIES PAGE
 * Gestión de academias + Ingesta de materiales en múltiples formatos
 */
export function AcademiesPage() {
  const navigate = useNavigate();
  const [academies, setAcademies] = useState<Academy[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showIngestDialog, setShowIngestDialog] = useState(false);
  const [ingestType, setIngestType] = useState<string>('text');
  const [isIngesting, setIsIngesting] = useState(false);
  const [selectedAcademy, setSelectedAcademy] = useState<Academy | null>(null);

  // Form states
  const [textContent, setTextContent] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [urlContent, setUrlContent] = useState('');
  const [urlTitle, setUrlTitle] = useState('');

  const formats: IngestFormat[] = [
    { id: 'text', name: 'Texto', icon: FileText, description: 'Pega texto plano o formatted', accept: '.txt,.md' },
    { id: 'url', name: 'URL', icon: LinkIcon, description: 'Extraer contenido de página web', accept: '' },
    { id: 'file', name: 'Archivo', icon: File, description: 'PDF, DOCX, TXT (próximamente)', accept: '.pdf,.docx' },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    
    // Check auth
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);

    // Load academies
    const { data, error } = await supabase.functions.invoke('list-academies');
    if (!error && data) {
      setAcademies(data.academies || []);
    }
    
    setLoading(false);
  };

  const handleIngest = async () => {
    if (!selectedAcademy) {
      toast.error('Selecciona una academia');
      return;
    }

    setIsIngesting(true);

    try {
      let content = '';
      let title = '';

      if (ingestType === 'text') {
        if (!textContent.trim() || !textTitle.trim()) {
          toast.error('Completa título y contenido');
          return;
        }
        content = textContent;
        title = textTitle;
      } else if (ingestType === 'url') {
        if (!urlContent.trim() || !urlTitle.trim()) {
          toast.error('Completa URL y título');
          return;
        }
        // Aquí iría la extracción de URL (por implementar)
        content = `Contenido extraído de: ${urlContent}\n\n[La extracción de URLs se implementará con un servicio de scraping]`;
        title = urlTitle;
      }

      // Insertar en corpus_fragments
      const { error } = await supabase.from('corpus_fragments').insert({
        academy_id: selectedAcademy.id,
        source_file: title,
        source_type: ingestType,
        content: content,
        axis: [],
        tension: 0.5,
      });

      if (error) throw error;

      toast.success('Material ingerido correctamente');
      setShowIngestDialog(false);
      setTextContent('');
      setTextTitle('');
      setUrlContent('');
      setUrlTitle('');
      setSelectedAcademy(null);
    } catch (error) {
      toast.error('Error al ingestar material');
    } finally {
      setIsIngesting(false);
    }
  };

  const myAcademies = academies.filter((a) => a.is_member);
  const otherAcademies = academies.filter((a) => !a.is_member);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-serif text-2xl md:text-3xl">Academias</h1>
              <p className="text-muted-foreground text-sm">
                {myAcademies.length} academia{myAcademies.length !== 1 ? 's' : ''} · {otherAcademies.length} disponible{otherAcademies.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline"
              onClick={() => setShowIngestDialog(true)}
              disabled={!isAuthenticated}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Ingestar Material</span>
            </Button>
            <Button onClick={() => navigate('/academies/create')} className="gap-2">
              <Plus className="w-4 h-4" />
              Crear
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="mine" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="mine" className="gap-2">
            <GraduationCap className="w-4 h-4" />
            Mis Academias
            {myAcademies.length > 0 && (
              <Badge variant="secondary" className="ml-1">{myAcademies.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="explore" className="gap-2">
            <Globe className="w-4 h-4" />
            Explorar
            {otherAcademies.length > 0 && (
              <Badge variant="secondary" className="ml-1">{otherAcademies.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* MIS ACADEMIAS */}
        <TabsContent value="mine">
          {!isAuthenticated ? (
            <Card>
              <CardContent className="py-12 text-center">
                <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-serif text-lg mb-2">Inicia sesión</h3>
                <p className="text-muted-foreground mb-4">
                  Inicia sesión para ver tus academias y crear nuevas
                </p>
                <Button onClick={() => navigate('/auth')}>Iniciar Sesión</Button>
              </CardContent>
            </Card>
          ) : myAcademies.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Sparkles className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-serif text-lg mb-2">Sin academias aún</h3>
                <p className="text-muted-foreground mb-4">
                  Crea tu primera academia o únete a una existente
                </p>
                <div className="flex items-center justify-center gap-2">
                  <Button variant="outline" onClick={() => navigate('/academies/create')}>
                    Crear Academia
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myAcademies.map((academy, index) => (
                <motion.div
                  key={academy.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card 
                    className="hover:border-primary/50 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/academia/${academy.slug}`)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="font-serif text-lg group-hover:text-primary transition-colors">
                          {academy.name}
                        </CardTitle>
                        <Badge variant={academy.role === 'admin' ? 'default' : 'secondary'}>
                          {academy.role}
                        </Badge>
                      </div>
                      <CardDescription className="line-clamp-2">
                        {academy.description || 'Sin descripción'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {academy.is_public ? 'Pública' : 'Privada'}
                          </span>
                          <span>@{academy.slug}</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAcademy(academy);
                            setShowIngestDialog(true);
                          }}
                        >
                          <Upload className="w-3 h-3" />
                          Ingestar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* EXPLORAR */}
        <TabsContent value="explore">
          {otherAcademies.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Globe className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-serif text-lg mb-2">No hay academias públicas</h3>
                <p className="text-muted-foreground">
                  Crea una academia pública para que otros puedan descubrirla
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {otherAcademies.map((academy, index) => (
                <motion.div
                  key={academy.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-2">
                      <CardTitle className="font-serif text-lg">
                        {academy.name}
                      </CardTitle>
                      <CardDescription className="line-clamp-2">
                        {academy.description || 'Sin descripción'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button 
                        variant="outline" 
                        className="w-full gap-2"
                        onClick={() => navigate(`/academia/${academy.slug}`)}
                      >
                        <BookOpen className="w-4 h-4" />
                        Explorar
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog de Ingesta */}
      <Dialog open={showIngestDialog} onOpenChange={setShowIngestDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              Ingestar Material
            </DialogTitle>
            <DialogDescription>
              Añade materiales de conocimiento a una academia
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Selector de Academia */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Academia destino</label>
              <select
                className="w-full p-2 rounded-lg border bg-background"
                value={selectedAcademy?.id || ''}
                onChange={(e) => {
                  const acad = myAcademies.find(a => a.id === e.target.value);
                  setSelectedAcademy(acad || null);
                }}
              >
                <option value="">Selecciona una academia...</option>
                {myAcademies.map((acad) => (
                  <option key={acad.id} value={acad.id}>
                    {acad.name} {acad.role === 'admin' ? '(admin)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Selector de Formato */}
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
                      disabled={format.id === 'file'}
                    >
                      <Icon className="w-6 h-6" />
                      <span className="text-sm font-medium">{format.name}</span>
                      <span className="text-xs text-muted-foreground text-center">
                        {format.description}
                      </span>
                    </button>
                  );
                })}
              </div>
              {ingestType === 'file' && (
                <p className="text-sm text-amber-500">
                  La ingesta de archivos estará disponible próximamente. Usa texto o URL por ahora.
                </p>
              )}
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
                <p className="text-sm text-muted-foreground">
                  El contenido se extraerá automáticamente de la URL cuando la funcionalidad esté disponible.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowIngestDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleIngest}
              disabled={isIngesting || !selectedAcademy}
            >
              {isIngesting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Ingestando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Ingestar
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
