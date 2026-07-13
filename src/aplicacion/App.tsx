import { Toaster as Sonner } from "@/compartido/ui/sonner";
import { TooltipProvider } from "@/compartido/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter } from "react-router-dom";
import { Rutas } from "./rutas";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <HashRouter>
        <Rutas />
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
