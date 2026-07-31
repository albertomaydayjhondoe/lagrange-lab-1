import { Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "@/compartido/components/MainLayout";
import NotFound from "@/pages/NotFound";
import { OraclePage } from "@/pages/OraclePage";
import { RAGPage } from "@/pages/RAGPage";
import { AcademiesPage } from "@/pages/AcademiesPage";
import Configuracion from "@/pages/Configuracion";
import AcademyProfile from "@/caracteristicas/autenticacion/AcademyProfile";
import AuthPage from "@/caracteristicas/autenticacion/Auth";
import CampusNav from "@/components/CampusNav";
import { ComingSoonPlaceholder } from "@/components/ComingSoonPlaceholder";
import { isFeatureEnabled } from "@/config/featureFlags";

// Nuevas páginas estilo universidad
import Bienvenida from "@/pages/Bienvenida";
import MisMaterias from "@/pages/MisMaterias";
import Oraculo from "@/pages/Oraculo";
import Tutorias from "@/pages/Tutorias";
import AportarApuntes from "@/pages/AportarApuntes";

// Componentes para módulos fuera de scope (se importan lazy para evitar errores si no existen)
import { Radio, Map, FlaskConical, Calculator, Users, Settings } from "lucide-react";

// Layout para las nuevas rutas universitarias
function CampusLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CampusNav />
      <main className="pt-16">
        {children}
      </main>
    </>
  );
}

// Placeholder para rutas legacy
function LegacyPlaceholder({ 
  title, 
  description, 
  icon 
}: { 
  title: string; 
  description?: string;
  icon?: React.ReactNode;
}) {
  return (
    <MainLayout>
      <ComingSoonPlaceholder 
        title={title} 
        description={description}
        icon={icon}
      />
    </MainLayout>
  );
}

/**
 * RUTAS - Academia Lexis (Campus Digital MVP)
 * 
 * Arquitectura de navegación:
 * /                     → Bienvenida (nuevos usuarios) o MisMaterias (si tiene carreras)
 * /auth                → Login/Registro
 * /academies           → Campus (catálogo de carreras públicas)
 * 
 * Rutas por carrera (/carrera/:slug):
 * /carrera/:slug             → Mis Materias
 * /carrera/:slug/oraculo    → Oráculo Socrático (FUNCIONAL)
 * /carrera/:slug/tutorias   → Tutorías (placeholder)
 * /carrera/:slug/gestionar   → Panel de gestión (solo owners)
 * /carrera/:slug/materia/:id/aportar → Aportar apuntes (FUNCIONAL)
 * 
 * /perfil              → Mis Apuntes (diálogos + materiales propios)
 * 
 * Módulos en "Próximamente" (placeholder):
 * /podcast, /map, /research, /lab, /pitagoras, /pitagoras-lab
 * /topologia, /admin
 */
