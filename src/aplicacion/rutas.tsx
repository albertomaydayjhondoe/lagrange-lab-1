import { Routes, Route } from "react-router-dom";
import NotFound from "@/pages/NotFound";

// PAAU - Academia Lexis
import PAAUPage from "@/pages/PAAUPage";
import { OraclePage } from "@/pages/OraclePage";
import { RAGPage } from "@/pages/RAGPage";
import Configuracion from "@/pages/Configuracion";
import AuthPage from "@/caracteristicas/autenticacion/Auth";
import Oraculo from "@/pages/Oraculo";
import AportarApuntes from "@/pages/AportarApuntes";

// Campus Layout
import CampusNav from "@/components/CampusNav";

// Placeholder pages
import { ComingSoonPlaceholder } from "@/components/ComingSoonPlaceholder";
import { Map, FlaskConical, Calculator, Radio, Settings, Brain } from "lucide-react";

// Layout wrapper for campus pages
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

/**
 * RUTAS - Academia Lexis PAAU
 * 
 * Arquitectura de navegación:
 * /                     → Página principal PAAU (Academia Lexis)
 * /auth                → Login/Registro
 * /carrera/:slug/oraculo → Oráculo Socrático por academia
 * /carrera/:slug/materia/:id/aportar → Aportar apuntes
 * /oracle              → Oráculo Socrático (legacy)
 * /library, /rag       → Biblioteca RAG
 * /config, /settings   → Configuración
 * 
 * Módulos en "Próximamente" (placeholder):
 * /map, /topologia, /research, /lab, /pitagoras, /admin, /podcast
 */
export function Rutas() {
  return (
    <Routes>
      {/* ============ NAVEGACIÓN PRINCIPAL PAAU ============ */}
      
      {/* Raíz: Página principal PAAU */}
      <Route path="/" element={<PAAUPage />} />
      
      {/* Auth */}
      <Route path="/auth" element={<AuthPage />} />
      
      {/* Rutas de Carrera/Academia */}
      <Route path="/carrera/:slug/oraculo" element={<CampusLayout><Oraculo /></CampusLayout>} />
      <Route path="/carrera/:slug/materia/:materiaId/aportar" element={<CampusLayout><AportarApuntes /></CampusLayout>} />
      
      {/* Legacy: Oráculo principal */}
      <Route path="/oracle" element={<OraclePage />} />
      <Route path="/oracle/:mode" element={<OraclePage />} />
      
      {/* Biblioteca RAG */}
      <Route path="/library" element={<RAGPage />} />
      <Route path="/rag" element={<RAGPage />} />
      
      {/* Configuración */}
      <Route path="/config" element={<Configuracion />} />
      <Route path="/settings" element={<Configuracion />} />
      
      {/* ============ MÓDULOS PLACEHOLDER ============ */}
      
      {/* Topología */}
      <Route 
        path="/map" 
        element={
          <ComingSoonPlaceholder 
            title="Topología del Conocimiento"
            description="Mapa interactivo que visualiza las conexiones entre conceptos."
            icon={<Map className="w-12 h-12 text-primary" />}
          />
        } 
      />
      <Route 
        path="/topologia" 
        element={
          <ComingSoonPlaceholder 
            title="Topología del Conocimiento"
            description="Mapa interactivo que visualiza las conexiones entre conceptos."
            icon={<Map className="w-12 h-12 text-primary" />}
          />
        } 
      />
      
      {/* Research Lab */}
      <Route 
        path="/research" 
        element={
          <ComingSoonPlaceholder 
            title="Research Lab"
            description="Laboratorio de investigación académica con herramientas avanzadas."
            icon={<FlaskConical className="w-12 h-12 text-primary" />}
          />
        } 
      />
      <Route 
        path="/lab" 
        element={
          <ComingSoonPlaceholder 
            title="Laboratorio"
            description="Herramientas de experimentación y prototipado."
            icon={<FlaskConical className="w-12 h-12 text-primary" />}
          />
        } 
      />
      
      {/* Pitágoras Lab */}
      <Route 
        path="/pitagoras" 
        element={
          <ComingSoonPlaceholder 
            title="Pitágoras Lab"
            description="Laboratorio de matemáticas avanzadas y visualización de teoremas."
            icon={<Calculator className="w-12 h-12 text-primary" />}
          />
        } 
      />
      <Route 
        path="/pitagoras-lab" 
        element={
          <ComingSoonPlaceholder 
            title="Pitágoras Lab"
            description="Laboratorio de matemáticas avanzadas y visualización de teoremas."
            icon={<Calculator className="w-12 h-12 text-primary" />}
          />
        } 
      />
      
      {/* Podcast */}
      <Route 
        path="/podcast" 
        element={
          <ComingSoonPlaceholder 
            title="Podcast Educativo"
            description="Generador de narrativas y radio ambiental para el aprendizaje inmersivo."
            icon={<Radio className="w-12 h-12 text-primary" />}
          />
        } 
      />
      
      {/* Admin */}
      <Route 
        path="/admin" 
        element={
          <ComingSoonPlaceholder 
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
