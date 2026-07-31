import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GraduationCap, 
  BookOpen, 
  Calculator, 
  Scroll, 
  Brain, 
  Globe, 
  Landmark, 
  TrendingUp, 
  Zap,
  Send,
  MessageSquare,
  FileText,
  ChevronRight,
  CheckCircle,
  Circle,
  Lock,
  Sparkles,
  X,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { Button } from '@/compartido/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/compartido/ui/card';
import { Badge } from '@/compartido/ui/badge';
import { Input } from '@/compartido/ui/input';
import { toast } from '@/hooks/use-toast';

// Tipos para el flowchart
interface Nodo {
  id: string;
  nombre: string;
  descripcion: string;
  icono: typeof BookOpen;
  color: string;
  estado: 'completado' | 'actual' | 'bloqueado' | 'disponible';
  progreso: number;
  materiales: number;
  conexiones: string[];
  dependencias: string[];
}

// Nodos del flowchart PAAU
const NODOS_FLOWCHART: Nodo[] = [
  {
    id: 'lengua',
    nombre: 'Lengua Castellana',
    descripcion: 'Análisis lingüístico, literatura y expresión escrita',
    icono: BookOpen,
    color: '#7C3AED',
    estado: 'completado',
    progreso: 100,
    materiales: 12,
    conexiones: ['historia', 'filosofia'],
    dependencias: [],
  },
  {
    id: 'historia',
    nombre: 'Historia de España',
    descripcion: 'Siglo XIX hasta la actualidad',
    icono: Scroll,
    color: '#F59E0B',
    estado: 'actual',
    progreso: 45,
    materiales: 15,
    conexiones: ['ingles'],
    dependencias: ['lengua'],
  },
  {
    id: 'matematicas',
    nombre: 'Matemáticas',
    descripcion: 'Análisis, álgebra y geometría',
    icono: Calculator,
    color: '#059669',
    estado: 'actual',
    progreso: 30,
    materiales: 18,
    conexiones: ['fisica'],
    dependencias: [],
  },
  {
    id: 'filosofia',
    nombre: 'Filosofía',
    descripcion: 'Historia de la filosofía y pensamiento crítico',
    icono: Brain,
    color: '#3B82F6',
    estado: 'disponible',
    progreso: 0,
    materiales: 10,
    conexiones: ['economia'],
    dependencias: ['lengua'],
  },
  {
    id: 'ingles',
    nombre: 'Inglés',
    descripcion: 'Gramática y comprensión para selectividad',
    icono: Globe,
    color: '#EC4899',
    estado: 'disponible',
    progreso: 0,
    materiales: 8,
    conexiones: [],
    dependencias: ['historia'],
  },
  {
    id: 'economia',
    nombre: 'Economía',
    descripcion: 'Fundamentos de mercado y oferta-demanda',
    icono: TrendingUp,
    color: '#10B981',
    estado: 'bloqueado',
    progreso: 0,
    materiales: 7,
    conexiones: [],
    dependencias: ['filosofia'],
  },
];

// Mensajes de chat
interface Mensaje {
  id: string;
  tipo: 'usuario' | 'ia';
  contenido: string;
  timestamp: Date;
}

