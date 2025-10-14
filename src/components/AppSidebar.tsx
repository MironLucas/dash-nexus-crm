import { Home, Package, ShoppingCart, Users, Settings, UserCircle, Shield } from "lucide-react";
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
} from "@/components/ui/sidebar";

const allItems = [
  { title: "Inicial", url: "/", icon: Home, allowedRoles: ["admin", "gerente"] },
  { title: "Produtos", url: "/produtos", icon: Package, allowedRoles: ["admin", "gerente"] },
  { title: "Pedidos", url: "/pedidos", icon: ShoppingCart, allowedRoles: ["admin", "gerente", "vendedor"] },
  { title: "Clientes", url: "/clientes", icon: Users, allowedRoles: ["admin", "gerente"] },
  { title: "Vendedores", url: "/vendedores", icon: UserCircle, allowedRoles: ["admin", "gerente", "vendedor"] },
  { title: "Usuários", url: "/usuarios", icon: Shield, allowedRoles: ["admin", "gerente"] },
  { title: "Configurações", url: "/configuracoes", icon: Settings, allowedRoles: ["admin", "gerente", "vendedor"] },
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
        if (user?.email) {
          const response = await fetch(
            `https://jckwavzrpyczdkbwxnqb.supabase.co/rest/v1/users?emailuser=eq.${encodeURIComponent(user.email)}&select=cargo`,
            {
              headers: {
                apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impja3dhdnpycHljemRrYnd4bnFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMjU1MTcsImV4cCI6MjA3NTYwMTUxN30.JrEwf_IP-eeO194tKAxe6fp-1ZQH80D1oL4PRF4pl_c",
                Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impja3dhdnpycHljemRrYnd4bnFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMjU1MTcsImV4cCI6MjA3NTYwMTUxN30.JrEwf_IP-eeO194tKAxe6fp-1ZQH80D1oL4PRF4pl_c"
              }
            }
          );
          const data = await response.json();
          setUserRole(data?.[0]?.cargo || null);
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
    </Sidebar>
  );
}
