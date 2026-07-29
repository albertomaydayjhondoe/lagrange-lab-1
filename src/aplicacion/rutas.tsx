import { Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "@/compartido/components/MainLayout";
import NotFound from "@/pages/NotFound";
import { OraclePage } from "@/pages/OraclePage";
import { RAGPage } from "@/pages/RAGPage";
import { AcademiesPage } from "@/pages/AcademiesPage";
import Configuracion from "@/pages/Configuracion";
import AcademyProfile from "@/caracteristicas/autenticacion/AcademyProfile";
import AuthPage from "@/caracteristicas/autenticacion/Auth";

// SaaS - Academias Estancas
import { SaaSWelcome } from "@/pages/saas/SaaSWelcome";

/**
 * RUTAS - Lagrange Lab SaaS (Academias Estancas)
 * 
 * Arquitectura:
 * /             → SaaSWelcome (landing academia estanca)
 * /mi-academia  → Panel de usuario (academia personal)
 * /library      → Biblioteca RAG personal
 * /academies    → Gestionar academias
 * /config       → Configuración
 * /auth         → Autenticación
 */
export function Rutas() {
  return (
    <Routes>
      {/* ============ SAAS: ACADEMIAS ESTANCAS ============ */}
      <Route path="/" element={<SaaSWelcome />} />
      
      {/* Mi Academia (panel personal) */}
      <Route path="/mi-academia" element={<MainLayout><AcademyProfile /></MainLayout>} />
      
      {/* Oráculo Personal */}
      <Route path="/oracle" element={<MainLayout><OraclePage /></MainLayout>} />
      <Route path="/oracle/:mode" element={<MainLayout><OraclePage /></MainLayout>} />
      
      {/* Biblioteca RAG Personal */}
      <Route path="/library" element={<MainLayout><RAGPage /></MainLayout>} />
      <Route path="/rag" element={<MainLayout><RAGPage /></MainLayout>} />
      
      {/* Gestionar Academias */}
      <Route path="/academies" element={<MainLayout><AcademiesPage /></MainLayout>} />
      <Route path="/academies/create" element={<MainLayout><AcademiesPage /></MainLayout>} />
      <Route path="/academia/:slug" element={<MainLayout><AcademiesPage /></MainLayout>} />
      
      {/* Configuración */}
      <Route path="/config" element={<MainLayout><Configuracion /></MainLayout>} />
      <Route path="/settings" element={<MainLayout><Configuracion /></MainLayout>} />
      
      {/* Usuario */}
      <Route path="/profile" element={<MainLayout><AcademyProfile /></MainLayout>} />
      <Route path="/auth" element={<AuthPage />} />
      
      {/* Redirects */}
      <Route path="/map" element={<Navigate to="/mi-academia" replace />} />
      <Route path="/research" element={<Navigate to="/mi-academia" replace />} />
      <Route path="/lab" element={<Navigate to="/mi-academia" replace />} />
      <Route path="/oraculo" element={<Navigate to="/oracle" replace />} />
      <Route path="/tutorias" element={<Navigate to="/mi-academia" replace />} />
      <Route path="/podcast" element={<Navigate to="/mi-academia" replace />} />
      <Route path="/admin" element={<Navigate to="/config" replace />} />
      <Route path="/topologia" element={<Navigate to="/mi-academia" replace />} />
      
      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
