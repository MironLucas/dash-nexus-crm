import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Search, UserPlus, Mail, Users, UserCheck, UserX, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DashboardCard } from "@/components/DashboardCard";

interface User {
  id: string;
  email: string;
  user_metadata: {
    nome?: string;
    cargo?: string;
  };
  created_at: string;
  last_sign_in_at?: string;
  role?: string;
}

const Usuarios = () => {
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCargo, setFilterCargo] = useState("todos");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserNome, setNewUserNome] = useState("");
  const [newUserCargo, setNewUserCargo] = useState("");
  const [creatingUser, setCreatingUser] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      
      // Buscar usuários através da edge function
      const { data, error } = await supabase.functions.invoke('list-users');
      
      if (error) {
        console.error("Erro ao buscar usuários:", error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar usuários",
          description: error.message,
        });
        return;
      }

      setUsuarios(data.users || []);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar usuários",
        description: "Erro ao carregar a lista de usuários",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserCargo || !newUserNome) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
      });
      return;
    }

    try {
      setCreatingUser(true);

      // Enviar convite através da edge function
      const { error: inviteError } = await supabase.functions.invoke('send-invite', {
        body: {
          email: newUserEmail,
          cargo: newUserCargo,
          nome: newUserNome
        }
      });

      if (inviteError) {
        throw inviteError;
      }

      toast({
        title: "Convite enviado com sucesso!",
        description: `Um email foi enviado para ${newUserEmail}`,
      });

      setCreateDialogOpen(false);
      setNewUserEmail("");
      setNewUserNome("");
      setNewUserCargo("");
      
      // Aguardar um pouco antes de recarregar para dar tempo do usuário ser criado
      setTimeout(() => {
        fetchUsuarios();
      }, 1000);
    } catch (error: any) {
      console.error("Erro ao enviar convite:", error);
      toast({
        variant: "destructive",
        title: "Erro ao enviar convite",
        description: error.message,
      });
    } finally {
      setCreatingUser(false);
    }
  };

  const resendInvite = async (email: string, nome: string, cargo: string) => {
    try {
      const { error } = await supabase.functions.invoke("send-invite", {
        body: { email, cargo, nome },
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Convite reenviado",
        description: `Email reenviado para ${email}`,
      });
    } catch (error: any) {
      console.error("Erro ao reenviar convite:", error);
      toast({
        variant: "destructive",
        title: "Erro ao reenviar convite",
        description: error.message,
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Usuário deletado",
        description: "Usuário removido com sucesso",
      });

      fetchUsuarios();
    } catch (error: any) {
      console.error("Erro ao deletar usuário:", error);
      toast({
        variant: "destructive",
        title: "Erro ao deletar usuário",
        description: error.message,
      });
    }
  };

  const filteredUsuarios = usuarios.filter((user) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      user.user_metadata?.nome?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.role?.toLowerCase().includes(searchLower);

    const matchesFilter =
      filterCargo === "todos" || user.role === filterCargo;

    return matchesSearch && matchesFilter;
  });

  const totalUsuarios = usuarios.length;
  const usuariosComRole = usuarios.filter((u) => u.role).length;
  const usuariosSemRole = usuarios.filter((u) => !u.role).length;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Usuários</h1>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo</Label>
                <Input
                  id="nome"
                  value={newUserNome}
                  onChange={(e) => setNewUserNome(e.target.value)}
                  placeholder="Nome completo do usuário"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cargo">Cargo</Label>
                <Select value={newUserCargo} onValueChange={setNewUserCargo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="gerente">Gerente</SelectItem>
                    <SelectItem value="vendedor">Vendedor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreateUser}
                disabled={creatingUser}
              >
                {creatingUser ? "Enviando..." : "Criar e Enviar Convite"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <DashboardCard
          title="Total de Usuários"
          value={totalUsuarios.toString()}
          icon={Users}
        />
        <DashboardCard
          title="Com Permissão"
          value={usuariosComRole.toString()}
          icon={UserCheck}
        />
        <DashboardCard
          title="Pendentes"
          value={usuariosSemRole.toString()}
          icon={UserX}
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuários..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterCargo} onValueChange={setFilterCargo}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por cargo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os cargos</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="gerente">Gerente</SelectItem>
                <SelectItem value="vendedor">Vendedor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Último Acesso</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filteredUsuarios.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsuarios.map((user) => {
                    const cargoLabel = user.role === 'admin' ? 'Administrador' : 
                                     user.role === 'gerente' ? 'Gerente' : 
                                     user.role === 'vendedor' ? 'Vendedor' : 'Sem permissão';
                    const lastAccess = user.last_sign_in_at 
                      ? new Date(user.last_sign_in_at).toLocaleDateString('pt-BR')
                      : 'Nunca acessou';
                    
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.user_metadata?.nome || "-"}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.role ? "default" : "secondary"}>
                            {cargoLabel}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {lastAccess}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => resendInvite(user.email!, user.user_metadata?.nome || '', user.role || 'vendedor')}
                            title="Reenviar convite"
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" title="Excluir usuário">
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Confirmar exclusão
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir este usuário?
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteUser(user.id)}
                                >
                                  Confirmar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Usuarios;