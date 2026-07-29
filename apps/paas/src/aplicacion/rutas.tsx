import { Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "@/compartido/components/MainLayout";
import NotFound from "@/pages/NotFound";
import { OraclePage } from "@/pages/OraclePage";
import { RAGPage } from "@/pages/RAGPage";
import { AcademiesPage } from "@/pages/AcademiesPage";
import Configuracion from "@/pages/Configuracion";
import AcademyProfile from "@/caracteristicas/autenticacion/AcademyProfile";
import AuthPage from "@/caracteristicas/autenticacion/Auth";

/**
 * RUTAS - Lagrange Lab (PaaS Educativo)
 * 
 * Arquitectura:
 * /             → Oráculo (protagonista - chat socrático)
 * /library      → Biblioteca RAG universal
 * /academies    → Academias (gestión + ingesta de materiales)
 * /config       → Configuración
 * /auth         → Autenticación
 */
export function Rutas() {
  return (
    <MainLayout>
      <Routes>
        {/* ============ PRINCIPAL: ORÁCULO ============ */}
        <Route path="/" element={<OraclePage />} />
        <Route path="/oracle" element={<OraclePage />} />
        <Route path="/oracle/:mode" element={<OraclePage />} />
        
        {/* ============ BIBLIOTECA RAG ============ */}
        <Route path="/library" element={<RAGPage />} />
        <Route path="/rag" element={<RAGPage />} />
        
        {/* ============ ACADEMIAS (PRINCIPAL) ============ */}
        <Route path="/academies" element={<AcademiesPage />} />
        <Route path="/academies/create" element={<AcademiesPage />} />
        <Route path="/academia/:slug" element={<AcademiesPage />} />
        
        {/* ============ CONFIGURACIÓN ============ */}
        <Route path="/config" element={<Configuracion />} />
        <Route path="/settings" element={<Configuracion />} />
        
        {/* ============ USUARIO ============ */}
        <Route path="/profile" element={<AcademyProfile />} />
        <Route path="/auth" element={<AuthPage />} />
        
        {/* ============ REDIRECTS (compatibilidad) ============ */}
        <Route path="/map" element={<Navigate to="/" replace />} />
        <Route path="/research" element={<Navigate to="/" replace />} />
        <Route path="/lab" element={<Navigate to="/" replace />} />
        <Route path="/pitagoras" element={<Navigate to="/" replace />} />
        <Route path="/pitagoras-lab" element={<Navigate to="/" replace />} />
        <Route path="/oraculo" element={<Navigate to="/" replace />} />
        <Route path="/tutorias" element={<Navigate to="/" replace />} />
        <Route path="/podcast" element={<Navigate to="/" replace />} />
        <Route path="/admin" element={<Navigate to="/config" replace />} />
        <Route path="/topologia" element={<Navigate to="/" replace />} />
        
        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </MainLayout>
  );
}
