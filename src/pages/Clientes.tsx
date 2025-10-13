import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Users, UserPlus, TrendingUp, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

const Clientes = () => {
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState("todas");
  
  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers' as any)
        .select('*')
        .order('id_client', { ascending: false });
      if (error) throw error;
      return data as any[];
    }
  });

  const { data: allOrders } = useQuery({
    queryKey: ['all-customer-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders' as any)
        .select('id_client, data_pedido');
      if (error) throw error;
      return data as any[];
    }
  });

  const cities = useMemo(() => {
    const citiesSet = new Set(customers?.map(c => c.cidade).filter(Boolean));
    return Array.from(citiesSet);
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    
    return customers.filter(customer => {
      const matchesSearch = 
        customer.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.telefone?.includes(searchTerm) ||
        customer.document?.includes(searchTerm);
      
      const matchesCity = 
        cityFilter === "todas" || 
        customer.cidade === cityFilter;
      
      return matchesSearch && matchesCity;
    });
  }, [customers, searchTerm, cityFilter]);

  const totalClientes = customers?.length || 0;
  const clientesNovos = customers?.filter(c => {
    const created = new Date(c.created_at);
    const thirtyDaysAgo = subDays(new Date(), 30);
    return created >= thirtyDaysAgo;
  }).length || 0;

  const clientesAtivos = allOrders 
    ? new Set(allOrders.map(o => o.id_client)).size 
    : 0;

  const { data: customerOrders } = useQuery({
    queryKey: ['customer-orders', selectedCustomer?.id_client],
    enabled: !!selectedCustomer,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders' as any)
        .select('*')
        .eq('id_client', selectedCustomer.id_client)
        .order('data_pedido', { ascending: false });
      if (error) throw error;
      return data as any[];
    }
  });

  const { data: customerProducts } = useQuery({
    queryKey: ['customer-products', selectedCustomer?.id_client],
    enabled: !!selectedCustomer,
    queryFn: async () => {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders' as any)
        .select('id_order')
        .eq('id_client', selectedCustomer.id_client);
      
      if (ordersError) throw ordersError;
      
      const orderIds = ordersData.map((o: any) => o.id_order);
      
      if (orderIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('itens' as any)
        .select('*, products(*)')
        .in('id_order', orderIds);
      
      if (error) throw error;
      return data as any[];
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">Gerencie sua base de clientes</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClientes}</div>
            <p className="text-xs text-muted-foreground">cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Novos</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientesNovos}</div>
            <p className="text-xs text-muted-foreground">últimos 30 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientesAtivos}</div>
            <p className="text-xs text-muted-foreground">com pedidos</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
          <div className="flex gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email, telefone ou documento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Cidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as cidades</SelectItem>
                {cities.map(city => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Carregando clientes...</p>
          ) : filteredCustomers && filteredCustomers.length > 0 ? (
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Mostrando {filteredCustomers.length} de {customers?.length || 0} clientes
              </p>
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow 
                    key={customer.id_client}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedCustomer(customer)}
                  >
                    <TableCell className="font-medium">{customer.id_client}</TableCell>
                    <TableCell>{customer.nome_completo}</TableCell>
                    <TableCell>{customer.email || '-'}</TableCell>
                    <TableCell>{customer.telefone || '-'}</TableCell>
                    <TableCell>{customer.cidade || '-'}</TableCell>
                    <TableCell>{customer.estado || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          ) : (
            <p className="text-muted-foreground">Nenhum cliente encontrado.</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedCustomer?.nome_completo}</DialogTitle>
          </DialogHeader>
          
          {selectedCustomer && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Informações Pessoais</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-muted-foreground">Email:</span> {selectedCustomer.email || '-'}</p>
                    <p><span className="text-muted-foreground">Telefone:</span> {selectedCustomer.telefone || '-'}</p>
                    <p><span className="text-muted-foreground">Documento:</span> {selectedCustomer.document || '-'}</p>
                    <p><span className="text-muted-foreground">Gênero:</span> {selectedCustomer.genero || '-'}</p>
                    {selectedCustomer.aniversario && (
                      <p><span className="text-muted-foreground">Aniversário:</span> {format(new Date(selectedCustomer.aniversario), "dd/MM/yyyy", { locale: ptBR })}</p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Endereço</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-muted-foreground">CEP:</span> {selectedCustomer.cep || '-'}</p>
                    <p><span className="text-muted-foreground">Logradouro:</span> {selectedCustomer.logadouro || '-'}</p>
                    <p><span className="text-muted-foreground">Número:</span> {selectedCustomer.numero || '-'}</p>
                    <p><span className="text-muted-foreground">Complemento:</span> {selectedCustomer.complemento || '-'}</p>
                    <p><span className="text-muted-foreground">Bairro:</span> {selectedCustomer.bairro || '-'}</p>
                    <p><span className="text-muted-foreground">Cidade:</span> {selectedCustomer.cidade || '-'}</p>
                    <p><span className="text-muted-foreground">Estado:</span> {selectedCustomer.estado || '-'}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Resumo de Compras</h3>
                {customerOrders && customerOrders.length > 0 ? (
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <Card>
                      <CardContent className="pt-6">
                        <p className="text-2xl font-bold">{customerOrders.length}</p>
                        <p className="text-sm text-muted-foreground">Total de Pedidos</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <p className="text-2xl font-bold">
                          R$ {customerOrders.reduce((sum, order) => sum + Number(order.valor_final || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-sm text-muted-foreground">Valor Total Gasto</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <p className="text-2xl font-bold">
                          {customerProducts?.length || 0}
                        </p>
                        <p className="text-sm text-muted-foreground">Produtos Comprados</p>
                      </CardContent>
                    </Card>
                  </div>
                ) : null}

                <h4 className="font-semibold mb-2 text-sm">Histórico de Pedidos</h4>
                {customerOrders && customerOrders.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pedido</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customerOrders.map((order) => (
                        <TableRow key={order.id_order}>
                          <TableCell>#{order.id_order}</TableCell>
                          <TableCell>
                            {order.data_pedido 
                              ? format(new Date(order.data_pedido), "dd/MM/yyyy", { locale: ptBR })
                              : '-'
                            }
                          </TableCell>
                          <TableCell>R$ {Number(order.valor_final || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell>
                            <Badge>{order.status || 'Pendente'}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground text-sm">Nenhum pedido encontrado.</p>
                )}
              </div>

              {customerProducts && customerProducts.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 text-sm">Produtos Comprados</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {Array.from(new Map(customerProducts.map(item => [item.products?.id_product, item.products])).values()).map((product: any) => (
                      product && (
                        <div key={product.id_product} className="flex items-center gap-2 p-2 border rounded">
                          {product.imagem && (
                            <img src={product.imagem} alt={product.titulo} className="w-12 h-12 object-cover rounded" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{product.titulo}</p>
                            <p className="text-xs text-muted-foreground">{product.sku}</p>
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Clientes;
