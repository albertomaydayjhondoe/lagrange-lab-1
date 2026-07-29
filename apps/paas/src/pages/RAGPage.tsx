import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  Search, 
  Plus, 
  FileText, 
  Send, 
  Loader2, 
  Trash2,
  Sparkles,
  User,
  Bot,
  ChevronDown,
  ChevronUp,
  Copy,
  Check
} from 'lucide-react';
import { Button } from '@/compartido/ui/button';
import { Input } from '@/compartido/ui/input';
import { Textarea } from '@/compartido/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/compartido/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/compartido/ui/tabs';
import { Badge } from '@/compartido/ui/badge';
import { ScrollArea } from '@/compartido/ui/scroll-area';
import { cn } from '@/lib/utils';
import { supabase } from '@/compartido/lib/supabaseClient';
import { toast } from 'sonner';

interface CorpusFragment {
  id: string;
  title?: string;
  source_file: string;
  source_type?: string;
  content: string;
  axis?: string[];
  tension?: number;
  created_at?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: CorpusFragment[];
  timestamp: Date;
}

/**
 * RAG PAGE - Retrieval Augmented Generation
 * Biblioteca de conocimiento + Chat con fuentes
 */
export function RAGPage() {
  const [activeTab, setActiveTab] = useState('chat');
  const [fragments, setFragments] = useState<CorpusFragment[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedFragment, setSelectedFragment] = useState<CorpusFragment | null>(null);
  
  // Ingest form
  const [ingestContent, setIngestContent] = useState('');
  const [ingestTitle, setIngestTitle] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSession();
    loadFragments();
    
    // Mensaje inicial
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: 'Soy tu Biblioteca de Conocimiento. Puedo responder preguntas basándome en los materiales ingeridos. ¿Qué quieres explorar?',
          timestamp: new Date(),
        },
      ]);
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
  };

  const loadFragments = async () => {
    const { data, error } = await supabase
      .from('corpus_fragments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setFragments(data);
    }
  };

  const handleIngest = async () => {
    if (!ingestContent.trim() || !ingestTitle.trim()) {
      toast.error('Completa el título y contenido');
      return;
    }

    setIsIngesting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Inicia sesión para ingestar contenido');
        return;
      }

      // Ingestar vía Edge Function o directamente
      const { error } = await supabase.from('corpus_fragments').insert({
        academy_id: '00000000-0000-0000-0000-000000000001', // Academia por defecto
        source_file: ingestTitle,
        source_type: 'text',
        content: ingestContent,
        axis: [],
        tension: 0.5,
      });

      if (error) throw error;

      toast.success('Material ingerido correctamente');
      setIngestContent('');
      setIngestTitle('');
      loadFragments();
    } catch (error) {
      toast.error('Error al ingestar material');
    } finally {
      setIsIngesting(false);
    }
  };

  const handleSearch = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Buscar fragmentos relevantes
      const { data: searchResults } = await supabase
        .from('corpus_fragments')
        .select('*')
        .textSearch('content', input.trim(), { type: 'websearch' })
        .limit(5);

      // Simular respuesta de IA (reemplazar con llamada real)
      await new Promise((resolve) => setTimeout(resolve, 1500));

      let responseContent = '';
      let sources: CorpusFragment[] = [];

      if (searchResults && searchResults.length > 0) {
        sources = searchResults;
        responseContent = `He encontrado ${searchResults.length} fragmentos relevantes. `;
        responseContent += searchResults
          .slice(0, 3)
          .map((f, i) => `**${i + 1}. ${f.source_file}**: "${f.content.substring(0, 200)}..."`)
          .join('\n\n');
      } else {
        responseContent = 'No encontré materiales relevantes en la biblioteca. ¿Quieres ingestar nuevo contenido?';
      }

      const oracleMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseContent,
        sources,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, oracleMessage]);
    } catch (error) {
      toast.error('Error en la búsqueda');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredFragments = fragments.filter(
    (f) =>
      f.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.source_file.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const deleteFragment = async (id: string) => {
    const { error } = await supabase.from('corpus_fragments').delete().eq('id', id);
    if (!error) {
      setFragments((prev) => prev.filter((f) => f.id !== id));
      toast.success('Fragmento eliminado');
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-serif text-2xl md:text-3xl">Biblioteca RAG</h1>
            <p className="text-muted-foreground text-sm">
              Conocimiento ingerido y consultable
            </p>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="chat" className="gap-2">
            <Search className="w-4 h-4" />
            <span>Consultar</span>
          </TabsTrigger>
          <TabsTrigger value="library" className="gap-2">
            <FileText className="w-4 h-4" />
            <span>Biblioteca</span>
          </TabsTrigger>
          <TabsTrigger value="ingest" className="gap-2">
            <Plus className="w-4 h-4" />
            <span>Ingestar</span>
          </TabsTrigger>
        </TabsList>

        {/* CONSULTAR TAB */}
        <TabsContent value="chat">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Chat */}
            <div className="md:col-span-2">
              <Card className="border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Chat con Biblioteca
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn(
                            "flex gap-3",
                            message.role === 'user' && "flex-row-reverse"
                          )}
                        >
                          <div
                            className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                              message.role === 'assistant'
                                ? "bg-primary/10 text-primary"
                                : "bg-secondary"
                            )}
                          >
                            {message.role === 'assistant' ? (
                              <Bot className="w-4 h-4" />
                            ) : (
                              <User className="w-4 h-4" />
                            )}
                          </div>
                          <div
                            className={cn(
                              "rounded-lg px-4 py-2 max-w-[85%]",
                              message.role === 'assistant'
                                ? "bg-muted"
                                : "bg-primary text-primary-foreground"
                            )}
                          >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            {message.sources && message.sources.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-border/50">
                                <p className="text-xs opacity-70 mb-1">Fuentes:</p>
                                {message.sources.map((s) => (
                                  <Badge key={s.id} variant="outline" className="text-xs mr-1">
                                    {s.source_file}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                      {isLoading && (
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Bot className="w-4 h-4 text-primary" />
                          </div>
                          <div className="bg-muted rounded-lg px-4 py-3">
                            <Loader2 className="w-4 h-4 animate-spin" />
                          </div>
                        </div>
                      )}
                      <div ref={scrollRef} />
                    </div>
                  </ScrollArea>

                  <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="flex gap-2">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Pregunta sobre el material ingerido..."
                      disabled={isLoading}
                      className="flex-1"
                    />
                    <Button type="submit" disabled={isLoading || !input.trim()} size="icon">
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Fragmentos recientes */}
            <div>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Materiales</CardTitle>
                  <CardDescription>{fragments.length} fragmentos</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[380px]">
                    <div className="space-y-2">
                      {fragments.slice(0, 10).map((fragment) => (
                        <div
                          key={fragment.id}
                          className={cn(
                            "p-2 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50",
                            selectedFragment?.id === fragment.id && "bg-primary/10 border-primary/30"
                          )}
                          onClick={() => setSelectedFragment(fragment)}
                        >
                          <p className="text-sm font-medium truncate">{fragment.source_file}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {fragment.content.substring(0, 80)}...
                          </p>
                        </div>
                      ))}
                      {fragments.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No hay materiales. Ingesta algunos.
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* BIBLIOTECA TAB */}
        <TabsContent value="library">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Todos los Materiales</CardTitle>
                  <CardDescription>{fragments.length} fragmentos en la biblioteca</CardDescription>
                </div>
                <Input
                  placeholder="Buscar en biblioteca..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64"
                />
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {filteredFragments.map((fragment) => (
                    <div
                      key={fragment.id}
                      className="p-4 rounded-lg border hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="w-4 h-4 text-primary" />
                            <span className="font-medium">{fragment.source_file}</span>
                            {fragment.axis && fragment.axis.length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {fragment.axis[0]}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {fragment.content}
                          </p>
                        </div>
                        {isAuthenticated && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteFragment(fragment.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {filteredFragments.length === 0 && (
                    <div className="text-center py-12">
                      <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        {searchQuery ? 'No hay resultados' : 'Biblioteca vacía'}
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* INGESTAR TAB */}
        <TabsContent value="ingest">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Ingestar Material
              </CardTitle>
              <CardDescription>
                Añade textos, documentos o materiales a la biblioteca de conocimiento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isAuthenticated ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    Inicia sesión para ingestar materiales
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Título / Fuente</label>
                    <Input
                      value={ingestTitle}
                      onChange={(e) => setIngestTitle(e.target.value)}
                      placeholder="Ej: Teorema de Pitágoras, Historia de Roma..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Contenido</label>
                    <Textarea
                      value={ingestContent}
                      onChange={(e) => setIngestContent(e.target.value)}
                      placeholder="Pega aquí el texto o contenido a ingestar..."
                      className="min-h-[200px]"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={handleIngest} disabled={isIngesting || !ingestContent.trim() || !ingestTitle.trim()}>
                      {isIngesting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Ingestando...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Ingestar Material
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}

              <div className="mt-6 p-4 rounded-lg bg-muted/50 border">
                <h4 className="font-medium mb-2">Tipos de contenido soportado:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Textos académicos y científicos</li>
                  <li>• Apuntes de clase</li>
                  <li>• Documentos históricos</li>
                  <li>• Artículos de investigación</li>
                  <li>• Cualquier material educativo en texto plano</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
