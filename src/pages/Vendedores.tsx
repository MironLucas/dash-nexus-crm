import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, ShoppingCart, TrendingUp, Search } from "lucide-react";
import { useState, useMemo } from "react";

const Vendedores = () => {
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: vendedores, isLoading } = useQuery({
    queryKey: ['vendedores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendedores' as any)
        .select('*');
      if (error) throw error;
      return data as any[];
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
                  <TableHead>Pedidos</TableHead>
                  <TableHead>Total Vendido</TableHead>
                  <TableHead>Ticket Médio</TableHead>
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
                      <TableCell>{stats.quantidadePedidos}</TableCell>
                      <TableCell>
                        R$ {Number(stats.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        R$ {Number(ticketMedioVendedor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
