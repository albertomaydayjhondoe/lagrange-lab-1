import { Routes, Route, Navigate } from "react-router-dom";
import Index from "@/pages/Index";
import Auth from "@/caracteristicas/autenticacion/Auth";
import AcademiesList from "@/caracteristicas/academia/ListaDeAcademias";
import CreateAcademy from "@/caracteristicas/academia/CrearAcademia";
import AcademyLayout from "@/caracteristicas/administracion/AcademyLayout";
import AcademyMap from "@/caracteristicas/topologia/MapaDeLagrange";
import AcademyLab from "@/caracteristicas/oraculo/OracleLab";
import AcademyPodcast from "@/caracteristicas/podcast/AcademyPodcast";
import AcademyProfile from "@/caracteristicas/autenticacion/Perfil";
import Admin from "@/caracteristicas/administracion/Admin";
import NotFound from "@/pages/NotFound";

export function Rutas() {
  return (
    <Routes>
      {/* Global routes */}
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/academies" element={<AcademiesList />} />
      <Route path="/academies/create" element={<CreateAcademy />} />
      
      {/* Legacy routes - redirect to genesis */}
      <Route path="/map" element={<Navigate to="/academia/genesis/map" replace />} />
      <Route path="/lab" element={<Navigate to="/academia/genesis/lab" replace />} />
      <Route path="/podcast" element={<Navigate to="/academia/genesis/podcast" replace />} />
      <Route path="/profile" element={<Navigate to="/academia/genesis/profile" replace />} />
      <Route path="/admin" element={<Navigate to="/academia/genesis/admin" replace />} />
      
      {/* Academy routes - multi-tenant */}
      <Route path="/academia/:slug" element={<AcademyLayout />}>
        <Route index element={<AcademyMap />} />
        <Route path="map" element={<AcademyMap />} />
        <Route path="lab" element={<AcademyLab />} />
        <Route path="podcast" element={<AcademyPodcast />} />
        <Route path="profile" element={<AcademyProfile />} />
        <Route path="admin" element={<Admin />} />
      </Route>
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
