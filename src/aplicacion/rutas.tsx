import { Routes, Route, Navigate } from "react-router-dom";
import NotFound from "@/pages/NotFound";
import ResearchLab from "@/caracteristicas/research/ResearchLab";
import AcademiesList from "@/caracteristicas/academia/ListaDeAcademias";
import CreateAcademy from "@/caracteristicas/academia/CrearAcademia";
import Configuracion from "@/pages/Configuracion";

/**
 * RUTAS - PRIORIZADO según flowchart:
 * 
 * /research → ResearchLab (FLUJO PRINCIPAL)
 * /academies/* → Gestión de academias
 * /legacy/* → Sistema legacy (DEGRADADO)
 */
export function Rutas() {
  return (
    <Routes>
      {/* ============ PRINCIPAL: RESEARCH LAB ============ */}
      <Route path="/" element={<ResearchLab />} />
      <Route path="/research" element={<ResearchLab />} />
      
      {/* Gestión de academias */}
      <Route path="/academies" element={<AcademiesList />} />
      <Route path="/academies/create" element={<CreateAcademy />} />
      <Route path="/config" element={<Configuracion />} />
      
      {/* Legacy routes → redirect to research */}
      <Route path="/pitagoras" element={<Navigate to="/research" replace />} />
      <Route path="/pitagoras-lab" element={<Navigate to="/research" replace />} />
      <Route path="/lab" element={<Navigate to="/research" replace />} />
      <Route path="/map" element={<Navigate to="/research" replace />} />
      <Route path="/podcast" element={<Navigate to="/research" replace />} />
      <Route path="/profile" element={<Navigate to="/research" replace />} />
      <Route path="/admin" element={<Navigate to="/research" replace />} />
      <Route path="/academia/:slug" element={<Navigate to="/research" replace />} />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
