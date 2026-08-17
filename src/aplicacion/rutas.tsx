/**
 * RUTAS - Academia Lexis
 * 
 * Navegación de 2 árboles raíz:
 * - /soberania/* — Soberanía Administrativa (Plataforma + Centro)
 * - /aprendizaje/* — Espacio del alumno
 * 
 * Tabla de mapeo:
 * | Ruta nueva | Componente | Endpoint |
 * |------------|------------|----------|
 * | /aprendizaje | Bienvenida.tsx / MisMaterias.tsx | academy_members, subjects |
 * | /aprendizaje/:slug/asignatura | MisMaterias.tsx | subjects (scope academy_id) |
 * | /aprendizaje/:slug/oraculo | Oraculo.tsx → DialogoSocratico.tsx | socratic-oracle RPC |
 * | /aprendizaje/:slug/materia/:id/aportar | AportarApuntes.tsx | corpus_fragments (privado) |
 * | /aprendizaje/perfil | AcademyProfile.tsx | saved_dialogues |
 * | /soberania | Configuracion.tsx | — |
 * | /soberania/centro | Admin.tsx + editores | academy_members |
 * | /soberania/corpus | RAGSourcesEditor.tsx | corpus del centro |
 * | /soberania/auditoria | SoberaniaAuditoria.tsx | agregados (NUNCA bruto) |
 * 
 * Reglas:
 * 1. El RoleGate decide al entrar a / qué árbol ver
 * 2. Las rutas legacy son redirects a equivalentes nuevos
 * 3. Los cruces del Mermaid: corpus→oráculo, portfolio→auditoría
 */

import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import NotFound from "@/pages/NotFound";

// Pages existentes reutilizadas
import PAAUPage from "@/pages/PAAUPage";
import { OraclePage } from "@/pages/OraclePage";
import { RAGPage } from "@/pages/RAGPage";
import Configuracion from "@/pages/Configuracion";
import AuthPage from "@/caracteristicas/autenticacion/Auth";
import Oraculo from "@/pages/Oraculo";
import AportarApuntes from "@/pages/AportarApuntes";
import Bienvenida from "@/pages/Bienvenida";
import MisMaterias from "@/pages/MisMaterias";
import AcademyProfile from "@/caracteristicas/autenticacion/AcademyProfile";
import SoberaniaAuditoria from "@/pages/SoberaniaAuditoria";

// Layouts
import { AprendizajeLayout } from "@/components/AprendizajeLayout";
import { SoberaniaLayout } from "@/components/SoberaniaLayout";

// Components de administración
import Admin from "@/caracteristicas/administracion/Admin";
import { RAGSourcesEditor } from "@/caracteristicas/administracion/RAGSourcesEditor";

// Componentes placeholder
import { ComingSoonPlaceholder } from "@/components/ComingSoonPlaceholder";
import { RoleGate } from "@/components/RoleGate";

// Feature flags
import { isFeatureEnabled } from "@/config/featureFlags";

// Lazy load módulos avanzados
const Podcast = lazy(() => import('@/caracteristicas/podcast/Podcast'));
const ResearchLab = lazy(() => import('@/caracteristicas/research/ResearchLab'));
const PitagorasLab = lazy(() => import('@/pages/PitagorasLab'));
const TutoriasPage = lazy(() => import('@/pages/Tutorias'));
const MapaDeLagrange = lazy(() => import('@/caracteristicas/topologia/MapaDeLagrange'));

function LoadingFallback() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function LegacyAcademyHomeRedirect() {
  const { slug } = useParams();
  return <Navigate to={slug ? `/aprendizaje/${slug}/asignatura` : '/aprendizaje'} replace />;
}

function LegacyAcademyOracleRedirect() {
  const { slug } = useParams();
  return <Navigate to={slug ? `/aprendizaje/${slug}/oraculo` : '/aprendizaje'} replace />;
}

function LegacyAcademyMateriaRedirect() {
  const { slug, materiaId } = useParams();
  return <Navigate to={slug && materiaId ? `/aprendizaje/${slug}/materia/${materiaId}/aportar` : '/aprendizaje'} replace />;
}

/**
 * Layout wrapper para rutas de Aprendizaje
 */
function AprendizajeWrapper({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate>
      <AprendizajeLayout>{children}</AprendizajeLayout>
    </RoleGate>
  );
}

/**
 * Layout wrapper para rutas de Soberanía
 */
function SoberaniaWrapper({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate>
      <SoberaniaLayout>{children}</SoberaniaLayout>
    </RoleGate>
  );
}

/**
 * RUTAS
 * 
 * Toda la navegación cuelga de exactamente dos árboles raíz:
 * - /soberania/* — Soberanía Administrativa
 * - /aprendizaje/* — Espacio del Alumno
 * 
 * Rutas legacy (/oracle, /library, /rag, /research, /podcast, etc.)
 * son redirects 301 a sus equivalentes en el nuevo árbol.
 */
