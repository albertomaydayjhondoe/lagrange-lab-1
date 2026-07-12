import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Map from "./pages/Map";
import Lab from "./pages/Lab";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import Podcast from "./pages/Podcast";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import Academias from "./pages/Academias";
import CreateAcademy from "./pages/CreateAcademy";
import AcademyDetail from "./pages/AcademyDetail";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <HashRouter>
        <Routes>
          {/* Legacy routes - redirect to genesis */}
          <Route path="/" element={<Index />} />
          <Route path="/map" element={<Map />} />
          <Route path="/lab" element={<Lab />} />
          <Route path="/podcast" element={<Podcast />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/auth" element={<Auth />} />

          {/* Academy routes */}
          <Route path="/academias" element={<Academias />} />
          <Route path="/academias/crear" element={<CreateAcademy />} />
          <Route path="/academia/:slug" element={<AcademyDetail />} />
          <Route path="/academia/:slug/map" element={<Map />} />
          <Route path="/academia/:slug/admin" element={<Admin />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
