import { Toaster as Sonner } from "@/compartido/ui/sonner";
import { TooltipProvider } from "@/compartido/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter } from "react-router-dom";
import { Rutas } from "./rutas";
import { AcademyHeader } from "@/caracteristicas/academia/AcademyHeader";
import { SessionProvider } from "@/compartido/lib/SessionProvider";
import { AcademyProvider } from "@/caracteristicas/academia/AcademyContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <SessionProvider>
        <AcademyProvider>
          <HashRouter>
            <AcademyHeader />
            <Rutas />
          </HashRouter>
        </AcademyProvider>
      </SessionProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
