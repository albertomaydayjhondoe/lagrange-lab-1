import { Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "@/compartido/components/MainLayout";
import NotFound from "@/pages/NotFound";
import { OraclePage } from "@/pages/OraclePage";
import { LagrangeMap } from "@/caracteristicas/topologia/LagrangeMap";
import AcademiesList from "@/caracteristicas/academia/ListaDeAcademias";
import Configuracion from "@/pages/Configuracion";
import AcademyProfile from "@/caracteristicas/autenticacion/AcademyProfile";
import AuthPage from "@/caracteristicas/autenticacion/Auth";

/**
 * RUTAS - Lagrange Lab (Refactorizado)
 * 
 * Arquitectura centrada en el Oráculo:
 * / → Oráculo (protagonista)
 * /map → Mapa de conocimiento
 * /academies → Gestión de academias
 * /config → Configuración
 * /auth → Autenticación
 */
export function Rutas() {
  return (
    <MainLayout>
      <Routes>
        {/* ============ PRINCIPAL: ORÁCULO ============ */}
        <Route path="/" element={<OraclePage />} />
        <Route path="/oracle" element={<OraclePage />} />
        <Route path="/oracle/:mode" element={<OraclePage />} />
        
        {/* ============ MAPA ============ */}
        <Route path="/map" element={<LagrangeMap />} />
        
        {/* ============ ACADEMIAS ============ */}
        <Route path="/academies" element={<AcademiesList />} />
        <Route path="/academies/create" element={<AcademiesList />} />
        <Route path="/academia/:slug" element={<AcademiesList />} />
        
        {/* ============ CONFIGURACIÓN ============ */}
        <Route path="/config" element={<Configuracion />} />
        <Route path="/settings" element={<Configuracion />} />
        
        {/* ============ USUARIO ============ */}
        <Route path="/profile" element={<AcademyProfile />} />
        <Route path="/auth" element={<AuthPage />} />
        
        {/* ============ REDIRECTS (compatibilidad) ============ */}
        <Route path="/research" element={<Navigate to="/" replace />} />
        <Route path="/lab" element={<Navigate to="/" replace />} />
        <Route path="/pitagoras" element={<Navigate to="/" replace />} />
        <Route path="/pitagoras-lab" element={<Navigate to="/" replace />} />
        <Route path="/oraculo" element={<Navigate to="/" replace />} />
        <Route path="/tutorias" element={<Navigate to="/" replace />} />
        <Route path="/rag" element={<Navigate to="/" replace />} />
        <Route path="/podcast" element={<Navigate to="/" replace />} />
        <Route path="/admin" element={<Navigate to="/config" replace />} />
        <Route path="/topologia" element={<Navigate to="/map" replace />} />
        
        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </MainLayout>
  );
}
