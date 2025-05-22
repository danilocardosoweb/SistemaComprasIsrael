
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import PaginaInicial from "./pages/PaginaInicial";
import NotFound from "./pages/NotFound";
import Produtos from "./pages/Produtos";
import Vendas from "./pages/Vendas";
import NovaVenda from "./pages/NovaVenda";
import ComprovanteVenda from "./pages/ComprovanteVenda";
import Clientes from "./pages/Clientes";
import Relatorios from "./pages/Relatorios";
import Login from "./pages/Login";
import ConfiguracoesSite from "./pages/ConfiguracoesSite";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Página inicial pública para apresentação dos produtos */}
            <Route path="/" element={<PaginaInicial />} />
            
            {/* Rota de login */}
            <Route path="/login" element={<Login />} />

            {/* Rotas administrativas com AppShell - Protegidas por autenticação */}
            <Route element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }>
              <Route path="/dashboard" element={<Index />} />
              <Route path="/produtos" element={<Produtos />} />
              <Route path="/vendas" element={<Vendas />} />
              <Route path="/vendas/nova" element={<NovaVenda />} />
              <Route path="/vendas/:id/comprovante" element={<ComprovanteVenda />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/relatorios" element={<Relatorios />} />
              <Route path="/configuracoes-site" element={<ConfiguracoesSite />} />
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
