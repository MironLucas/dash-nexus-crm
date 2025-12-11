import { Home, Package, ShoppingCart, Users, Settings, UserCircle, Shield, MessageCircle, Megaphone, Sparkles, FileBarChart } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { UserProfile } from "@/components/UserProfile";
import defaultLogo from "@/assets/logo.png";

const allItems = [
  { title: "Inicial", url: "/", icon: Home, allowedRoles: ["admin", "gerente", "vendedor"] },
  { title: "Produtos", url: "/produtos", icon: Package, allowedRoles: ["admin", "gerente"] },
  { title: "Pedidos", url: "/pedidos", icon: ShoppingCart, allowedRoles: ["admin", "gerente", "vendedor"] },
  { title: "Clientes", url: "/clientes", icon: Users, allowedRoles: ["admin", "gerente"] },
  { title: "Vendedores", url: "/vendedores", icon: UserCircle, allowedRoles: ["admin", "gerente"] },
  { title: "Contato", url: "/contato", icon: MessageCircle, allowedRoles: ["vendedor"] },
  { title: "Campanha", url: "/campanha", icon: Megaphone, allowedRoles: ["admin", "gerente"] },
  { title: "Geny", url: "/geny", icon: Sparkles, allowedRoles: ["admin", "gerente"] },
  { title: "Relatórios", url: "/relatorios", icon: FileBarChart, allowedRoles: ["admin", "gerente"] },
  { title: "Usuários", url: "/usuarios", icon: Shield, allowedRoles: ["admin"] },
  { title: "Configurações", url: "/configuracoes", icon: Settings, allowedRoles: ["admin"] },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: roleData, error: roleError } = await supabase.rpc('get_my_role');
          if (roleError) throw roleError;
          setUserRole(roleData || null);
        }
      } catch (error) {
        console.error("Erro ao buscar role do usuário:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchLogo = async () => {
      const { data } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'company_logo')
        .maybeSingle();
      if (data?.value) {
        setLogoUrl(data.value);
      }
    };

    fetchUserRole();
    fetchLogo();
  }, []);

  const items = userRole ? allItems.filter(item => item.allowedRoles.includes(userRole)) : [];

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 py-6 flex justify-center">
            <img 
              src={logoUrl || defaultLogo} 
              alt="Logo" 
              className={isCollapsed ? "h-8 w-8 object-contain" : "h-12 object-contain"}
            />
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {loading ? (
                <div className="px-4 py-2 text-sm text-muted-foreground">Carregando...</div>
              ) : (
                items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className={({ isActive }) =>
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
                      }
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <UserProfile isCollapsed={isCollapsed} />
      </SidebarFooter>
    </Sidebar>
  );
}
