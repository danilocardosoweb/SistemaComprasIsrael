
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Produtos from "./pages/Produtos";
import Vendas from "./pages/Vendas";
import NovaVenda from "./pages/NovaVenda";
import ComprovanteVenda from "./pages/ComprovanteVenda";
import Clientes from "./pages/Clientes";
import Relatorios from "./pages/Relatorios";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Index />} />
            <Route path="/produtos" element={<Produtos />} />
            <Route path="/vendas" element={<Vendas />} />
            <Route path="/vendas/nova" element={<NovaVenda />} />
            <Route path="/vendas/:id/comprovante" element={<ComprovanteVenda />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/relatorios" element={<Relatorios />} />
          </Route>
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
