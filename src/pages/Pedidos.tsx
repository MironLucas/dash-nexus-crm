import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, DollarSign, ShoppingCart, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

const Pedidos = () => {
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  
  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders' as any)
        .select('*, customers(*), vendedores(nomevendedor)')
        .order('data_pedido', { ascending: false });
      if (error) throw error;
      return data as any[];
    }
  });

  const totalVendido = orders?.reduce((sum, order) => sum + Number(order.valor_final || 0), 0) || 0;
  const totalPedidos = orders?.length || 0;
  const pedidosPendentes = orders?.filter(o => o.status?.toLowerCase() === 'pendente').length || 0;

  const { data: orderItems } = useQuery({
    queryKey: ['order-items', selectedOrder?.id_order],
    enabled: !!selectedOrder,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('itens' as any)
        .select('*, products(*)')
        .eq('id_order', selectedOrder.id_order);
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

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vendido</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {totalVendido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPedidos}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pedidosPendentes}</div>
            <p className="text-xs text-muted-foreground">
              aguardando processamento
            </p>
          </CardContent>
        </Card>
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
                  <TableRow 
                    key={order.id_order}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedOrder(order)}
                  >
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

      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Pedido #{selectedOrder?.id_order}</DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Informações do Pedido</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-muted-foreground">Data:</span> {selectedOrder.data_pedido ? format(new Date(selectedOrder.data_pedido), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '-'}</p>
                    <p><span className="text-muted-foreground">Status:</span> <Badge variant={getStatusVariant(selectedOrder.status)}>{selectedOrder.status || 'Pendente'}</Badge></p>
                    <p><span className="text-muted-foreground">Canal de Venda:</span> {selectedOrder.canal_venda || '-'}</p>
                    <p><span className="text-muted-foreground">Vendedor:</span> {selectedOrder.vendedores?.nomevendedor || '-'}</p>
                    <p><span className="text-muted-foreground">Transportadora:</span> {selectedOrder.transportadora || '-'}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Cliente</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-muted-foreground">Nome:</span> {selectedOrder.customers?.nome_completo || '-'}</p>
                    <p><span className="text-muted-foreground">Email:</span> {selectedOrder.customers?.email || '-'}</p>
                    <p><span className="text-muted-foreground">Telefone:</span> {selectedOrder.customers?.telefone || '-'}</p>
                    <p><span className="text-muted-foreground">Documento:</span> {selectedOrder.customers?.document || '-'}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Valores</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="text-muted-foreground">Valor Total:</span> R$ {Number(selectedOrder.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  <p><span className="text-muted-foreground">Desconto:</span> R$ {Number(selectedOrder.valor_desconto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  <p><span className="text-muted-foreground">Taxa de Entrega:</span> R$ {Number(selectedOrder.taxa_entrega || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  <p className="font-semibold text-base"><span className="text-muted-foreground">Valor Final:</span> R$ {Number(selectedOrder.valor_final || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Itens do Pedido</h3>
                {orderItems && orderItems.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Variante 1</TableHead>
                        <TableHead>Variante 2</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Desconto</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderItems.map((item) => (
                        <TableRow key={item.id_itens}>
                          <TableCell>{item.products?.titulo || '-'}</TableCell>
                          <TableCell>{item.products?.sku || '-'}</TableCell>
                          <TableCell>{item.variante1 || '-'}</TableCell>
                          <TableCell>{item.variante2 || '-'}</TableCell>
                          <TableCell>R$ {Number(item.product_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell>R$ {Number(item.product_desc || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className="font-semibold">R$ {Number(item.product_final || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground text-sm">Nenhum item encontrado.</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Pedidos;
