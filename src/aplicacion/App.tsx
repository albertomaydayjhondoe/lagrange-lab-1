import { Toaster as Sonner } from "@/compartido/ui/sonner";
import { TooltipProvider } from "@/compartido/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter } from "react-router-dom";
import { Rutas } from "./rutas";
import { SessionProvider } from "@/compartido/lib/SessionProvider";
import { AcademyProvider } from "@/caracteristicas/academia/AcademyContext";
import { ErrorBoundary } from "@/compartido/lib/ErrorBoundary";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner />
        <SessionProvider>
          <AcademyProvider>
            <HashRouter>
              <Rutas />
            </HashRouter>
          </AcademyProvider>
        </SessionProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
