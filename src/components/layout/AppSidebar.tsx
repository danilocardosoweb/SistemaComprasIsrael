import { Button } from "@/components/ui/button";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent
} from "@/components/ui/sidebar";
import { Calendar, Home, LayoutDashboard, Package, PackageOpen, ShoppingCart, Users, Settings } from "lucide-react";
import { Link } from "react-router-dom";
// Importando o logo com fundo
import logoSimBranco from "/Image/Logo_Sim_Sim.png";

export function AppSidebar() {
  const menuItems = [
    { icon: Home, label: "Página Inicial", to: "/" },
    { icon: LayoutDashboard, label: "Dashboard", to: "/dashboard" },
    { icon: Package, label: "Produtos", to: "/produtos" },
    { icon: ShoppingCart, label: "Vendas", to: "/vendas" },
    { icon: Users, label: "Clientes", to: "/clientes" },
    { icon: Calendar, label: "Relatórios", to: "/relatorios" },
    { icon: Settings, label: "Configurações do Site", to: "/configuracoes-site" },
  ];

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link to="/" className="flex items-center gap-2">
          <img 
            src={logoSimBranco} 
            alt="Logo Ministério De Casais" 
            className="h-4 w-auto" 
          />
          <div className="flex flex-col">
            <span className="font-bold text-lg">Ministério De Casais</span>
            <span className="text-xs text-muted-foreground">Sistema de gerenciamento de Reservas</span>
          </div>
        </Link>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild>
                    <Link to={item.to} className="flex items-center gap-3">
                      <item.icon size={20} />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="p-4">
        <div className="text-xs text-muted-foreground">
          Ministério De Casais - Sistema de Reservas v1.0
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