// Componente NodoCard para el flowchart
function NodoCard({ nodo }: { nodo: Nodo }) {
  const navigate = useNavigate();
  const Icono = nodo.icono;

  const handleClick = () => {
    if (nodo.estado === 'bloqueado') {
      toast({
        title: 'Materia bloqueada',
        description: `Completa primero: ${nodo.dependencias.map(d => NODOS_FLOWCHART.find(n => n.id === d)?.nombre).join(', ')}`,
        variant: 'destructive',
      });
      return;
    }
    navigate(`/carrera/academia-lexis/materia/paau/${nodo.id}/aportar`);
  };

  const getCardClasses = () => {
    const base = 'relative p-4 rounded-xl border-2 cursor-pointer transition-all';
    switch (nodo.estado) {
      case 'completado':
        return `${base} border-green-500 bg-green-500/10 hover:bg-green-500/20`;
      case 'actual':
        return `${base} border-primary bg-primary/10 hover:bg-primary/20`;
      case 'bloqueado':
        return `${base} border-border bg-muted/50 opacity-60 cursor-not-allowed`;
      default:
        return `${base} border-border bg-card hover:bg-muted hover:border-primary/50`;
    }
  };

  return (
    <div onClick={handleClick} className={getCardClasses()}>
      {/* Indicador de estado */}
      <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center" 
        style={{ 
          backgroundColor: nodo.estado === 'completado' ? '#22c55e' : 
                          nodo.estado === 'actual' ? 'hsl(var(--primary))' : 
                          'hsl(var(--muted))' 
        }}>
        {nodo.estado === 'completado' && <CheckCircle className="w-5 h-5 text-white" />}
        {nodo.estado === 'actual' && <Circle className="w-5 h-5 text-white animate-pulse" />}
        {nodo.estado === 'bloqueado' && <Lock className="w-5 h-5 text-muted-foreground" />}
        {nodo.estado === 'disponible' && <Circle className="w-5 h-5 text-muted-foreground" />}
      </div>
      
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" 
          style={{ backgroundColor: `${nodo.color}20` }}>
          <Icono className="w-5 h-5" style={{ color: nodo.estado === 'bloqueado' ? 'hsl(var(--muted-foreground))' : nodo.color }} />
        </div>
        <div>
          <h3 className={`font-semibold text-sm ${nodo.estado === 'bloqueado' ? 'text-muted-foreground' : ''}`}>
            {nodo.nombre}
          </h3>
          <p className="text-xs text-muted-foreground">
            {nodo.estado === 'bloqueado' ? 'Bloqueada' : `${nodo.materiales} materiales`}
          </p>
        </div>
      </div>
      
      {nodo.estado !== 'bloqueado' ? (
        <>
          <div className="w-full bg-muted rounded-full h-2 mt-2">
            <div 
              className={`h-2 rounded-full transition-all ${nodo.estado === 'completado' ? 'bg-green-500' : 'bg-primary'}`}
              style={{ width: `${nodo.progreso}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1 text-right">{nodo.progreso}%</p>
        </>
      ) : (
        <p className="text-xs text-muted-foreground mt-2">
          Requiere: {nodo.dependencias.map(d => NODOS_FLOWCHART.find(n => n.id === d)?.nombre).join(', ')}
        </p>
      )}
    </div>
  );
}

export function PAAUPage() {
  const [chatAbierto, setChatAbierto] = useState(true);
  const [chatMinimizado, setChatMinimizado] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    {
      id: '1',
      tipo: 'ia',
      contenido: '¡Hola! Soy tu asistente en Academia Lexis. ¿En qué materia necesitas ayuda hoy? Puedo responder preguntas sobre los materiales de estudio o ayudarte con conceptos específicos.',
      timestamp: new Date(),
    },
  ]);
  const [cargando, setCargando] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  const ACADEMIA_SLUG = 'academia-lexis';

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [mensajes]);

  const handleEnviarMensaje = async () => {
    if (!mensaje.trim()) return;

    const nuevoMensaje: Mensaje = {
      id: Date.now().toString(),
      tipo: 'usuario',
      contenido: mensaje,
      timestamp: new Date(),
    };

    setMensajes(prev => [...prev, nuevoMensaje]);
    setMensaje('');
    setCargando(true);

    // Simular respuesta de IA
    setTimeout(() => {
      const respuesta: Mensaje = {
        id: (Date.now() + 1).toString(),
        tipo: 'ia',
        contenido: getRespuestaIA(mensaje, nodoSeleccionado),
        timestamp: new Date(),
      };
      setMensajes(prev => [...prev, respuesta]);
      setCargando(false);
    }, 1500);
  };

  const getRespuestaIA = (pregunta: string, materia: Nodo | null): string => {
    const respuestas: Record<string, string> = {
      default: 'Basándome en los materiales de la academia, te recomiendo revisar el tema correspondiente. ¿Te gustaría que profundice en algún aspecto específico?',
      lengua: 'En Lengua Castellana, los temas más importantes son: análisis sintáctico, figuras retóricas, movimiento literario del siglo XX y comentario de texto. ¿Sobre cuál quieres que profundice?',
      historia: 'Historia de España abarca desde el siglo XIX hasta la actualidad. Los temas clave son: la Segunda República, la Guerra Civil, el franquismo y la transición democrática.',
      matematicas: 'Para Matemáticas es fundamental dominar: derivadas e integrales, matrices y determinantes, geometría analítica y probabilidad. ¿Qué tema necesitas repasar?',
      filosofia: 'El método cartesiano de Descartes es esencial: evidencia, análisis, síntesis y enumeración. El "cogito ergo sum" es el primer principio indudable.',
    };

    if (materia) {
      return respuestas[materia.id] || respuestas.default;
    }
    return respuestas.default;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="font-serif text-xl text-primary">λ</span>
            </div>
            <div>
              <h1 className="font-serif text-xl font-bold">Academia Lexis</h1>
              <p className="text-xs text-muted-foreground">Flowchart de Preparación PAAU</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-primary/10">
            <Sparkles className="w-3 h-3 mr-1" />
            Modo Estudiante
          </Badge>
        </div>
      </header>

      {/* Contenido principal */}
      <div className="flex-1 flex">
        {/* Flowchart */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="font-serif text-2xl md:text-3xl font-bold mb-2">
                Tu Camino de Aprendizaje
              </h2>
              <p className="text-muted-foreground">
                Progreso: 2/6 materias completadas · 28% global
              </p>
            </div>

            {/* Leyenda */}
            <div className="flex justify-center gap-6 mb-8 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Completado</span>
              </div>
              <div className="flex items-center gap-2">
                <Circle className="w-4 h-4 text-primary animate-pulse" />
                <span>En progreso</span>
              </div>
              <div className="flex items-center gap-2">
                <Circle className="w-4 h-4 text-muted-foreground" />
                <span>Disponible</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <span>Bloqueado</span>
              </div>
            </div>

            {/* Flowchart Grid */}
            <div className="relative">
              {/* Líneas de conexión SVG */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minHeight: '600px' }}>
                {/* Conexiones */}
                <defs>
                  <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.5" />
                  </linearGradient>
                </defs>
                
                {/* Lengua -> Historia */}
                <path d="M 16.67% 25% L 50% 25%" stroke="url(#lineGradient)" strokeWidth="3" fill="none" strokeDasharray="5,5" />
                <polygon points="50%,25% 45%,20% 45%,30%" fill="#F59E0B" opacity="0.5" />
                
                {/* Lengua -> Filosofía */}
                <path d="M 16.67% 25% L 16.67% 75%" stroke="#3B82F6" strokeWidth="3" fill="none" opacity="0.5" />
                
                {/* Historia -> Inglés */}
                <path d="M 50% 25% L 83.33% 25%" stroke="#EC4899" strokeWidth="3" fill="none" strokeDasharray="5,5" opacity="0.5" />
                
                {/* Filosofía -> Economía */}
                <path d="M 16.67% 75% L 50% 75%" stroke="#10B981" strokeWidth="3" fill="none" strokeDasharray="5,5" opacity="0.5" />
                
                {/* Matemáticas -> Física */}
                <path d="M 50% 50% L 83.33% 50%" stroke="#F97316" strokeWidth="3" fill="none" strokeDasharray="5,5" opacity="0.5" />
              </svg>

              {/* Nodos */}
              <div className="grid grid-cols-3 gap-8 relative" style={{ minHeight: '600px' }}>
                {/* Columna 1 */}
                <div className="space-y-8">
                  {/* Lengua - Completado */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative"
                  >
                    <NodoCard nodo={NODOS_FLOWCHART[0]} />
                  </motion.div>

                  {/* Matemáticas - En progreso */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="relative"
                  >
                    <NodoCard nodo={NODOS_FLOWCHART[2]} />
                  </motion.div>

                  {/* Filosofía - Disponible */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="relative"
                  >
                    <NodoCard nodo={NODOS_FLOWCHART[3]} />
                  </motion.div>
                </div>

                {/* Columna 2 */}
                <div className="space-y-8 mt-16">
                  {/* Historia - En progreso */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.05 }}
                    className="relative"
                  >
                    <NodoCard nodo={NODOS_FLOWCHART[1]} />
                  </motion.div>

                  {/* Economía - Bloqueado */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.15 }}
                    className="relative"
                  >
                    <NodoCard nodo={NODOS_FLOWCHART[5]} />
                  </motion.div>
                </div>

                {/* Columna 3 */}
                <div className="space-y-8 mt-32">
                  {/* Inglés - Disponible */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="relative"
                  >
                    <NodoCard nodo={NODOS_FLOWCHART[4]} />
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Materias restantes como tarjetas */}
            <div className="mt-12">
              <h3 className="font-serif text-lg font-bold mb-4 text-center">Materias Restantes</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { nombre: 'Latín', color: '#8B5CF6', icono: Landmark, materiales: 9 },
                  { nombre: 'Física', color: '#F97316', icono: Zap, materiales: 14 },
                ].map((materia, i) => (
                  <Card 
                    key={materia.nombre}
                    className="cursor-pointer hover:border-primary/50 transition-all"
                    onClick={() => toast({ title: `Próximamente: ${materia.nombre}` })}
                  >
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${materia.color}20` }}>
                        <materia.icono className="w-5 h-5" style={{ color: materia.color }} />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">{materia.nombre}</h4>
                        <p className="text-xs text-muted-foreground">{materia.materiales} materiales</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Panel de Chat IA */}
        <AnimatePresence>
          {chatAbierto && (
            <motion.div
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              className={`bg-card border-l border-border flex flex-col ${chatMinimizado ? 'h-16' : 'h-full'}`}
              style={{ width: chatMinimizado ? '60px' : '400px' }}
            >
              {/* Header del chat */}
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Asistente IA</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setChatMinimizado(!chatMinimizado)}
                    className="p-1 hover:bg-muted rounded"
                  >
                    {chatMinimizado ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setChatAbierto(false)}
                    className="p-1 hover:bg-muted rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {!chatMinimizado && (
                <>
                  {/* Mensajes */}
                  <div 
                    ref={chatRef}
                    className="flex-1 overflow-y-auto p-4 space-y-4"
                  >
                    {mensajes.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${msg.tipo === 'usuario' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] p-3 rounded-lg ${
                            msg.tipo === 'usuario'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm">{msg.contenido}</p>
                          <p className={`text-xs mt-1 ${msg.tipo === 'usuario' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                    {cargando && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-start"
                      >
                        <div className="bg-muted p-3 rounded-lg">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Input */}
                  <div className="p-4 border-t border-border">
                    <div className="flex gap-2">
                      <Input
                        value={mensaje}
                        onChange={(e) => setMensaje(e.target.value)}
                        placeholder="Pregunta sobre materiales..."
                        onKeyDown={(e) => e.key === 'Enter' && handleEnviarMensaje()}
                        className="flex-1"
                      />
                      <Button onClick={handleEnviarMensaje} size="icon">
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Quick actions */}
                  <div className="px-4 pb-4 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => setMensaje('Resumen del tema 3')}>
                      Resumen tema 3
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => setMensaje('Ejercicios de práctica')}>
                      Ejercicios
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => setMensaje('Explicación del método')}>
                      Explicar método
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Botón flotante para abrir chat */}
        {!chatAbierto && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            onClick={() => setChatAbierto(true)}
            className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 transition-all z-50"
          >
            <MessageSquare className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse" />
          </motion.button>
        )}
      </div>
    </div>
  );
}

export default PAAUPage;
