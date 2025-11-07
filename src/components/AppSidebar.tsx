import { Home, Package, ShoppingCart, Users, Settings, UserCircle, Shield, MessageCircle, Megaphone } from "lucide-react";
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

const allItems = [
  { title: "Inicial", url: "/", icon: Home, allowedRoles: ["admin", "gerente", "vendedor"] },
  { title: "Produtos", url: "/produtos", icon: Package, allowedRoles: ["admin", "gerente"] },
  { title: "Pedidos", url: "/pedidos", icon: ShoppingCart, allowedRoles: ["admin", "gerente", "vendedor"] },
  { title: "Clientes", url: "/clientes", icon: Users, allowedRoles: ["admin", "gerente"] },
  { title: "Vendedores", url: "/vendedores", icon: UserCircle, allowedRoles: ["admin", "gerente"] },
  { title: "Contato", url: "/contato", icon: MessageCircle, allowedRoles: ["vendedor"] },
  { title: "Campanha", url: "/campanha", icon: Megaphone, allowedRoles: ["admin", "gerente"] },
  { title: "Usuários", url: "/usuarios", icon: Shield, allowedRoles: ["admin"] },
  { title: "Configurações", url: "/configuracoes", icon: Settings, allowedRoles: ["admin"] },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .maybeSingle();
          
          setUserRole(roleData?.role || null);
        }
      } catch (error) {
        console.error("Erro ao buscar role do usuário:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, []);

  const items = allItems.filter(item => 
    !userRole || item.allowedRoles.includes(userRole)
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-primary-foreground px-4 py-6">
            {!isCollapsed && <span className="text-xl font-bold">CRM Pro</span>}
            {isCollapsed && <span className="text-xl font-bold">C</span>}
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
