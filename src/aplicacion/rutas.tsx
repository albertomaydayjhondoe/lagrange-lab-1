import { Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import NotFound from "@/pages/NotFound";
import ResearchLab from "@/caracteristicas/research/ResearchLab";
import AcademiesList from "@/caracteristicas/academia/ListaDeAcademias";
import CreateAcademy from "@/caracteristicas/academia/CrearAcademia";
import AcademyDetail from "@/caracteristicas/academia/AcademyDetail";
import Configuracion from "@/pages/Configuracion";
import PitagorasLab from "@/pages/PitagorasLab";
import FlowchartTest from "@/pages/FlowchartTest";
import Admin from "@/caracteristicas/administracion/Admin";
import { NarrativeGenerator } from "@/caracteristicas/podcast/GeneradorDeNarrativas";
import AcademyProfile from "@/caracteristicas/autenticacion/AcademyProfile";
import { LagrangeMap } from "@/caracteristicas/topologia/LagrangeMap";
import { supabase } from "@/compartido/lib/supabaseClient";

/**
 * RUTAS - Lagrange Lab
 * 
 * /research → ResearchLab (FLUJO PRINCIPAL)
 * /academies/* → Gestión de academias
 * /legacy → Sistema legado (mantenido para compatibilidad)
 */
export function Rutas() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });
  }, []);

  return (
    <Routes>
      {/* ============ PRINCIPAL: RESEARCH LAB ============ */}
      <Route path="/" element={<ResearchLab />} />
      <Route path="/research" element={<ResearchLab />} />
      
      {/* Gestión de academias */}
      <Route path="/academies" element={<AcademiesList />} />
      <Route path="/academies/create" element={<CreateAcademy />} />
      <Route path="/academia/:slug" element={<AcademyDetail />} />
      <Route path="/config" element={<Configuracion />} />
      
      {/* ============ LEGACY ROUTES (funcionales) ============ */}
      <Route path="/pitagoras" element={<PitagorasLab />} />
      <Route path="/pitagoras-lab" element={<PitagorasLab />} />
      <Route path="/lab" element={<ResearchLab />} />
      <Route path="/map" element={<LagrangeMap />} />
      <Route path="/podcast" element={<NarrativeGenerator isAuthenticated={isAuthenticated} isAdmin={isAdmin} />} />
      <Route path="/profile" element={<AcademyProfile />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/flowchart-test" element={<FlowchartTest />} />
      
      {/* Legacy redirects para rutas no implementadas */}
      <Route path="/tutorias" element={<Navigate to="/research" replace />} />
      <Route path="/oraculo" element={<Navigate to="/research" replace />} />
      <Route path="/rag" element={<Navigate to="/research" replace />} />
      <Route path="/topologia" element={<Navigate to="/map" replace />} />
      
      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
