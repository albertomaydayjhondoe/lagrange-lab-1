/**
 * SoberaniaLayout - Layout wrapper para Soberanía Administrativa
 * Incluye SoberaniaNav y el contenido de administración
 */

import { Outlet, useParams, useNavigate } from 'react-router-dom';
import { SoberaniaNav } from '@/components/SoberaniaNav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/compartido/ui/card';
import { Button } from '@/compartido/ui/button';
import { Building2, Users, BookOpen, Database, BarChart3, Zap, Settings, ArrowRight } from 'lucide-react';

export function SoberaniaLayout() {
  const { slug } = useParams();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <SoberaniaNav />

      <main className="pt-20 pb-12 px-4 md:px-6">
        <div className="container mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-serif mb-2">Panel de Soberanía Administrativa</h1>
            <p className="text-muted-foreground">
              Gestiona tu centro o la plataforma completa desde aquí.
            </p>
          </div>

          {/* Dashboard grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Miembros */}
            <Card
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => navigate('/soberania/centro')}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle>Miembros</CardTitle>
                </div>
                <CardDescription>Gestiona estudiantes y tutores</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="ghost" size="sm" className="gap-2">
                  Gestionar <ArrowRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>

            {/* Asignaturas */}
            <Card
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => navigate('/soberania/corpus')}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle>Asignaturas</CardTitle>
                </div>
                <CardDescription>Crea y gestiona materias</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="ghost" size="sm" className="gap-2">
                  Gestionar <ArrowRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>

            {/* Corpus RAG */}
            <Card
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => navigate('/soberania/corpus')}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Database className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle>Corpus RAG</CardTitle>
                </div>
                <CardDescription>Sube materiales para el Oráculo</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="ghost" size="sm" className="gap-2">
                  Gestionar <ArrowRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>

            {/* Estadísticas */}
            <Card
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => navigate('/soberania/auditoria')}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle>Estadísticas</CardTitle>
                </div>
                <CardDescription>Auditoría agregada del centro</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="ghost" size="sm" className="gap-2">
                  Ver <ArrowRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>

            {/* Features */}
            <Card
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => navigate('/soberania/plataforma')}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle>Features</CardTitle>
                </div>
                <CardDescription>Activa módulos disponibles</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="ghost" size="sm" className="gap-2">
                  Configurar <ArrowRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>

            {/* Settings */}
            <Card
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => navigate('/soberania/plataforma')}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle>Configuración</CardTitle>
                </div>
                <CardDescription>Ajustes del centro</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="ghost" size="sm" className="gap-2">
                  Ajustar <ArrowRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

export default SoberaniaLayout;
