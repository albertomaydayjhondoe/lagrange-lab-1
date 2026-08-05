/**
 * SoberaniaAuditoria - Vista de auditoría agregada para el centro
 * 
 * Muestra SOLO agregados de la actividad de los alumnos:
 * - Count de diálogos por materia
 * - Count de materiales aportados por materia
 * - Count de sesiones de tutoría
 * - Tendencias de uso
 * 
 * NUNCA muestra contenido bruto de diálogos o materiales individuales.
 * Esto es un principio de producto: el centro аудит agregados, nunca el material bruto.
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/compartido/ui/card';
import { Badge } from '@/compartido/ui/badge';
import { Loader2, BarChart3, MessageSquare, FileText, GraduationCap, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { supabase } from '@/compartido/lib/supabaseClient';
import { useUserRole, canAccessAdmin } from '@/components/RoleGate';

interface AcademyStats {
  total_dialogues: number;
  total_materials: number;
  total_sessions: number;
  active_students: number;
  dialogues_trend: number; // % cambio vs mes anterior
  materials_trend: number;
  sessions_trend: number;
}

interface MateriaStats {
  id: string;
  name: string;
  dialogue_count: number;
  material_count: number;
  session_count: number;
  student_count: number;
}

export default function SoberaniaAuditoria() {
  const { slug } = useParams<{ slug: string }>();
  const { role, loading: roleLoading, academySlug } = useUserRole();
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AcademyStats | null>(null);
  const [materiaStats, setMateriaStats] = useState<MateriaStats[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Verificar acceso
  useEffect(() => {
    if (roleLoading) return;
    
    if (!canAccessAdmin(role)) {
      setError('No tienes permisos para ver esta información.');
      setLoading(false);
      return;
    }
    
    // Verificar que el slug coincida con la academia del usuario
    if (role === 'owner' || role === 'tutor') {
      if (slug && slug !== academySlug) {
        setError('No tienes permisos para ver esta academia.');
        setLoading(false);
        return;
      }
    }
    
    loadStats();
  }, [role, roleLoading, slug, academySlug]);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 1. Obtener ID de la academia
      let academyId: string | null = null;
      
      if (slug) {
        const { data: academy } = await supabase
          .from('academies')
          .select('id')
          .eq('slug', slug)
          .maybeSingle();
        academyId = academy?.id || null;
      }
      
      if (!academyId) {
        setError('Academia no encontrada.');
        setLoading(false);
        return;
      }

      // 2. Obtener stats agregadas (simuladas - en producción usar RPC)
      // En producción, estas queries irían a un RPC que calcula agregados
      
      // Total de diálogos guardados en la academia
      const { count: dialogueCount } = await supabase
        .from('saved_dialogues')
        .select('*', { count: 'exact', head: true });
      
      // Total de materiales (corpus_fragments) subidos por estudiantes
      const { count: materialCount } = await supabase
        .from('corpus_fragments')
        .select('*', { count: 'exact', head: true })
        .eq('academy_id', academyId);
      
      // Total de sesiones de tutoría
      const { count: sessionCount } = await supabase
        .from('tutoring_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('academy_id', academyId);
      
      // Estudiantes únicos activos (con diálogos o materiales)
      const { count: activeStudents } = await supabase
        .from('saved_dialogues')
        .select('user_id', { count: 'exact', head: true })
        .neq('user_id', '');

      setStats({
        total_dialogues: dialogueCount || 0,
        total_materials: materialCount || 0,
        total_sessions: sessionCount || 0,
        active_students: activeStudents || 0,
        dialogues_trend: 12, // Simulado
        materials_trend: 8,
        sessions_trend: -3,
      });

      // 3. Stats por materia
      const { data: spaces } = await supabase
        .from('academy_spaces')
        .select('id, name')
        .eq('academy_id', academyId)
        .eq('is_active', true);

      const statsByMateria: MateriaStats[] = [];
      
      if (spaces) {
        for (const space of spaces) {
          // Count diálogos por materia (esto es una simplificación - en producción usar RPC)
          const { count: spaceDialogues } = await supabase
            .from('saved_dialogues')
            .select('*', { count: 'exact', head: true });
          
          // Count materiales por materia
          const { count: spaceMaterials } = await supabase
            .from('corpus_fragments')
            .select('*', { count: 'exact', head: true })
            .eq('space_id', space.id);

          statsByMateria.push({
            id: space.id,
            name: space.name,
            dialogue_count: spaceDialogues || 0,
            material_count: spaceMaterials || 0,
            session_count: 0, // Simplificado
            student_count: 0, // Simplificado
          });
        }
      }
      
      setMateriaStats(statsByMateria);
      setLoading(false);
    } catch (err) {
      console.error('Error loading stats:', err);
      setError('Error al cargar las estadísticas.');
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getTrendLabel = (trend: number) => {
    if (trend > 0) return `+${trend}% vs mes anterior`;
    if (trend < 0) return `${trend}% vs mes anterior`;
    return 'Sin cambios';
  };

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md text-center">
          <CardHeader>
            <CardTitle>Sin acceso</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-serif text-2xl">Auditoría Agregada</h1>
              <p className="text-sm text-muted-foreground">
                Estadísticas de actividad — solo datos agregados, nunca contenido bruto
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats generales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Diálogos del Oráculo</CardTitle>
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total_dialogues || 0}</div>
                <div className="flex items-center gap-1 mt-1">
                  {getTrendIcon(stats?.dialogues_trend || 0)}
                  <span className="text-xs text-muted-foreground">
                    {getTrendLabel(stats?.dialogues_trend || 0)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Materiales Aportados</CardTitle>
                <FileText className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total_materials || 0}</div>
                <div className="flex items-center gap-1 mt-1">
                  {getTrendIcon(stats?.materials_trend || 0)}
                  <span className="text-xs text-muted-foreground">
                    {getTrendLabel(stats?.materials_trend || 0)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Sesiones de Tutoría</CardTitle>
                <GraduationCap className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total_sessions || 0}</div>
                <div className="flex items-center gap-1 mt-1">
                  {getTrendIcon(stats?.sessions_trend || 0)}
                  <span className="text-xs text-muted-foreground">
                    {getTrendLabel(stats?.sessions_trend || 0)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Estudiantes Activos</CardTitle>
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.active_students || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Con al menos 1 diálogo
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Stats por materia */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Actividad por Materia</CardTitle>
              <CardDescription>
                Resumen agregado de participación por materia
              </CardDescription>
            </CardHeader>
            <CardContent>
              {materiaStats.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay datos disponibles todavía.
                </div>
              ) : (
                <div className="space-y-4">
                  {materiaStats.map((materia) => (
                    <div
                      key={materia.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-medium">{materia.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {materia.student_count} estudiantes
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-6">
                        <div className="text-center">
                          <div className="flex items-center gap-1 text-primary">
                            <MessageSquare className="w-4 h-4" />
                            <span className="font-bold">{materia.dialogue_count}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">diálogos</p>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center gap-1 text-primary">
                            <FileText className="w-4 h-4" />
                            <span className="font-bold">{materia.material_count}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">materiales</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Nota de privacidad */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8"
        >
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5">ℹ️</Badge>
                <div>
                  <h4 className="font-medium mb-1">Privacidad del alumno</h4>
                  <p className="text-sm text-muted-foreground">
                    Esta vista muestra <strong>solo datos agregados y conteos</strong>. 
                    El contenido real de los diálogos y materiales de cada alumno 
                    <strong> nunca es visible</strong> para el centro. Esta es una 
                    decisión de producto: el centro аудит patrones de uso, no el 
                    contenido privado del estudiante.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
