import { Toaster as Sonner } from "@/compartido/ui/sonner";
import { TooltipProvider } from "@/compartido/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Map from "./pages/Map";
import Lab from "./pages/Lab";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import Podcast from "./pages/Podcast";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import AcademiesList from "./pages/AcademiesList";
import AcademyLayout from "./caracteristicas/administracion/AcademyLayout";
import AcademyMap from "./pages/AcademyMap";
import AcademyLab from "./pages/AcademyLab";
import AcademyPodcast from "./pages/AcademyPodcast";
import AcademyProfile from "./pages/AcademyProfile";
import CreateAcademy from "./pages/CreateAcademy";
import { AcademyHeader } from "./caracteristicas/academia/AcademyHeader";
import { SessionProvider } from "./compartido/lib/SessionProvider";
import { AcademyProvider } from "./caracteristicas/academia/AcademyContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      {/* Session provider for authentication state */}
      <SessionProvider>
        {/* Academy provider for multi-tenant context */}
        <AcademyProvider>
          <HashRouter>
          {/* Header global con selector de academia */}
          <AcademyHeader />
          
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
              <Route index element={<Map />} />
              <Route path="map" element={<AcademyMap />} />
              <Route path="lab" element={<AcademyLab />} />
              <Route path="podcast" element={<AcademyPodcast />} />
              <Route path="profile" element={<AcademyProfile />} />
              <Route path="admin" element={<Admin />} />
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
          </HashRouter>
        </AcademyProvider>
      </SessionProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
