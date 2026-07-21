/**
 * PitagorasLab.tsx
 * 
 * Página de prueba para la academia de Matemáticas (Pitágoras)
 * con chat conversacional RAG sobre el Teorema de Pitágoras.
 */

import { useState, useEffect } from 'react';
import { MaterialChat } from '@/caracteristicas/rag/MaterialChat';
import { Card, CardContent, CardHeader, CardTitle } from '@/compartido/ui/card';
import { Badge } from '@/compartido/ui/badge';
import { BookOpen, Calculator, History, Sparkles, Quote } from 'lucide-react';
import { Button } from '@/compartido/ui/button';

const PITAGORAS_ACADEMY_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

const MATERIAL_TOPICS = [
  {
    id: 'teorema',
    title: 'El Teorema',
    description: 'Definicion y formulacion basica',
    icon: Calculator,
    color: 'text-blue-500',
    query: 'teorema de pitagoras'
  },
  {
    id: 'demostracion',
    title: 'Demostraciones',
    description: 'Areas, algebra, multiples enfoques',
    icon: Sparkles,
    color: 'text-purple-500',
    query: 'demostracion'
  },
  {
    id: 'historia',
    title: 'Historia',
    description: 'Origenes y contexto filosofico',
    icon: History,
    color: 'text-amber-500',
    query: 'historia'
  },
  {
    id: 'filosofia',
    title: 'Crisis Filosofica',
    description: 'El descubrimiento de raiz de 2',
    icon: Quote,
    color: 'text-red-500',
    query: 'filosofia'
  }
];

export default function PitagorasLab() {
  const [academyName, setAcademyName] = useState('Pitagoras');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Pitagoras - Academia de Matematicas';
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Calculator className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Pitagoras</h1>
                <p className="text-xs text-slate-500">Academia de Matematicas</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              RAG Activo
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            El Laboratorio Matematico
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Explora el Teorema de Pitagoras a traves de un dialogo socratico con IA.
            Cuestiona, analiza y profundiza en la belleza de las demostraciones.
          </p>
        </div>

        {/* Topics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {MATERIAL_TOPICS.map((topic) => (
            <Card 
              key={topic.id}
              className={`cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 ${
                selectedTopic === topic.id ? 'border-primary ring-2 ring-primary/20' : ''
              }`}
              onClick={() => setSelectedTopic(topic.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <topic.icon className={`w-5 h-5 ${topic.color}`} />
                  <span className="font-semibold">{topic.title}</span>
                </div>
                <p className="text-sm text-slate-500">{topic.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chat Area */}
          <div className="lg:col-span-2">
            <Card className="h-[600px]">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Chat con Material RAG
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 h-[calc(100%-60px)]">
                <MaterialChat 
                  academyId={PITAGORAS_ACADEMY_ID}
                  spaceId="cccc0001-0001-0001-0001-000000000001"
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* About */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Sobre el Material</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600">
                <p className="mb-3">
                  Este material incluye fragmentos sobre el Teorema de Pitagoras,
                  extraidos de fuentes historicas y matematicas.
                </p>
                <ul className="space-y-1 text-xs">
                  <li>- Demostraciones clasicas</li>
                  <li>- Triplas pitagoricas</li>
                  <li>- Contexto historico</li>
                  <li>- Implicaciones filosoficas</li>
                </ul>
              </CardContent>
            </Card>

            {/* Suggested Questions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Preguntas de Prueba</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start text-left h-auto py-2"
                  onClick={() => setSelectedTopic('teorema')}
                >
                  Que es el Teorema de Pitagoras?
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start text-left h-auto py-2"
                  onClick={() => setSelectedTopic('demostracion')}
                >
                  Como se demuestra?
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start text-left h-auto py-2"
                  onClick={() => setSelectedTopic('historia')}
                >
                  Quien lo descubrio primero?
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start text-left h-auto py-2"
                  onClick={() => setSelectedTopic('filosofia')}
                >
                  Por que causo una crisis?
                </Button>
              </CardContent>
            </Card>

            {/* Technical Info */}
            <Card className="bg-slate-50">
              <CardContent className="p-4">
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">
                  Info Tecnica
                </h4>
                <div className="text-xs space-y-1 text-slate-600">
                  <p><strong>Academy ID:</strong> {PITAGORAS_ACADEMY_ID}</p>
                  <p><strong>Space ID:</strong> Geometria</p>
                  <p><strong>RAG:</strong> Semantic Search</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-12 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">Caso de Uso: RAG en Matematicas</h3>
          <p className="text-sm text-blue-700">
            Este escenario demuestra como un sistema RAG puede:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Recuperar fragmentos relevantes de material matematico</li>
              <li>Generar analisis que citan fuentes especificas</li>
              <li>Producir preguntas socraticas de diferentes niveles de profundidad</li>
              <li>Conectar conceptos matematicos con historia y filosofia</li>
            </ul>
          </p>
        </div>
      </main>
    </div>
  );
}