export function Rutas() {
  return (
    <Routes>
      {/* ============ NAVEGACIÓN PRINCIPAL MVP ============ */}
      
      {/* Raíz: Bienvenida o MisMaterias según estado */}
      <Route path="/" element={<CampusLayout><Bienvenida /></CampusLayout>} />
      
      {/* Auth */}
      <Route path="/auth" element={<AuthPage />} />
      
      {/* Campus - Catálogo de carreras */}
      <Route path="/academies" element={<CampusLayout><AcademiesPage /></CampusLayout>} />
      
      {/* Rutas por carrera - FUNCIONALES */}
      <Route path="/carrera/:slug" element={<CampusLayout><MisMaterias /></CampusLayout>} />
      <Route path="/carrera/:slug/oraculo" element={<CampusLayout><Oraculo /></CampusLayout>} />
      <Route path="/carrera/:slug/materia/:materiaId/aportar" element={<CampusLayout><AportarApuntes /></CampusLayout>} />
      
      {/* Tutorías con tutor humano - PLACEHOLDER */}
      <Route 
        path="/carrera/:slug/tutorias" 
        element={
          isFeatureEnabled('tutoriasTutor') 
            ? <CampusLayout><Tutorias /></CampusLayout>
            : <CampusLayout>
                <ComingSoonPlaceholder 
                  title="Tutorías con Tutor Humano"
                  description="Sesiones personalizadas con tutores especializados en cada materia."
                  icon={<Users className="w-12 h-12 text-primary" />}
                />
              </CampusLayout>
        } 
      />
      
      {/* Perfil / Mis Apuntes */}
      <Route path="/perfil" element={<CampusLayout><AcademyProfile /></CampusLayout>} />
      
      {/* Legacy: Aliases de academias antiguas */}
      <Route path="/academia/:slug" element={<Navigate to="/carrera/:slug" replace />} />
      
      {/* ============ RUTAS LEGACY - FUNCIONALES ============ */}
      
      {/* Oráculo principal (legacy) */}
      <Route path="/oracle" element={<MainLayout><OraclePage /></MainLayout>} />
      <Route path="/oracle/:mode" element={<MainLayout><OraclePage /></MainLayout>} />
      
      {/* Biblioteca RAG (legacy) */}
      <Route path="/library" element={<MainLayout><RAGPage /></MainLayout>} />
      <Route path="/rag" element={<MainLayout><RAGPage /></MainLayout>} />
      
      {/* Configuración */}
      <Route path="/config" element={<MainLayout><Configuracion /></MainLayout>} />
      <Route path="/settings" element={<MainLayout><Configuracion /></MainLayout>} />
      
      {/* ============ MÓDULOS PLACEHOLDER (Sprint 10bis) ============ */}
      
      {/* Podcast - PLACEHOLDER */}
      <Route 
        path="/podcast" 
        element={
          <LegacyPlaceholder 
            title="Podcast Educativo"
            description="Generador de narrativas y radio ambiental para el aprendizaje inmersivo."
            icon={<Radio className="w-12 h-12 text-primary" />}
          />
        } 
      />
      
      {/* Topología - PLACEHOLDER */}
      <Route 
        path="/map" 
        element={
          <LegacyPlaceholder 
            title="Topología del Conocimiento"
            description="Mapa interactivo que visualiza las conexiones entre conceptos."
            icon={<Map className="w-12 h-12 text-primary" />}
          />
        } 
      />
      <Route 
        path="/topologia" 
        element={
          <LegacyPlaceholder 
            title="Topología del Conocimiento"
            description="Mapa interactivo que visualiza las conexiones entre conceptos."
            icon={<Map className="w-12 h-12 text-primary" />}
          />
        } 
      />
      
      {/* Research Lab - PLACEHOLDER */}
      <Route 
        path="/research" 
        element={
          <LegacyPlaceholder 
            title="Research Lab"
            description="Laboratorio de investigación académica con herramientas avanzadas."
            icon={<FlaskConical className="w-12 h-12 text-primary" />}
          />
        } 
      />
      <Route 
        path="/lab" 
        element={
          <LegacyPlaceholder 
            title="Laboratorio"
            description="Herramientas de experimentación y prototipado."
            icon={<FlaskConical className="w-12 h-12 text-primary" />}
          />
        } 
      />
      
      {/* Pitágoras Lab - PLACEHOLDER */}
      <Route 
        path="/pitagoras" 
        element={
          <LegacyPlaceholder 
            title="Pitágoras Lab"
            description="Laboratorio de matemáticas avanzadas y visualización de teoremas."
            icon={<Calculator className="w-12 h-12 text-primary" />}
          />
        } 
      />
      <Route 
        path="/pitagoras-lab" 
        element={
          <LegacyPlaceholder 
            title="Pitágoras Lab"
            description="Laboratorio de matemáticas avanzadas y visualización de teoremas."
            icon={<Calculator className="w-12 h-12 text-primary" />}
          />
        } 
      />
      
      {/* Admin - PLACEHOLDER */}
      <Route 
        path="/admin" 
        element={
          <LegacyPlaceholder 
            title="Panel de Administración"
            description="Gestión avanzada de la academia, usuarios y contenidos."
            icon={<Settings className="w-12 h-12 text-primary" />}
          />
        } 
      />
      
      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
