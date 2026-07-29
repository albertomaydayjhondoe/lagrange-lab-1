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

// Nuevas páginas estilo universidad
import Bienvenida from "@/pages/Bienvenida";
import MisMaterias from "@/pages/MisMaterias";
import Oraculo from "@/pages/Oraculo";
import Tutorias from "@/pages/Tutorias";
import AportarApuntes from "@/pages/AportarApuntes";

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

/**
 * RUTAS - Lagrange Lab (Campus Digital)
 * 
 * Arquitectura de navegación:
 * /                     → Bienvenida (nuevos usuarios) o MisMaterias (si tiene carreras)
 * /auth                → Login/Registro
 * /academies           → Campus (catálogo de carreras públicas)
 * 
 * Rutas por carrera (/carrera/:slug):
 * /carrera/:slug             → Mis Materias
 * /carrera/:slug/oraculo    → Oráculo Socrático
 * /carrera/:slug/tutorias   → Sistema de Tutorías
 * /carrera/:slug/gestionar   → Panel de gestión (solo owners)
 * /carrera/:slug/materia/:id/aportar → Aportar apuntes
 * 
 * /perfil              → Mis Apuntes (diálogos + materiales propios)
 * 
 * Legacy redirects para compatibilidad:
 * /admin, /config      → Configuración
 * /oracle, /oraculo    → Redirect a /academies
 */
export function Rutas() {
  return (
    <Routes>
      {/* ============ NUEVA NAVEGACIÓN UNIVERSITARIA ============ */}
      
      {/* Raíz: Bienvenida o MisMaterias según estado */}
      <Route path="/" element={<CampusLayout><Bienvenida /></CampusLayout>} />
      
      {/* Auth */}
      <Route path="/auth" element={<AuthPage />} />
      
      {/* Campus - Catálogo de carreras */}
      <Route path="/academies" element={<CampusLayout><AcademiesPage /></CampusLayout>} />
      
      {/* Rutas por carrera */}
      <Route path="/carrera/:slug" element={<CampusLayout><MisMaterias /></CampusLayout>} />
      <Route path="/carrera/:slug/oraculo" element={<CampusLayout><Oraculo /></CampusLayout>} />
      <Route path="/carrera/:slug/tutorias" element={<CampusLayout><Tutorias /></CampusLayout>} />
      <Route path="/carrera/:slug/materia/:materiaId/aportar" element={<CampusLayout><AportarApuntes /></CampusLayout>} />
      
      {/* Perfil / Mis Apuntes */}
      <Route path="/perfil" element={<CampusLayout><AcademyProfile /></CampusLayout>} />
      
      {/* Legacy: Aliases de academias antiguas */}
      <Route path="/academia/:slug" element={<Navigate to="/carrera/:slug" replace />} />
      
      {/* ============ RUTAS LEGACY (mantener compatibilidad) ============ */}
      
      {/* Oráculo principal (legacy) */}
      <Route path="/oracle" element={<MainLayout><OraclePage /></MainLayout>} />
      <Route path="/oracle/:mode" element={<MainLayout><OraclePage /></MainLayout>} />
      
      {/* Biblioteca RAG (legacy) */}
      <Route path="/library" element={<MainLayout><RAGPage /></MainLayout>} />
      <Route path="/rag" element={<MainLayout><RAGPage /></MainLayout>} />
      
      {/* Configuración */}
      <Route path="/config" element={<MainLayout><Configuracion /></MainLayout>} />
      <Route path="/settings" element={<MainLayout><Configuracion /></MainLayout>} />
      
      {/* ============ REDIRECTS LEGACY ============ */}
      <Route path="/map" element={<Navigate to="/" replace />} />
      <Route path="/research" element={<Navigate to="/academies" replace />} />
      <Route path="/lab" element={<Navigate to="/academies" replace />} />
      <Route path="/pitagoras" element={<Navigate to="/academies" replace />} />
      <Route path="/pitagoras-lab" element={<Navigate to="/academies" replace />} />
      <Route path="/oraculo" element={<Navigate to="/academies" replace />} />
      <Route path="/tutorias" element={<Navigate to="/academies" replace />} />
      <Route path="/podcast" element={<Navigate to="/academies" replace />} />
      <Route path="/admin" element={<Navigate to="/config" replace />} />
      <Route path="/topologia" element={<Navigate to="/academies" replace />} />
      
      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
