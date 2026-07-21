import { Routes, Route, Navigate } from "react-router-dom";
import Index from "@/pages/Index";
import Auth from "@/caracteristicas/autenticacion/Auth";
import AcademiesList from "@/caracteristicas/academia/ListaDeAcademias";
import CreateAcademy from "@/caracteristicas/academia/CrearAcademia";
import AcademyLayout from "@/caracteristicas/administracion/AcademyLayout";
import AcademyMap from "@/caracteristicas/topologia/MapaDeLagrange";
import OracleLab from "@/caracteristicas/oraculo/OracleLab";
import AcademyPodcast from "@/caracteristicas/podcast/AcademyPodcast";
import AcademyProfile from "@/caracteristicas/autenticacion/Perfil";
import Admin from "@/caracteristicas/administracion/Admin";
import NotFound from "@/pages/NotFound";
import Configuracion from "@/pages/Configuracion";
import FlowchartTest from "@/pages/FlowchartTest";
import PitagorasLab from "@/pages/PitagorasLab";

// Tutorías
import ListaMaterias from "@/caracteristicas/tutorias/ListaMaterias";
import DetalleMateria from "@/caracteristicas/tutorias/DetalleMateria";
import DashboardTutor from "@/caracteristicas/tutorias/DashboardTutor";
import DashboardEstudiante from "@/caracteristicas/tutorias/DashboardEstudiante";
import CrearSesion from "@/caracteristicas/tutorias/CrearSesion";

/**
 * Rutas de la aplicación Lagrange Lab + Sistema de Tutorías
 * 
 * ESTRUCTURA:
 * - /tutorias/* → Sistema de tutorías con IA
 * - /tutor/* → Dashboard de tutores
 * - /academia/* → Sistema multi-tenant legacy (Lagrange)
 */
export function Rutas() {
  return (
    <Routes>
      {/* Global routes */}
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/config" element={<Configuracion />} />
      <Route path="/academies" element={<AcademiesList />} />
      <Route path="/academies/create" element={<CreateAcademy />} />
      <Route path="/flowchart-test" element={<FlowchartTest />} />
      <Route path="/pitagoras" element={<PitagorasLab />} />
      
      {/* ============================================
          SISTEMA DE TUTORÍAS CON IA + RAG
          ============================================ */}
      
      {/* Tutorías públicas */}
      <Route path="/tutorias" element={<ListaMaterias />} />
      <Route path="/tutorias/:slug" element={<DetalleMateria />} />
      
      {/* Dashboard de estudiante */}
      <Route path="/estudiante" element={<DashboardEstudiante />} />
      
      {/* Dashboard de tutor */}
      <Route path="/tutor/dashboard" element={<DashboardTutor />} />
      <Route path="/tutorias/crear-sesion" element={<CrearSesion />} />
      
      {/* Rutas alias */}
      <Route path="/mis-tutorias" element={<Navigate to="/estudiante" replace />} />
      <Route path="/mi-aprendizaje" element={<Navigate to="/estudiante" replace />} />
      
      {/* Legacy routes - redirect to genesis */}
      <Route path="/map" element={<Navigate to="/academia/genesis/lab" replace />} />
      <Route path="/lab" element={<Navigate to="/academia/genesis/lab" replace />} />
      <Route path="/podcast" element={<Navigate to="/academia/genesis/lab" replace />} />
      <Route path="/profile" element={<Navigate to="/academia/genesis/profile" replace />} />
      <Route path="/admin" element={<Navigate to="/academia/genesis/admin" replace />} />
      
      {/* Academy routes - legacy multi-tenant */}
      <Route path="/academia/:slug" element={<AcademyLayout />}>
        <Route index element={<OracleLab />} />
        <Route path="lab" element={<OracleLab />} />
        <Route path="map" element={<AcademyMap />} />
        <Route path="podcast" element={<AcademyPodcast />} />
        <Route path="profile" element={<AcademyProfile />} />
        <Route path="admin" element={<Admin />} />
      </Route>
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
