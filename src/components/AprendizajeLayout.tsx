/**
 * AprendizajeLayout - Layout wrapper para Aprendizaje
 * Incluye AprendizajeNav y las páginas de aprendizaje
 */

import { Outlet, useParams, useNavigate } from 'react-router-dom';
import { AprendizajeNav } from '@/components/AprendizajeNav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/compartido/ui/card';
import { Button } from '@/compartido/ui/button';
import { BookOpen, MessageCircle, FolderOpen, Radio, Map, FlaskConical, Calculator, GraduationCap, ArrowRight } from 'lucide-react';
import { isFeatureEnabled } from '@/config/featureFlags';
import { motion } from 'framer-motion';

interface ModuleCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  path: string;
  enabled: boolean;
  color: string;
}

function ModuleCard({ title, description, icon: Icon, path, enabled, color }: ModuleCardProps) {
  const navigate = useNavigate();

  if (!enabled) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className="cursor-pointer hover:border-primary/50 transition-colors h-full"
        onClick={() => navigate(path)}
      >
        <CardHeader>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${color}20` }}
            >
              <Icon className="w-6 h-6" style={{ color }} />
            </div>
            <CardTitle>{title}</CardTitle>
          </div>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="ghost" size="sm" className="gap-2">
            Acceder <ArrowRight className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function AprendizajeLayout() {
  const { slug } = useParams();

  const podcastEnabled = isFeatureEnabled('podcast');
  const topologiaEnabled = isFeatureEnabled('topologia');
  const researchEnabled = isFeatureEnabled('research');
  const pitagorasEnabled = isFeatureEnabled('pitagoras');
  const tutoriasEnabled = isFeatureEnabled('tutoriasTutor');

  return (
    <div className="min-h-screen bg-background">
      <AprendizajeNav />

      <main className="pt-20 pb-12 px-4 md:px-6">
        <div className="container mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-serif mb-3">Tu Espacio de Aprendizaje</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Explora tus asignaturas, consulta el Oráculo, y accede a todas las herramientas
              de aprendizaje integradas en tu academia.
            </p>
          </div>

          {/* Core modules */}
          <h2 className="text-xl font-serif mb-4">Módulos Principales</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <ModuleCard
              title="Asignaturas"
              description="Explora y selecciona tus materias"
              icon={BookOpen}
              path={slug ? `/aprendizaje/${slug}/asignatura` : '/aprendizaje'}
              enabled={true}
              color="#8B5CF6"
            />
            <ModuleCard
              title="Oráculo Socrático"
              description="Consulta el motor de preguntas"
              icon={MessageCircle}
              path={slug ? `/aprendizaje/${slug}/oraculo` : '/aprendizaje'}
              enabled={true}
              color="#10B981"
            />
            <ModuleCard
              title="Mi Portfolio"
              description="Tu historial de aprendizaje"
              icon={FolderOpen}
              path="/aprendizaje/perfil"
              enabled={true}
              color="#F59E0B"
            />
          </div>

          {/* Additional modules */}
          {(podcastEnabled || topologiaEnabled || researchEnabled || pitagorasEnabled || tutoriasEnabled) && (
            <>
              <h2 className="text-xl font-serif mb-4">Herramientas Avanzadas</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <ModuleCard
                  title="Podcast"
                  description="Radio y episodios educativos"
                  icon={Radio}
                  path={`/aprendizaje/${slug}/podcast`}
                  enabled={podcastEnabled}
                  color="#EC4899"
                />
                <ModuleCard
                  title="Topología"
                  description="Mapa del conocimiento"
                  icon={Map}
                  path={`/aprendizaje/${slug}/topologia`}
                  enabled={topologiaEnabled}
                  color="#3B82F6"
                />
                <ModuleCard
                  title="Research Lab"
                  description="Investigación académica"
                  icon={FlaskConical}
                  path={`/aprendizaje/${slug}/research`}
                  enabled={researchEnabled}
                  color="#8B5CF6"
                />
                <ModuleCard
                  title="Pitágoras Lab"
                  description="Laboratorio matemático"
                  icon={Calculator}
                  path={`/aprendizaje/${slug}/pitagoras`}
                  enabled={pitagorasEnabled}
                  color="#06B6D4"
                />
                <ModuleCard
                  title="Tutorías"
                  description="Sesiones con tutores"
                  icon={GraduationCap}
                  path={`/aprendizaje/${slug}/tutorias`}
                  enabled={tutoriasEnabled}
                  color="#F97316"
                />
              </div>
            </>
          )}

          {/* Coming soon for disabled modules */}
          {!podcastEnabled && !topologiaEnabled && !researchEnabled && !pitagorasEnabled && !tutoriasEnabled && (
            <div className="mt-12 p-6 bg-muted/50 rounded-xl text-center">
              <p className="text-muted-foreground">
                Los módulos avanzados están siendo preparados. Tu centro los activará pronto.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default AprendizajeLayout;
