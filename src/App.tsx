import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import Index from "./pages/Index";
import Produtos from "./pages/Produtos";
import Pedidos from "./pages/Pedidos";
import Clientes from "./pages/Clientes";
import Vendedores from "./pages/Vendedores";
import Contato from "./pages/Contato";
import Campanha from "./pages/Campanha";
import Geny from "./pages/Geny";
import Relatorios from "./pages/Relatorios";
import Configuracoes from "./pages/Configuracoes";
import Usuarios from "./pages/Usuarios";
import Login from "./pages/Login";
import CompletarCadastro from "./pages/CompletarCadastro";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/completar-cadastro" element={<CompletarCadastro />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route element={<Layout><Index /></Layout>} path="/" />
          <Route element={<Layout><Produtos /></Layout>} path="/produtos" />
          <Route element={<Layout><Pedidos /></Layout>} path="/pedidos" />
          <Route element={<Layout><Clientes /></Layout>} path="/clientes" />
          <Route element={<Layout><Vendedores /></Layout>} path="/vendedores" />
          <Route element={<Layout><Contato /></Layout>} path="/contato" />
          <Route element={<Layout><Campanha /></Layout>} path="/campanha" />
          <Route element={<Layout><Geny /></Layout>} path="/geny" />
          <Route element={<Layout><Relatorios /></Layout>} path="/relatorios" />
          <Route element={<Layout><Usuarios /></Layout>} path="/usuarios" />
          <Route element={<Layout><Configuracoes /></Layout>} path="/configuracoes" />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
