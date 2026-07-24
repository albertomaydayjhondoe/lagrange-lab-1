/**
 * RESEARCH LAB - Núcleo del Sistema RAG Multi-Formato
 * 
 * Implementación del flowchart:
 * 1. Registro/Auth
 * 2. Selección de Academia
 * 3. Espacio de Materia (dinámico) - REEMPLAZADO por materias
 * 4. Upload de Material RAG
 * 5. Investigación con Tutor IA (tutoring-oracle)
 * 6. Guardado de Diálogos
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/compartido/ui/button';
import { Textarea } from '@/compartido/ui/textarea';
import { Input } from '@/compartido/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/compartido/ui/card';
import { Badge } from '@/compartido/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/compartido/ui/tabs';
import { Upload, Save, ChevronRight, FileText, Link, AlertTriangle, Loader2, Send, Sparkles } from 'lucide-react';
import { supabase } from '@/compartido/lib/supabaseClient';
import { toast } from 'sonner';

interface ProvenanceEntry {
  fragment_id: string;
  source_file: string;
  source_type: string;
  similarity_score: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  provenance?: ProvenanceEntry[];
  hasInferenceOnly?: boolean;
}

interface Academy { id: string; name: string; slug: string; is_public: boolean; }
interface Space { id: string; name: string; academy_id: string; }

const FLOWCHART_STEPS = [
  { id: 'auth', label: 'Registro', icon: '📝' },
  { id: 'academy', label: 'Academia', icon: '🏛️' },
  { id: 'space', label: 'Materia', icon: '📚' },
  { id: 'upload', label: 'Material', icon: '📤' },
  { id: 'research', label: 'Investigar', icon: '💬' },
];

export function ResearchLab() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [academies, setAcademies] = useState<Academy[]>([]);
  const [selectedAcademy, setSelectedAcademy] = useState<Academy | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);
  const [uploadContent, setUploadContent] = useState('');
  const [uploadUrl, setUploadUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<{role: 'user' | 'assistant'; content: string}[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [sessionTitle, setSessionTitle] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      setUser(session?.user || null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session);
      setUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { if (isAuthenticated) loadAcademies(); }, [isAuthenticated]);
  useEffect(() => { if (selectedAcademy) { loadSpaces(selectedAcademy.id); setCurrentStep(2); } }, [selectedAcademy]);
  useEffect(() => { if (selectedSpace) setCurrentStep(3); }, [selectedSpace]);

  const loadAcademies = async () => {
    const { data, error } = await supabase.from('academies').select('id, name, slug, is_public').order('name');
    if (error) { toast.error('Error cargando academias'); return; }
    setAcademies(data || []);
  };

  const loadSpaces = async (academyId: string) => {
    const { data, error } = await supabase.from('academy_spaces').select('id, name, academy_id').eq('academy_id', academyId).eq('is_active', true).order('name');
    if (error) { toast.error('Error cargando materias'); return; }
    setSpaces(data || []);
  };

  const handleUpload = async () => {
    if (!uploadContent.trim() && !uploadUrl.trim()) { toast.error('Ingresa contenido o URL'); return; }
    if (!selectedAcademy || !selectedSpace || !user) { toast.error('Selecciona academia y materia primero'); return; }
    setIsUploading(true);
    try {
      await supabase.functions.invoke('ingest-source', {
        body: { academyId: selectedAcademy.id, spaceId: selectedSpace.id, content: uploadContent.trim() || uploadUrl.trim(), sourceType: uploadUrl.trim() ? 'url' : 'text', title: `Material de ${selectedSpace.name}`, userId: user.id }
      });
      toast.success('Material cargado');
      setUploadContent(''); setUploadUrl('');
      setCurrentStep(4);
    } catch (error: any) { toast.error(error.message || 'Error al subir'); }
    finally { setIsUploading(false); }
  };

  const handleSendQuestion = async () => {
    if (!currentQuestion.trim() || !selectedAcademy) return;
    const userMessage: ChatMessage = { id: Date.now().toString(), role: 'user', content: currentQuestion, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setConversationHistory(prev => [...prev, { role: 'user', content: currentQuestion }]);
    setCurrentQuestion('');
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('tutoring-oracle', {
        body: { academyId: selectedAcademy.id, spaceId: selectedSpace?.id, question: currentQuestion, conversationHistory, maxSources: 5 }
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: data.response, timestamp: new Date(), provenance: data.provenance || [], hasInferenceOnly: data.has_inference_only }]);
      setConversationHistory(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (error: any) {
      toast.error(error.message || 'Error en la investigación');
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: '⚠️ Verifica que AI secrets estén configurados.', timestamp: new Date(), hasInferenceOnly: true }]);
    } finally { setIsLoading(false); }
  };

  const handleSaveSession = async () => {
    if (!user || messages.length === 0) return;
    try {
      await supabase.functions.invoke('save-dialogue', {
        body: { academyId: selectedAcademy?.id, spaceId: selectedSpace?.id, title: sessionTitle || `Sesión ${new Date().toLocaleDateString()}`, messages: messages.map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp.toISOString(), provenance: m.provenance })) }
      });
      toast.success('Sesión guardada');
      setShowSaveDialog(false);
    } catch (error: any) { toast.error(error.message); }
  };

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-serif mb-4">🔬 Research Lab</h1>
        <div className="flex items-center justify-between overflow-x-auto pb-2 mb-8">
          {FLOWCHART_STEPS.map((step, i) => (
            <div key={step.id} className="flex items-center">
              <button onClick={() => i < currentStep && setCurrentStep(i)} className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm whitespace-nowrap ${i === currentStep ? 'bg-primary text-primary-foreground' : i < currentStep ? 'bg-primary/20 cursor-pointer hover:bg-primary/30' : 'bg-muted text-muted-foreground'}`}>
                <span>{step.icon}</span><span>{step.label}</span>
              </button>
              {i < FLOWCHART_STEPS.length - 1 && <ChevronRight className="w-4 h-4 mx-1 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {currentStep === 0 && <AuthCard onAuth={() => setCurrentStep(1)} />}
        {currentStep === 1 && (isAuthenticated ? <AcademyCard academies={academies} selected={selectedAcademy} onSelect={setSelectedAcademy} /> : <AuthCard onAuth={() => setCurrentStep(1)} />)}
        {currentStep === 2 && (selectedAcademy ? <SpaceCard spaces={spaces} selected={selectedSpace} onSelect={setSelectedSpace} onBack={() => { setSelectedAcademy(null); setCurrentStep(1); }} /> : <AcademyCard academies={academies} selected={selectedAcademy} onSelect={setSelectedAcademy} />)}
        {currentStep === 3 && (selectedSpace ? <UploadCard uploadContent={uploadContent} setUploadContent={setUploadContent} uploadUrl={uploadUrl} setUploadUrl={setUploadUrl} onUpload={handleUpload} isUploading={isUploading} onSkip={() => setCurrentStep(4)} /> : <SpaceCard spaces={spaces} selected={selectedSpace} onSelect={setSelectedSpace} onBack={() => { setSelectedAcademy(null); setCurrentStep(1); }} />)}
        {currentStep === 4 && <ChatCard messages={messages} currentQuestion={currentQuestion} setCurrentQuestion={setCurrentQuestion} onSend={handleSendQuestion} isLoading={isLoading} onSave={() => setShowSaveDialog(true)} selectedAcademy={selectedAcademy} selectedSpace={selectedSpace} messagesEndRef={messagesEndRef} />}

        {showSaveDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md m-4">
              <CardHeader><CardTitle>💾 Guardar Sesión</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Input placeholder="Título" value={sessionTitle} onChange={e => setSessionTitle(e.target.value)} />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Cancelar</Button>
                  <Button onClick={handleSaveSession}><Save className="w-4 h-4 mr-2" />Guardar</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function AuthCard({ onAuth }: { onAuth: () => void }) {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [isLoading, setIsLoading] = useState(false); const [isSignUp, setIsSignUp] = useState(false);
  const handleSubmit = async () => {
    if (!email || !password) return;
    setIsLoading(true);
    try {
      if (isSignUp) { const { error } = await supabase.auth.signUp({ email, password }); if (error) throw error; toast.success('Registro exitoso!'); }
      else { const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error; toast.success('Bienvenido!'); onAuth(); }
    } catch (error: any) { toast.error(error.message); }
    finally { setIsLoading(false); }
  };
  return (
    <Card><CardHeader><CardTitle>📝 Registro / Login</CardTitle><CardDescription>Ingresa para acceder al sistema de investigación</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <Input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
        <Button onClick={handleSubmit} disabled={isLoading} className="w-full">{isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isSignUp ? 'Registrarse' : 'Ingresar'}</Button>
        <Button variant="ghost" onClick={() => setIsSignUp(!isSignUp)} className="w-full">{isSignUp ? '¿Ya tienes cuenta?' : '¿Nuevo? Regístrate'}</Button>
      </CardContent>
    </Card>
  );
}

function AcademyCard({ academies, selected, onSelect }: { academies: Academy[]; selected: Academy | null; onSelect: (a: Academy) => void }) {
  return (
    <Card><CardHeader><CardTitle>🏛️ Selecciona tu Academia</CardTitle><CardDescription>Elige la academia donde investigarás</CardDescription></CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {academies.map(a => <Button key={a.id} variant={selected?.id === a.id ? 'default' : 'outline'} onClick={() => onSelect(a)} className="justify-between">{a.name}{a.is_public && <Badge variant="secondary">Pública</Badge>}</Button>)}
          {academies.length === 0 && <p className="text-muted-foreground text-center py-4">No tienes academias. Crea una en /academies/create</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function SpaceCard({ spaces, selected, onSelect, onBack }: { spaces: Space[]; selected: Space | null; onSelect: (s: Space) => void; onBack: () => void }) {
  return (
    <Card><CardHeader><CardTitle>📚 Espacio de Materia</CardTitle><CardDescription>Selecciona una materia para investigar</CardDescription></CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {spaces.map(s => <Button key={s.id} variant={selected?.id === s.id ? 'default' : 'outline'} onClick={() => onSelect(s)}>{s.name}</Button>)}
          {spaces.length === 0 && <div className="text-center py-4"><p className="text-muted-foreground mb-3">No hay materias</p><Button onClick={onBack} variant="secondary">← Volver</Button></div>}
        </div>
      </CardContent>
    </Card>
  );
}

function UploadCard({ uploadContent, setUploadContent, uploadUrl, setUploadUrl, onUpload, isUploading, onSkip }: { uploadContent: string; setUploadContent: (v: string) => void; uploadUrl: string; setUploadUrl: (v: string) => void; onUpload: () => void; isUploading: boolean; onSkip: () => void }) {
  return (
    <Card><CardHeader><CardTitle>📤 Carga Material de Investigación</CardTitle><CardDescription>Texto, URL - Todos convergen a texto para RAG</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="text">
          <TabsList><TabsTrigger value="text"><FileText className="w-4 h-4 mr-2" />Texto</TabsTrigger><TabsTrigger value="url"><Link className="w-4 h-4 mr-2" />URL</TabsTrigger></TabsList>
          <TabsContent value="text" className="space-y-4">
            <Textarea placeholder="Pega contenido..." value={uploadContent} onChange={e => setUploadContent(e.target.value)} rows={6} />
            <Button onClick={onUpload} disabled={isUploading || !uploadContent.trim()}>{isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}{isUploading ? 'Procesando...' : 'Ingerir'}</Button>
          </TabsContent>
          <TabsContent value="url" className="space-y-4">
            <Input placeholder="https://..." value={uploadUrl} onChange={e => setUploadUrl(e.target.value)} />
            <Button onClick={onUpload} disabled={isUploading || !uploadUrl.trim()}>{isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}{isUploading ? 'Extrayendo...' : 'Extraer'}</Button>
          </TabsContent>
        </Tabs>
        <div className="flex justify-center"><Button variant="ghost" onClick={onSkip}>Saltar y empezar →</Button></div>
      </CardContent>
    </Card>
  );
}

function ChatCard({ messages, currentQuestion, setCurrentQuestion, onSend, isLoading, onSave, selectedAcademy, selectedSpace, messagesEndRef }: {
  messages: ChatMessage[]; currentQuestion: string; setCurrentQuestion: (v: string) => void; onSend: () => void; isLoading: boolean; onSave: () => void; selectedAcademy: Academy | null; selectedSpace: Space | null; messagesEndRef: React.RefObject<HTMLDivElement>;
}) {
  return (
    <Card><CardHeader><CardTitle>💬 Investigación con Tutor IA</CardTitle><CardDescription>{selectedAcademy?.name} {selectedSpace && `/ ${selectedSpace.name}`}</CardDescription></CardHeader>
      <CardContent>
        <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
          {messages.length === 0 && <div className="text-center py-8 text-muted-foreground"><Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>Inicia tu investigación</p></div>}
          <AnimatePresence>{messages.map(msg => (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-lg p-4 ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.role === 'assistant' && msg.provenance && msg.provenance.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <p className="text-xs font-mono mb-2 opacity-70">📋 Fuentes:</p>
                    {msg.provenance.map((p, i) => <div key={i} className="text-xs bg-background/50 rounded p-2 mb-1"><span className="font-medium">{p.source_file}</span><span className="opacity-70 ml-2">[{p.source_type}] sim: {(p.similarity_score * 100).toFixed(0)}%</span></div>)}
                  </div>
                )}
                {msg.role === 'assistant' && msg.hasInferenceOnly && <div className="mt-2 text-xs flex items-center gap-1 text-amber-500"><AlertTriangle className="w-3 h-3" />Sin fuente directa</div>}
              </div>
            </motion.div>
          ))}</AnimatePresence>
          {isLoading && <div className="flex justify-start"><div className="bg-muted rounded-lg p-4 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Investigando...</div></div>}
          <div ref={messagesEndRef} />
        </div>
        <div className="flex gap-2">
          <Input placeholder="¿Qué quieres investigar?" value={currentQuestion} onChange={e => setCurrentQuestion(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && onSend()} disabled={isLoading} />
          <Button onClick={onSend} disabled={isLoading || !currentQuestion.trim()}><Send className="w-4 h-4" /></Button>
          {messages.length > 0 && <Button variant="outline" onClick={onSave}><Save className="w-4 h-4" /></Button>}
        </div>
      </CardContent>
    </Card>
  );
}

export default ResearchLab;
