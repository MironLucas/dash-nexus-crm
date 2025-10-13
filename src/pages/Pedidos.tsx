import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const Pedidos = () => {
  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders' as any)
        .select('*, customers(nome_completo)')
        .order('data_pedido', { ascending: false });
      if (error) throw error;
      return data as any[];
    }
  });

  const getStatusVariant = (status: string) => {
    const statusMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'pendente': 'secondary',
      'processando': 'default',
      'enviado': 'outline',
      'entregue': 'default',
      'cancelado': 'destructive'
    };
    return statusMap[status?.toLowerCase()] || 'secondary';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pedidos</h1>
          <p className="text-muted-foreground">Acompanhe todos os seus pedidos</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo Pedido
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Pedidos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Carregando pedidos...</p>
          ) : orders && orders.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Canal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id_order}>
                    <TableCell className="font-medium">#{order.id_order}</TableCell>
                    <TableCell>
                      {order.data_pedido 
                        ? format(new Date(order.data_pedido), "dd/MM/yyyy", { locale: ptBR })
                        : '-'
                      }
                    </TableCell>
                    <TableCell>{order.customers?.nome_completo || '-'}</TableCell>
                    <TableCell>
                      R$ {Number(order.valor_final || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(order.status)}>
                        {order.status || 'Pendente'}
                      </Badge>
                    </TableCell>
                    <TableCell>{order.canal_venda || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground">Nenhum pedido encontrado.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Pedidos;
