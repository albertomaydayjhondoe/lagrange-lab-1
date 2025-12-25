import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Sparkles } from 'lucide-react';
import { fetchQuestionsByEje, SocraticQuestion } from '@/utils/dataService';
import { analyzeNarrativeContext } from '@/utils/narrativeMatrix';

interface LabResponse {
  type: 'question' | 'reflection';
  content: string;
  eje?: string;
}

export function LabPromptEditor() {
  const [input, setInput] = useState('');
  const [responses, setResponses] = useState<LabResponse[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const processInput = async () => {
    if (!input.trim()) return;
    
    setIsProcessing(true);
    
    // Analizar contexto narrativo basado en palabras clave
    const keywords = {
      miedo: ['miedo', 'temor', 'pánico', 'ansiedad', 'terror'],
      control: ['control', 'poder', 'autoridad', 'dominio', 'mando'],
      salud_mental: ['loco', 'enfermo', 'trastorno', 'sensible', 'exagerado'],
      legitimidad: ['verdad', 'prueba', 'razón', 'derecho', 'justo'],
      responsabilidad: ['culpa', 'responsable', 'deber', 'obligación']
    };

    const inputLower = input.toLowerCase();
    let detectedEje = 'miedo';
    
    for (const [eje, words] of Object.entries(keywords)) {
      if (words.some(word => inputLower.includes(word))) {
        detectedEje = eje;
        break;
      }
    }

    // Obtener preguntas relacionadas
    const questions = await fetchQuestionsByEje(detectedEje);
    const randomQuestion = questions[Math.floor(Math.random() * questions.length)];

    const newResponses: LabResponse[] = [
      {
        type: 'reflection',
        content: `Tu inquietud parece orbitar alrededor del eje de ${detectedEje.replace('_', ' ')}. Antes de buscar respuestas, considera esta pregunta:`,
        eje: detectedEje
      },
      {
        type: 'question',
        content: randomQuestion?.texto || '¿Qué pasaría si dejaras de tener miedo?',
        eje: detectedEje
      }
    ];

    setResponses(prev => [...prev, ...newResponses]);
    setInput('');
    setIsProcessing(false);
  };

  const ejeLabels: Record<string, string> = {
    miedo: 'Miedo',
    control: 'Control',
    salud_mental: 'Salud Mental',
    legitimidad: 'Legitimidad',
    responsabilidad: 'Responsabilidad'
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Response area */}
      <div className="mb-8 space-y-6 min-h-[200px]">
        {responses.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Sparkles className="w-8 h-8 mx-auto mb-4 opacity-50" />
            <p className="font-serif text-lg">
              Expresa tu inquietud. El sistema no te dará respuestas, 
              te devolverá preguntas.
            </p>
          </div>
        ) : (
          responses.map((response, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-6 rounded-xl ${
                response.type === 'question'
                  ? 'bg-primary/5 border border-primary/20'
                  : 'bg-card border border-border'
              }`}
            >
              {response.eje && (
                <span className="inline-block px-2 py-1 rounded text-xs font-mono uppercase tracking-wider bg-primary/10 text-primary mb-3">
                  {ejeLabels[response.eje]}
                </span>
              )}
              <p className={`font-serif ${
                response.type === 'question' 
                  ? 'text-xl text-foreground' 
                  : 'text-muted-foreground'
              }`}>
                {response.type === 'question' && <span className="text-primary">"</span>}
                {response.content}
                {response.type === 'question' && <span className="text-primary">"</span>}
              </p>
            </motion.div>
          ))
        )}
      </div>

      {/* Input area */}
      <div className="relative">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="¿Qué te inquieta? ¿Qué contradicción observas?"
          className="min-h-[120px] pr-16 font-serif text-lg bg-card border-border resize-none focus:border-primary/50"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.metaKey) {
              processInput();
            }
          }}
        />
        <Button
          onClick={processInput}
          disabled={isProcessing || !input.trim()}
          size="icon"
          className="absolute bottom-4 right-4 bg-primary hover:bg-primary/90"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
      
      <p className="text-center text-muted-foreground text-sm mt-4 font-mono">
        ⌘ + Enter para enviar
      </p>
    </div>
  );
}
