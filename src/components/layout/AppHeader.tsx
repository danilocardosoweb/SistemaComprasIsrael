import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Menu } from "lucide-react";
// Importando o logo com fundo
import logoComFundo from "/Image/Logo_Sim_Sim.png";

interface AppHeaderProps {
  toggleSidebar: () => void;
}

export function AppHeader({ toggleSidebar }: AppHeaderProps) {
  return (
    <header className="border-b bg-background px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <SidebarTrigger>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu size={20} />
          </Button>
        </SidebarTrigger>
        <div className="flex items-center gap-2">
          <img 
            src={logoComFundo} 
            alt="Logo Ministério De Casais" 
            className="h-8 w-auto" 
          />
          <h1 className="text-lg font-semibold hidden sm:block">Dashboard</h1>
        </div>
      </div>
    </header>
  );
}
