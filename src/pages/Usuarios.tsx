import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, UserPlus, Mail, Users as UsersIcon, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface User {
  id_users: number;
  nome_user: string | null;
  emailuser: string | null;
  phoneuser: number | null;
  cargo: string | null;
  ativouser: string | null;
}

const Usuarios = () => {
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [cargoFilter, setCargoFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", cargo: "" });
  const { toast } = useToast();

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    try {
      const response = await fetch(
        `https://jckwavzrpyczdkbwxnqb.supabase.co/rest/v1/users?select=*&order=id_users.desc`,
        {
          headers: {
            apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impja3dhdnpycHljemRrYnd4bnFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMjU1MTcsImV4cCI6MjA3NTYwMTUxN30.JrEwf_IP-eeO194tKAxe6fp-1ZQH80D1oL4PRF4pl_c",
            Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impja3dhdnpycHljemRrYnd4bnFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMjU1MTcsImV4cCI6MjA3NTYwMTUxN30.JrEwf_IP-eeO194tKAxe6fp-1ZQH80D1oL4PRF4pl_c"
          }
        }
      );
      const data = await response.json();
      setUsuarios(data || []);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os usuários",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.cargo) {
      toast({
        title: "Erro",
        description: "Preencha email e cargo",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(
        `https://jckwavzrpyczdkbwxnqb.supabase.co/rest/v1/users`,
        {
          method: "POST",
          headers: {
            apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impja3dhdnpycHljemRrYnd4bnFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMjU1MTcsImV4cCI6MjA3NTYwMTUxN30.JrEwf_IP-eeO194tKAxe6fp-1ZQH80D1oL4PRF4pl_c",
            Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impja3dhdnpycHljemRrYnd4bnFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMjU1MTcsImV4cCI6MjA3NTYwMTUxN30.JrEwf_IP-eeO194tKAxe6fp-1ZQH80D1oL4PRF4pl_c",
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
          },
          body: JSON.stringify({
            emailuser: newUser.email,
            cargo: newUser.cargo,
            ativouser: "ativo",
          })
        }
      );

      if (!response.ok) throw new Error("Erro ao criar usuário");

      toast({
        title: "Sucesso",
        description: "Usuário criado com sucesso!",
      });

      setIsDialogOpen(false);
      setNewUser({ email: "", cargo: "" });
      fetchUsuarios();

      // Enviar email de convite
      await sendInviteEmail(newUser.email, newUser.cargo);
    } catch (error) {
      console.error("Erro ao criar usuário:", error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o usuário",
        variant: "destructive",
      });
    }
  };

  const sendInviteEmail = async (email: string, cargo?: string) => {
    try {
      const response = await fetch(
        `https://jckwavzrpyczdkbwxnqb.supabase.co/functions/v1/send-invite`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, cargo })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao enviar email");
      }

      toast({
        title: "Email enviado",
        description: "Convite enviado para " + email,
      });
    } catch (error) {
      console.error("Erro ao enviar email:", error);
      toast({
        title: "Erro ao enviar email",
        description: "Não foi possível enviar o convite",
        variant: "destructive",
      });
    }
  };

  const toggleUserStatus = async (userId: number, currentStatus: string | null) => {
    const newStatus = currentStatus === "ativo" ? "inativo" : "ativo";
    
    try {
      const response = await fetch(
        `https://jckwavzrpyczdkbwxnqb.supabase.co/rest/v1/users?id_users=eq.${userId}`,
        {
          method: "PATCH",
          headers: {
            apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impja3dhdnpycHljemRrYnd4bnFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMjU1MTcsImV4cCI6MjA3NTYwMTUxN30.JrEwf_IP-eeO194tKAxe6fp-1ZQH80D1oL4PRF4pl_c",
            Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impja3dhdnpycHljemRrYnd4bnFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMjU1MTcsImV4cCI6MjA3NTYwMTUxN30.JrEwf_IP-eeO194tKAxe6fp-1ZQH80D1oL4PRF4pl_c",
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
          },
          body: JSON.stringify({ ativouser: newStatus })
        }
      );

      if (!response.ok) throw new Error("Erro ao atualizar status");

      toast({
        title: "Sucesso",
        description: `Usuário ${newStatus === "ativo" ? "ativado" : "desativado"}`,
      });

      fetchUsuarios();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: number, email: string | null) => {
    if (!confirm(`Tem certeza que deseja deletar o usuário ${email}?`)) {
      return;
    }

    try {
      const response = await fetch(
        `https://jckwavzrpyczdkbwxnqb.supabase.co/rest/v1/users?id_users=eq.${userId}`,
        {
          method: "DELETE",
          headers: {
            apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impja3dhdnpycHljemRrYnd4bnFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMjU1MTcsImV4cCI6MjA3NTYwMTUxN30.JrEwf_IP-eeO194tKAxe6fp-1ZQH80D1oL4PRF4pl_c",
            Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impja3dhdnpycHljemRrYnd4bnFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMjU1MTcsImV4cCI6MjA3NTYwMTUxN30.JrEwf_IP-eeO194tKAxe6fp-1ZQH80D1oL4PRF4pl_c",
          }
        }
      );

      if (!response.ok) throw new Error("Erro ao deletar usuário");

      toast({
        title: "Sucesso",
        description: "Usuário deletado com sucesso",
      });

      fetchUsuarios();
    } catch (error) {
      console.error("Erro ao deletar usuário:", error);
      toast({
        title: "Erro",
        description: "Não foi possível deletar o usuário",
        variant: "destructive",
      });
    }
  };

  const filteredUsuarios = usuarios.filter((user) => {
    const matchesSearch =
      user.nome_user?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.emailuser?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCargo = cargoFilter === "all" || user.cargo === cargoFilter;
    const matchesStatus = statusFilter === "all" || user.ativouser === statusFilter;

    return matchesSearch && matchesCargo && matchesStatus;
  });

  const totalUsuarios = usuarios.length;
  const usuariosAtivos = usuarios.filter((u) => u.ativouser === "ativo").length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Usuários</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
            <div className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="usuario@exemplo.com"
                />
              </div>
              <div>
                <Label>Cargo</Label>
                <Select value={newUser.cargo} onValueChange={(value) => setNewUser({ ...newUser, cargo: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="gerente">Gerente</SelectItem>
                    <SelectItem value="vendedor">Vendedor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateUser} className="w-full">
                <Mail className="mr-2 h-4 w-4" />
                Criar e Enviar Convite
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsuarios}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usuariosAtivos}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={cargoFilter} onValueChange={setCargoFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Cargo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Cargos</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="gerente">Gerente</SelectItem>
                <SelectItem value="vendedor">Vendedor</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Mostrando {filteredUsuarios.length} de {totalUsuarios} usuários
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsuarios.map((user) => (
                  <TableRow key={user.id_users}>
                    <TableCell>{user.id_users}</TableCell>
                    <TableCell>{user.nome_user || "-"}</TableCell>
                    <TableCell>{user.emailuser}</TableCell>
                    <TableCell>{user.phoneuser || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={user.cargo === "admin" ? "default" : "secondary"}>
                        {user.cargo}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.ativouser === "ativo" ? "default" : "destructive"}>
                        {user.ativouser}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleUserStatus(user.id_users, user.ativouser)}
                        >
                          {user.ativouser === "ativo" ? "Desativar" : "Ativar"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => sendInviteEmail(user.emailuser || "", user.cargo || "")}
                        >
                          <Mail className="mr-1 h-3 w-3" />
                          Reenviar
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id_users, user.emailuser)}
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          Deletar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Usuarios;
