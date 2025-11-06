import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, ShoppingCart, TrendingUp, Search, Link as LinkIcon } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

const Vendedores = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();
  
  const { data: vendedores, isLoading } = useQuery({
    queryKey: ['vendedores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendedores' as any)
        .select('*');
      if (error) throw error;
      
      // Buscar os perfis dos usuários vinculados separadamente
      if (data && data.length > 0) {
        const userIds = data
          .filter((v: any) => v.user_id)
          .map((v: any) => v.user_id);
        
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, nome')
            .in('id', userIds);
          
          // Mapear os perfis aos vendedores
          return data.map((vendedor: any) => ({
            ...vendedor,
            profile_nome: profilesData?.find((p: any) => p.id === vendedor.user_id)?.nome
          }));
        }
      }
      
      return data as any[];
    }
  });

  // Buscar usuários com role vendedor que ainda não estão vinculados
  const { data: availableUsers } = useQuery({
    queryKey: ['available-users-vendedor', vendedores],
    queryFn: async () => {
      // Buscar todos os usuários do sistema via edge function
      const { data: usersResponse, error } = await supabase.functions.invoke('list-users');
      
      if (error || !usersResponse?.users) {
        console.error('Erro ao buscar usuários:', error);
        return [];
      }
      
      // Filtrar apenas usuários com role vendedor
      const vendedorUsers = usersResponse.users.filter((user: any) => 
        user.role === 'vendedor'
      );
      
      // Filtrar usuários que já estão vinculados
      const linkedUserIds = vendedores
        ?.filter(v => v.user_id)
        .map(v => v.user_id) || [];
      
      return vendedorUsers
        .filter((user: any) => !linkedUserIds.includes(user.id))
        .map((user: any) => ({
          id: user.id,
          nome: user.user_metadata?.nome || user.email || 'Sem nome'
        }));
    },
    enabled: !!vendedores
  });

  const linkUserMutation = useMutation({
    mutationFn: async ({ vendedorId, userId }: { vendedorId: number; userId: string }) => {
      const { error } = await supabase
        .from('vendedores' as any)
        .update({ user_id: userId })
        .eq('vendedor', vendedorId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendedores'] });
      queryClient.invalidateQueries({ queryKey: ['available-users-vendedor'] });
      toast.success('Usuário vinculado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao vincular usuário:', error);
      toast.error('Erro ao vincular usuário');
    }
  });

  const unlinkUserMutation = useMutation({
    mutationFn: async (vendedorId: number) => {
      const { error } = await supabase
        .from('vendedores' as any)
        .update({ user_id: null })
        .eq('vendedor', vendedorId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendedores'] });
      queryClient.invalidateQueries({ queryKey: ['available-users-vendedor'] });
      toast.success('Vínculo removido com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao remover vínculo:', error);
      toast.error('Erro ao remover vínculo');
    }
  });

  const { data: salesByVendedor } = useQuery({
    queryKey: ['sales-by-vendedor'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders' as any)
        .select('vendedor, valor_final, id_order');
      if (error) throw error;
      
      const salesMap = (data as any[]).reduce((acc, order) => {
        const vendedorId = order.vendedor;
        if (!acc[vendedorId]) {
          acc[vendedorId] = {
            totalVendas: 0,
            quantidadePedidos: 0,
            valorTotal: 0
          };
        }
        acc[vendedorId].quantidadePedidos += 1;
        acc[vendedorId].valorTotal += Number(order.valor_final || 0);
        return acc;
      }, {} as Record<number, { totalVendas: number; quantidadePedidos: number; valorTotal: number }>);
      
      return salesMap;
    }
  });

  const filteredVendedores = useMemo(() => {
    if (!vendedores) return [];
    
    return vendedores.filter(vendedor => {
      return vendedor.nomevendedor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
             vendedor.vendedor?.toString().includes(searchTerm);
    });
  }, [vendedores, searchTerm]);

  const totalVendas = salesByVendedor 
    ? (Object.values(salesByVendedor).reduce((sum: number, v: any) => sum + v.valorTotal, 0) as number)
    : 0;

  const totalPedidos = salesByVendedor 
    ? (Object.values(salesByVendedor).reduce((sum: number, v: any) => sum + v.quantidadePedidos, 0) as number)
    : 0;

  const ticketMedio = totalPedidos > 0 ? (totalVendas / totalPedidos) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Vendedores</h1>
        <p className="text-muted-foreground">Performance e métricas da equipe de vendas</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total em Vendas</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {Number(totalVendas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Number(totalPedidos)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {Number(ticketMedio).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance por Vendedor</CardTitle>
          <div className="flex gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Carregando vendedores...</p>
          ) : filteredVendedores && filteredVendedores.length > 0 ? (
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Mostrando {filteredVendedores.length} de {vendedores?.length || 0} vendedores
              </p>
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Usuário Vinculado</TableHead>
                  <TableHead>Pedidos</TableHead>
                  <TableHead>Total Vendido</TableHead>
                  <TableHead>Ticket Médio</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVendedores.map((vendedor: any) => {
                  const stats = salesByVendedor?.[vendedor.vendedor] || {
                    quantidadePedidos: 0,
                    valorTotal: 0
                  };
                  const ticketMedioVendedor = stats.quantidadePedidos > 0 
                    ? stats.valorTotal / stats.quantidadePedidos 
                    : 0;

                  return (
                    <TableRow key={vendedor.vendedor}>
                      <TableCell className="font-medium">{vendedor.vendedor}</TableCell>
                      <TableCell>{vendedor.nomevendedor}</TableCell>
                      <TableCell>
                        {vendedor.user_id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{vendedor.profile_nome || 'Usuário vinculado'}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => unlinkUserMutation.mutate(vendedor.vendedor)}
                              disabled={unlinkUserMutation.isPending}
                            >
                              Desvincular
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Select
                              onValueChange={(userId) => 
                                linkUserMutation.mutate({ 
                                  vendedorId: vendedor.vendedor, 
                                  userId 
                                })
                              }
                              disabled={linkUserMutation.isPending || !availableUsers?.length}
                            >
                              <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Vincular usuário" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableUsers?.map((user) => (
                                  <SelectItem key={user.id} value={user.id}>
                                    {user.nome}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{stats.quantidadePedidos}</TableCell>
                      <TableCell>
                        R$ {Number(stats.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        R$ {Number(ticketMedioVendedor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          disabled={!vendedor.user_id}
                          title={vendedor.user_id ? "Usuário vinculado" : "Vincule um usuário primeiro"}
                        >
                          <LinkIcon className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          ) : (
            <p className="text-muted-foreground">Nenhum vendedor encontrado.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Vendedores;
