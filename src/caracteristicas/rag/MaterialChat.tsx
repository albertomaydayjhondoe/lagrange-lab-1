/**
 * MaterialChat.tsx
 * 
 * Componente de chat conversacional RAG para analizar material de academia.
 * Permite a usuarios conversar con IA sobre fuentes específicas de conocimiento.
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/compartido/ui/button';
import { Textarea } from '@/compartido/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/compartido/ui/card';
import { Badge } from '@/compartido/ui/badge';
import { Send, Sparkles, BookOpen, Quote, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/compartido/lib/supabaseClient';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: CorpusFragment[];
  timestamp: Date;
}

interface CorpusFragment {
  id: string;
  source_file: string;
  source_section?: string;
  content: string;
  axis: string[];
  tension: number;
}

// Static fallback data for Pitagoras Academy
const PITAGORAS_FALLBACK_DATA: CorpusFragment[] = [
  {
    id: 'f1',
    source_file: 'pitagoras_teorema.md',
    source_section: 'Definicion',
    content: 'El Teorema de Pitagoras establece que en un triangulo rectangulo, el cuadrado de la hipotenusa es igual a la suma de los cuadrados de los catetos. Si a y b son los catetos y c es la hipotenusa, entonces: a^2 + b^2 = c^2.',
    axis: ['Demostracion', 'Aplicacion'],
    tension: 0.8
  },
  {
    id: 'f2',
    source_file: 'pitagoras_demostracion.md',
    source_section: 'Areas',
    content: 'Una demostracion clasica usa areas. Construimos un cuadrado de lado (a+b) y colocamos cuatro copias del triangulo rectangulo dentro. El area restante forma un cuadrado de lado c. Las areas de los cuatro triangulos son 4 x (ab/2) = 2ab, y el cuadrado grande tiene area (a+b)^2 = a^2 + 2ab + b^2. Restando: a^2 + b^2 = c^2.',
    axis: ['Demostracion', 'Elegancia'],
    tension: 0.7
  },
  {
    id: 'f3',
    source_file: 'pitagoras_triplas.md',
    source_section: 'Triplas',
    content: 'Triplas pitagoricas son enteros (a, b, c) con a^2 + b^2 = c^2. Ejemplos: (3,4,5), (5,12,13), (8,15,17). Euclides demostro que existen infinitas. Formula: a = m^2 - n^2, b = 2mn, c = m^2 + n^2.',
    axis: ['Demostracion'],
    tension: 0.65
  },
  {
    id: 'f4',
    source_file: 'pitagoras_historia.md',
    source_section: 'Historia',
    content: 'El teorema fue conocido por babilonios, egipcios e indios antes que Pitagoras (~2000 a.C.). Los pitagoricos lo demostraron alrededor del 500 a.C. Lo revolucionario fue la idea de que las matematicas podian ser un sistema deductivo puro.',
    axis: ['Intuicion'],
    tension: 0.5
  },
  {
    id: 'f5',
    source_file: 'pitagoras_filosofia.md',
    source_section: 'Filosofia',
    content: 'Tension filosofica: Pitagoras creia que los numeros eran la esencia de toda Realidad. El descubrimiento de que sqrt(2) no es racional aparentemente contradecía esto. Este descubrimiento causo una crisis en la escuela pitagorica.',
    axis: ['Intuicion', 'Elegancia'],
    tension: 0.9
  },
  {
    id: 'f6',
    source_file: 'pitagoras_geometria.md',
    source_section: 'NoEuclidiana',
    content: 'En espacios no euclidianos, el teorema no se cumple. En geometria hiperbolica o esferica, las relaciones son diferentes. Es el teorema una verdad universal, o solo propiedad del espacio euclidiano?',
    axis: ['Intuicion', 'Elegancia'],
    tension: 0.95
  }
];

interface MaterialChatProps {
  academyId: string;
  spaceId?: string;
  sourceFile?: string;
  onSourceSelect?: (fragment: CorpusFragment) => void;
}

const RAG_CHAT_PROMPT = `Eres un analista matemático socrático. Tu rol es:

1. **Analizar material RAG**: Cuando el usuario pregunte sobre el contenido de los fragmentos recuperados, cita TEXTUALMENTE de los fragmentos y desarrolla el análisis.

2. **Generar preguntas socráticas**: Cuando sea apropiado, haz preguntas que:
   - Expongan contradicciones o tensiones en el razonamiento
   - Cuestionen asunciones implícitas
   - Conecten con conceptos más amplios (historia, filosofía, aplicaciones)
   - Aumenten progresivamente la profundidad (nivel 1→2→3)

3. **Contexto matemático específico**: Usa terminología precisa:
   - Teoremas, demostraciones, axiomas
   - Generalizaciones y abstracciones
   - Contraejemplos y edge cases
   - Conexiones con otras áreas

4. **Tensión filosófica**: Cuando sea relevante, señala:
   - Paradojas aparentes en matemáticas
   - Límites entre lo intuitivo y lo formal
   - Preguntas sin respuesta conocida

FORMATO DE RESPUESTA:
- Si usas fragmentos: Cita entre comillas y desarrolla
- Usa markdown para fórmulas: $a^2 + b^2 = c^2$
- Niveles: 🔵 Introductorio, 🟡 Intermedio, 🔴 Profundo
`;

export function MaterialChat({ academyId, spaceId, sourceFile, onSourceSelect }: MaterialChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [fragments, setFragments] = useState<CorpusFragment[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadFragments() {
      try {
        const query = supabase
          .from('corpus_fragments')
          .select('id, source_file, source_section, content, axis, tension')
          .eq('status', 'active');

        if (spaceId) {
          query.eq('space_id', spaceId);
        }
        if (sourceFile) {
          query.eq('source_file', sourceFile);
        }

        const { data, error } = await query;

        if (error || !data || data.length === 0) {
          // Use fallback data if DB query fails or returns empty
          console.log('Using fallback RAG data');
          setFragments(PITAGORAS_FALLBACK_DATA);
        } else {
          setFragments(data);
        }
      } catch (err) {
        console.error('Error loading fragments:', err);
        // Use fallback data on error
        setFragments(PITAGORAS_FALLBACK_DATA);
      }
    }

    loadFragments();
  }, [academyId, spaceId, sourceFile]);

  const initializeChat = () => {
    const intro: ChatMessage = {
      id: 'intro',
      role: 'assistant',
      content: `He cargado ${fragments.length} fragmentos del material de esta academia. 

**Sobre qué te gustaría reflexionar?**

Puedo analizar:
- 📐 El **Teorema de Pitágoras** y sus demostraciones
- 🧮 **Triplas pitagóricas** y su infinidad
- 📜 La **historia** de las matemáticas griegas
- 🔢 La **crisis filosófica** del descubrimiento de √2
- 🌐 La pregunta sobre geometrías **no euclidianas**

O simplemente pregúntame lo que quieras y buscaré en el material.`,
      timestamp: new Date()
    };
    setMessages([intro]);
    setIsInitialized(true);
  };

  useEffect(() => {
    if (fragments.length > 0 && !isInitialized) {
      initializeChat();
    }
  }, [fragments, isInitialized]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const searchFragments = async (query: string): Promise<CorpusFragment[]> => {
    const queryLower = query.toLowerCase();
    return fragments.filter(f => {
      const contentMatch = f.content.toLowerCase().includes(queryLower);
      const axisMatch = f.axis.some(a => a.toLowerCase().includes(queryLower));
      const kwMatch = f.source_file.toLowerCase().includes(queryLower);
      return contentMatch || axisMatch || kwMatch;
    }).slice(0, 3);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const relevantFragments = await searchFragments(userMessage.content);

      let ragContext = '';
      if (relevantFragments.length > 0) {
        ragContext = '\n\n## FRAGMENTOS RECUPERADOS:\n' +
          relevantFragments.map((f, i) => 
            `[Fragmento ${i + 1}] (${f.source_file})\n"${f.content}"\nEjes: ${f.axis.join(', ')} | Tension: ${f.tension}`
          ).join('\n\n') + '\n\n---\n';
      }

      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('https://naikdjreibbugblihgwl.supabase.co/functions/v1/ai-dialogue-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': session ? `Bearer ${session.access_token}` : ''
        },
        body: JSON.stringify({
          action: 'chat',
          context: ragContext + '\n\nPregunta: ' + userMessage.content,
          systemPrompt: RAG_CHAT_PROMPT,
          academyId
        })
      });

      let content: string;
      if (response.ok) {
        const data = await response.json();
        content = data.result?.content || data.content || generateFallbackResponse(userMessage.content, relevantFragments);
      } else {
        content = generateFallbackResponse(userMessage.content, relevantFragments);
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content,
        sources: relevantFragments,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Chat error:', err);
      toast.error('Error en el chat');

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: generateFallbackResponse(input, []),
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateFallbackResponse = (question: string, fragments: CorpusFragment[]): string => {
    const q = question.toLowerCase();

    if (q.includes('pitágoras') || q.includes('pitagoras')) {
      if (fragments.length > 0) {
        const f = fragments[0];
        return `📐 Basándome en el material:\n\n> "${f.content}"\n\n**Analisis:** Esta formulacion del Teorema de Pitagoras es elegante en su simplicidad.\n\n**🔴 Pregunta socratica:** Si $a^2 + b^2 = c^2$ define la rectangularidad, que pasa en espacios donde esta relacion no se cumple?\n\n**Nivel: 3 (Profundo)** — Conecta con geometrias no euclidianas.`;
      }
      return `El Teorema de Pitagoras es uno de los resultados mas profundos de las matematicas. \n\n¿Quieres que explore alguna direccion?\n- La demostracion por areas\n- Las triplas pitagoricas\n- Su historia\n- La crisis filosofica`;
    }

    if (q.includes('tripla') || q.includes('3,4,5')) {
      return `🧮 Las triplas pitagoricas son fascinantes:\n\n**Ejemplos:** (3,4,5), (5,12,13), (8,15,17)\n\n**🔴 Pregunta socratica:** Euclides demostro que hay infinitas. Pero, por que las mas simples aparecen una y otra vez en la naturaleza?\n\n¿Casualidad o principio mas profundo?`;
    }

    if (q.includes('historia') || q.includes('origen')) {
      return `📜 **Dato contraintuitivo:** El teorema fue conocido *antes* de Pitagoras.\n\n- Babilonios (~2000 a.C.)\n- Egipcios\n- Indios\n\n**🔴 La pregunta:** Si no fue Pitagoras quien lo descubrio, por que lleva su nombre?\n\nLa respuesta: no solo enunciaron el teorema, sino que lo *demostraron*. Y eso cambio todo.`;
    }

    if (q.includes('√2') || q.includes('irracional')) {
      return `🔢 **La crisis de los pitagoricos:**\n\n$\\sqrt{2}$ no puede expresarse como fraccion de dos enteros.\n\nPara Pitagoras, esto era una contradiccion.\n\n**🔴 Pregunta socratica:** Fue esto un fracaso del sistema pitagorico, o el primer paso hacia las matematicas modernas?\n\nLo que parecia un error fue un descubrimiento.`;
    }

    return `💭 Pregunta interesante. El material cubre varios aspectos.\n\n**Direcciones posibles:**\n- La demostracion formal\n- Las aplicaciones practicas\n- La historia y contexto\n- Las preguntas filosoficas`;
  };

  const resetChat = () => {
    setMessages([]);
    setIsInitialized(false);
    if (fragments.length > 0) {
      initializeChat();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Card className="mb-4 border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="w-5 h-5 text-primary" />
            Chat sobre Material
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{fragments.length} fragmentos cargados</Badge>
            <Badge variant="secondary">RAG activo</Badge>
          </div>
        </CardContent>
      </Card>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 mb-4 max-h-[500px]">
        <AnimatePresence mode="popLayout">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] rounded-lg p-4 ${
                msg.role === 'user' 
                  ? 'bg-primary/10 border border-primary/20' 
                  : 'bg-card border border-border'
              }`}>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mb-3 pb-3 border-b border-border/50">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <Quote className="w-3 h-3" />
                      Fragmentos citados:
                    </div>
                    <div className="space-y-1">
                      {msg.sources.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => onSourceSelect?.(s)}
                          className="block text-xs text-left p-2 rounded bg-muted/50 hover:bg-muted w-full"
                        >
                          <span className="font-medium">{s.source_file}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 mb-2">
                  {msg.role === 'assistant' && (
                    <>
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span className="text-xs font-medium text-primary">Analista IA</span>
                    </>
                  )}
                </div>

                <div className="prose prose-sm max-w-none">
                  {msg.content.split('\n').map((line, i) => (
                    <p key={i} className="mb-1">{line}</p>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="bg-card border border-border p-4 rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Sparkles className="w-4 h-4 animate-spin" />
                <span className="text-sm">Buscando en el material...</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <div className="border-t pt-4">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Pregunta sobre el material (ej: 'Que dice sobre las triplas pitagoricas?')"
            className="flex-1 min-h-[60px] max-h-[120px] resize-none"
            disabled={isLoading}
          />
          <Button onClick={sendMessage} disabled={!input.trim() || isLoading} className="self-end">
            <Send className="w-4 h-4" />
          </Button>
          <Button onClick={resetChat} variant="ghost" className="self-end">
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Enter para enviar • La IA cita fragmentos del material
        </p>
      </div>
    </div>
  );
}

export default MaterialChat;