export function Rutas() {
  const podcastEnabled = isFeatureEnabled('podcast');
  const topologiaEnabled = isFeatureEnabled('topologia');
  const researchEnabled = isFeatureEnabled('research');
  const pitagorasEnabled = isFeatureEnabled('pitagoras');
  const tutoriasEnabled = isFeatureEnabled('tutoriasTutor');

  return (
    <Routes>
      {/* ================================================ */}
      {/* RAÍZ: Redirect según rol vía RoleGate */}
      {/* ================================================ */}
      
      <Route 
        path="/" 
        element={
          <RoleGate>
            <PAAUPage />
          </RoleGate>
        } 
      />

      {/* ================================================ */}
      {/* ÁRBOL 1: SOBERANÍA ADMINISTRATIVA (/soberania/*) */}
      {/* ================================================ */}
      
      {/* Raíz de Soberanía → Dashboard de administración */}
      <Route 
        path="/soberania" 
        element={
          <SoberaniaWrapper>
            <Configuracion />
          </SoberaniaWrapper>
        } 
      />
      
      {/* Centro: Gestión de miembros, roles, requests */}
      <Route 
        path="/soberania/centro" 
        element={
          <SoberaniaWrapper>
            <Admin />
          </SoberaniaWrapper>
        } 
      />
      
      {/* Centro: Corpus RAG oficial del centro */}
      <Route 
        path="/soberania/corpus" 
        element={
          <SoberaniaWrapper>
            <RAGSourcesEditor />
          </SoberaniaWrapper>
        } 
      />
      
      {/* Centro: Auditoría agregada (NUNCA contenido bruto) */}
      <Route 
        path="/soberania/auditoria" 
        element={
          <SoberaniaWrapper>
            <SoberaniaAuditoria />
          </SoberaniaWrapper>
        } 
      />
      
      {/* Plataforma: Super-admin (futuro) */}
      <Route 
        path="/soberania/plataforma" 
        element={
          <SoberaniaWrapper>
            <ComingSoonPlaceholder 
              title="Panel de Plataforma"
              description="Gestión de múltiples centros y configuración global."
            />
          </SoberaniaWrapper>
        } 
      />

      {/* ================================================ */}
      {/* ÁRBOL 2: APRENDIZAJE (/aprendizaje/*) */}
      {/* ================================================ */}
      
      {/* Raíz de Aprendizaje → Bienvenida o MisMaterias según estado */}
      <Route 
        path="/aprendizaje" 
        element={
          <AprendizajeWrapper>
            <Bienvenida />
          </AprendizajeWrapper>
        } 
      />
      
      {/* Asignaturas de una academia */}
      <Route 
        path="/aprendizaje/:slug/asignatura" 
        element={
          <AprendizajeWrapper>
            <MisMaterias />
          </AprendizajeWrapper>
        } 
      />
      
      {/* Alias: /aprendizaje/:slug es igual a /aprendizaje/:slug/asignatura */}
      <Route 
        path="/aprendizaje/:slug" 
        element={<LegacyAcademyHomeRedirect />} 
      />
      
      {/* Oráculo Socrático — CORE del sistema */}
      {/* Endpoint: Edge Function socratic-oracle, RPC match_corpus_fragments */}
      <Route 
        path="/aprendizaje/:slug/oraculo" 
        element={
          <AprendizajeWrapper>
            <Oraculo />
          </AprendizajeWrapper>
        } 
      />
      
      {/* Aportar apuntes — privado del alumno */}
      {/* Endpoint: corpus_fragments (solo el del alumno, no el del centro) */}
      <Route 
        path="/aprendizaje/:slug/materia/:id/aportar" 
        element={
          <AprendizajeWrapper>
            <AportarApuntes />
          </AprendizajeWrapper>
        } 
      />
      
      {/* Portfolio del alumno — Historial + notas propias */}
      {/* Endpoint: saved_dialogues + corpus_fragments (solo propios) */}
      <Route 
        path="/aprendizaje/perfil" 
        element={
          <AprendizajeWrapper>
            <AcademyProfile />
          </AprendizajeWrapper>
        } 
      />

      {/* ================================================ */}
      {/* MÓDULOS AVANZADOS (/aprendizaje/:slug/*) */}
      {/* ================================================ */}
      
      {/* Podcast — si está habilitado */}
      <Route 
        path="/aprendizaje/:slug/podcast" 
        element={
          <AprendizajeWrapper>
            {podcastEnabled ? (
              <Suspense fallback={<LoadingFallback />}>
                <Podcast />
              </Suspense>
            ) : (
              <ComingSoonPlaceholder 
                title="Podcast Educativo"
                description="Generador de narrativas y radio ambient."
                icon={<span>🎙️</span>}
              />
            )}
          </AprendizajeWrapper>
        } 
      />
      
      {/* Topología — si está habilitado */}
      <Route 
        path="/aprendizaje/:slug/topologia" 
        element={
          <AprendizajeWrapper>
            {topologiaEnabled ? (
              <Suspense fallback={<LoadingFallback />}>
                <MapaDeLagrange />
              </Suspense>
            ) : (
              <ComingSoonPlaceholder 
                title="Topología del Conocimiento"
                description="Mapa interactivo de conceptos."
                icon={<span>🗺️</span>}
              />
            )}
          </AprendizajeWrapper>
        } 
      />
      
      {/* Research Lab — si está habilitado */}
      <Route 
        path="/aprendizaje/:slug/research" 
        element={
          <AprendizajeWrapper>
            {researchEnabled ? (
              <Suspense fallback={<LoadingFallback />}>
                <ResearchLab />
              </Suspense>
            ) : (
              <ComingSoonPlaceholder 
                title="Research Lab"
                description="Laboratorio de investigación académica."
                icon={<span>🔬</span>}
              />
            )}
          </AprendizajeWrapper>
        } 
      />
      
      {/* Pitágoras Lab — si está habilitado */}
      <Route 
        path="/aprendizaje/:slug/pitagoras" 
        element={
          <AprendizajeWrapper>
            {pitagorasEnabled ? (
              <Suspense fallback={<LoadingFallback />}>
                <PitagorasLab />
              </Suspense>
            ) : (
              <ComingSoonPlaceholder 
                title="Pitágoras Lab"
                description="Laboratorio matemático."
                icon={<span>🧮</span>}
              />
            )}
          </AprendizajeWrapper>
        } 
      />
      
      {/* Tutorías — si está habilitado */}
      <Route 
        path="/aprendizaje/:slug/tutorias" 
        element={
          <AprendizajeWrapper>
            {tutoriasEnabled ? (
              <Suspense fallback={<LoadingFallback />}>
                <TutoriasPage />
              </Suspense>
            ) : (
              <ComingSoonPlaceholder 
                title="Tutorías con Tutor Humano"
                description="Sesiones y apoyo de IA."
                icon={<span>👨‍🏫</span>}
              />
            )}
          </AprendizajeWrapper>
        } 
      />

      {/* ================================================ */}
      {/* RUTAS LEGACY → REDIRECTS A NUEVAS RUTAS */}
      {/* ================================================ */}
      {/* 
       * Regla: NO romper enlaces existentes.
       * Cada redirect va a su equivalente en /aprendizaje/* o /soberania/*
       */}
      
      {/* Auth */}
      <Route path="/auth" element={<AuthPage />} />
      
      {/* Legacy Oráculo → Nuevo árbol aprendizaje */}
      <Route path="/oracle" element={<Navigate to="/aprendizaje" replace />} />
      <Route path="/oracle/:mode" element={<Navigate to="/aprendizaje" replace />} />
      
      {/* Legacy RAG/Library → Nuevo árbol aprendizaje */}
      <Route path="/library" element={<Navigate to="/aprendizaje" replace />} />
      <Route path="/rag" element={<Navigate to="/aprendizaje" replace />} />
      
      {/* Legacy /academies → /aprendizaje */}
      <Route path="/academies" element={<Navigate to="/aprendizaje" replace />} />
      
      {/* Legacy /perfil → /aprendizaje/perfil */}
      <Route path="/perfil" element={<Navigate to="/aprendizaje/perfil" replace />} />
      
      {/* Legacy /carrera/:slug/oraculo → /aprendizaje/:slug/oraculo */}
      <Route 
        path="/carrera/:slug/oraculo" 
        element={<LegacyAcademyOracleRedirect />} 
      />
      
      {/* Legacy /carrera/:slug/materia/:id/aportar → nuevo equivalente */}
      <Route 
        path="/carrera/:slug/materia/:materiaId/aportar" 
        element={<LegacyAcademyMateriaRedirect />} 
      />
      
      {/* Legacy módulos avanzados → nuevos equivalentes */}
      <Route 
        path="/research" 
        element={<Navigate to="/aprendizaje/research" replace />} 
      />
      <Route 
        path="/lab" 
        element={<Navigate to="/aprendizaje/research" replace />} 
      />
      <Route 
        path="/podcast" 
        element={<Navigate to="/aprendizaje/podcast" replace />} 
      />
      <Route 
        path="/pitagoras" 
        element={<Navigate to="/aprendizaje/pitagoras" replace />} 
      />
      <Route 
        path="/pitagoras-lab" 
        element={<Navigate to="/aprendizaje/pitagoras" replace />} 
      />
      <Route 
        path="/map" 
        element={<Navigate to="/aprendizaje/topologia" replace />} 
      />
      <Route 
        path="/topologia" 
        element={<Navigate to="/aprendizaje/topologia" replace />} 
      />
      
      {/* Legacy /admin → /soberania */}
      <Route path="/admin" element={<Navigate to="/soberania" replace />} />
      
      {/* Legacy /carrera/:slug/tutorias → nuevo equivalente */}
      <Route 
        path="/carrera/:slug/tutorias" 
        element={<Navigate to="/aprendizaje/:slug/tutorias" replace />} 
      />
      
      {/* Legacy /config → /soberania */}
      <Route path="/config" element={<Navigate to="/soberania" replace />} />
      <Route path="/settings" element={<Navigate to="/soberania" replace />} />

      {/* ================================================ */}
      {/* 404 */}
      {/* ================================================ */}
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
