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

/**
 * Rutas de la aplicación Lagrange Lab.
 * 
 * FILOSOFÍA:
 * - El Oráculo es la entrada principal de cada academia (no Map ni Podcast)
 * - Cada academia tiene su propio tema visual definido por oracle_persona_prompt
 * - El selector de academia en el header cambia todo el contexto visual
 */
export function Rutas() {
  return (
    <Routes>
      {/* Global routes */}
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/academies" element={<AcademiesList />} />
      <Route path="/academies/create" element={<CreateAcademy />} />
      
      {/* Legacy routes - redirect to genesis, Oráculo is the entry point */}
      <Route path="/map" element={<Navigate to="/academia/genesis/lab" replace />} />
      <Route path="/lab" element={<Navigate to="/academia/genesis/lab" replace />} />
      <Route path="/podcast" element={<Navigate to="/academia/genesis/lab" replace />} />
      <Route path="/profile" element={<Navigate to="/academia/genesis/profile" replace />} />
      <Route path="/admin" element={<Navigate to="/academia/genesis/admin" replace />} />
      
      {/* Academy routes - multi-tenant
          ORÁCULO es la entrada principal, otras secciones son tabs secundarios */}
      <Route path="/academia/:slug" element={<AcademyLayout />}>
        {/* Oráculo como pantalla principal - el corazón del producto */}
        <Route index element={<OracleLab />} />
        <Route path="lab" element={<OracleLab />} />
        
        {/* Secciones secundarias */}
        <Route path="map" element={<AcademyMap />} />
        <Route path="podcast" element={<AcademyPodcast />} />
        <Route path="profile" element={<AcademyProfile />} />
        <Route path="admin" element={<Admin />} />
      </Route>
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
