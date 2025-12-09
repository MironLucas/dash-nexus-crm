import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Users, Target, X, Trophy, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type TipoCampanha = 'aniversario' | 'produto' | 'custom' | 'ranking';
type TipoRanking = 'valor' | 'quantidade_pedidos' | 'quantidade_produtos';

interface ClienteRanking {
  id_client: number;
  nome_completo: string | null;
  telefone: string | null;
  total: number;
}

const Campanha = () => {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [novaCampanha, setNovaCampanha] = useState({
    nome: '',
    descricao: '',
    tipo: 'custom' as TipoCampanha,
  });
  const [tipoRanking, setTipoRanking] = useState<TipoRanking>('valor');
  const [tamanhoRanking, setTamanhoRanking] = useState<number>(10);
  const [clientesSelecionados, setClientesSelecionados] = useState<number[]>([]);
  const [vendedoresSelecionados, setVendedoresSelecionados] = useState<number[]>([]);
  const [isLoadingRanking, setIsLoadingRanking] = useState(false);
  const [clientesRanking, setClientesRanking] = useState<ClienteRanking[]>([]);

  const { data: campanhas, isLoading } = useQuery({
    queryKey: ['campanhas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campanhas' as any)
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  const { data: clientes } = useQuery({
    queryKey: ['customers-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers' as any)
        .select('*')
        .order('nome_completo');
      
      if (error) throw error;
      return data || [];
    }
  });

  const { data: vendedores } = useQuery({
    queryKey: ['vendedores-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendedores' as any)
        .select('*')
        .order('nomevendedor');
      
      if (error) throw error;
      return data || [];
    }
  });

  const criarCampanhaMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('campanhas' as any)
        .insert({
          nome: novaCampanha.nome,
          descricao: novaCampanha.descricao,
          tipo: novaCampanha.tipo === 'ranking' ? 'custom' : novaCampanha.tipo,
          criterios: novaCampanha.tipo === 'ranking' ? { tipoRanking, tamanhoRanking } : {},
          created_by: user.id,
          ativo: true
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as any;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campanhas'] });
    },
    onError: () => {
      toast.error('Erro ao criar campanha');
    }
  });

  const vincularClientesMutation = useMutation({
    mutationFn: async (campanhaId: string) => {
      const inserts = clientesSelecionados.map(clienteId => ({
        campanha_id: campanhaId,
        cliente_id: clienteId,
        status: 'pendente'
      }));

      const { error } = await supabase
        .from('campanha_clientes' as any)
        .insert(inserts);
      
      if (error) throw error;
    },
    onSuccess: () => {
      setClientesSelecionados([]);
    }
  });

  const vincularVendedoresMutation = useMutation({
    mutationFn: async (campanhaId: string) => {
      const inserts = vendedoresSelecionados.map(vendedorId => ({
        campanha_id: campanhaId,
        vendedor_id: vendedorId
      }));

      const { error } = await supabase
        .from('campanha_vendedores' as any)
        .insert(inserts);
      
      if (error) throw error;
    },
    onSuccess: () => {
      setVendedoresSelecionados([]);
    }
  });

  const buscarClientesRanking = async () => {
    if (tamanhoRanking <= 0) {
      toast.error('Tamanho do ranking deve ser maior que 0');
      return;
    }

    setIsLoadingRanking(true);
    setClientesRanking([]);

    try {
      let query = '';
      
      if (tipoRanking === 'valor') {
        query = `
          SELECT c.id_client, c.nome_completo, c.telefone, COALESCE(SUM(o.valor_final), 0) as total
          FROM customers c
          LEFT JOIN orders o ON c.id_client = o.id_client
          GROUP BY c.id_client, c.nome_completo, c.telefone
          ORDER BY total DESC
          LIMIT ${tamanhoRanking}
        `;
      } else if (tipoRanking === 'quantidade_pedidos') {
        query = `
          SELECT c.id_client, c.nome_completo, c.telefone, COUNT(o.id_order) as total
          FROM customers c
          LEFT JOIN orders o ON c.id_client = o.id_client
          GROUP BY c.id_client, c.nome_completo, c.telefone
          ORDER BY total DESC
          LIMIT ${tamanhoRanking}
        `;
      } else if (tipoRanking === 'quantidade_produtos') {
        query = `
          SELECT c.id_client, c.nome_completo, c.telefone, COALESCE(SUM(
            (SELECT COUNT(*) FROM itens i WHERE i.id_order = o.id_order)
          ), 0) as total
          FROM customers c
          LEFT JOIN orders o ON c.id_client = o.id_client
          GROUP BY c.id_client, c.nome_completo, c.telefone
          ORDER BY total DESC
          LIMIT ${tamanhoRanking}
        `;
      }

      const { data, error } = await supabase.rpc('execute_readonly_query', { query_text: query });
      
      if (error) throw error;

      // A função retorna um objeto JSON, precisamos converter para array
      // Vamos buscar via múltiplas chamadas já que o execute_readonly_query retorna apenas 1 resultado
      // Melhor usar queries diretas
      
      let resultados: ClienteRanking[] = [];
      
      if (tipoRanking === 'valor') {
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders' as any)
          .select('id_client, valor_final');
        
        if (ordersError) throw ordersError;

        const totaisPorCliente: Record<number, number> = {};
        (ordersData || []).forEach((order: any) => {
          if (order.id_client) {
            totaisPorCliente[order.id_client] = (totaisPorCliente[order.id_client] || 0) + (order.valor_final || 0);
          }
        });

        const clientesOrdenados = Object.entries(totaisPorCliente)
          .sort(([, a], [, b]) => b - a)
          .slice(0, tamanhoRanking);

        for (const [idClient, total] of clientesOrdenados) {
          const clientesList = clientes as any[] || [];
          const cliente = clientesList.find((c: any) => c.id_client === parseInt(idClient));
          if (cliente) {
            resultados.push({
              id_client: parseInt(idClient),
              nome_completo: cliente.nome_completo,
              telefone: cliente.telefone,
              total: total as number
            });
          }
        }
      } else if (tipoRanking === 'quantidade_pedidos') {
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders' as any)
          .select('id_client');
        
        if (ordersError) throw ordersError;

        const contagemPorCliente: Record<number, number> = {};
        (ordersData || []).forEach((order: any) => {
          if (order.id_client) {
            contagemPorCliente[order.id_client] = (contagemPorCliente[order.id_client] || 0) + 1;
          }
        });

        const clientesOrdenados = Object.entries(contagemPorCliente)
          .sort(([, a], [, b]) => b - a)
          .slice(0, tamanhoRanking);

        for (const [idClient, total] of clientesOrdenados) {
          const clientesList = clientes as any[] || [];
          const cliente = clientesList.find((c: any) => c.id_client === parseInt(idClient));
          if (cliente) {
            resultados.push({
              id_client: parseInt(idClient),
              nome_completo: cliente.nome_completo,
              telefone: cliente.telefone,
              total: total as number
            });
          }
        }
      } else if (tipoRanking === 'quantidade_produtos') {
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders' as any)
          .select('id_order, id_client');
        
        if (ordersError) throw ordersError;

        const { data: itensData, error: itensError } = await supabase
          .from('itens' as any)
          .select('id_order');
        
        if (itensError) throw itensError;

        const itensPorPedido: Record<number, number> = {};
        (itensData || []).forEach((item: any) => {
          if (item.id_order) {
            itensPorPedido[item.id_order] = (itensPorPedido[item.id_order] || 0) + 1;
          }
        });

        const produtosPorCliente: Record<number, number> = {};
        (ordersData || []).forEach((order: any) => {
          if (order.id_client && order.id_order) {
            produtosPorCliente[order.id_client] = (produtosPorCliente[order.id_client] || 0) + (itensPorPedido[order.id_order] || 0);
          }
        });

        const clientesOrdenados = Object.entries(produtosPorCliente)
          .sort(([, a], [, b]) => b - a)
          .slice(0, tamanhoRanking);

        for (const [idClient, total] of clientesOrdenados) {
          const clientesList = clientes as any[] || [];
          const cliente = clientesList.find((c: any) => c.id_client === parseInt(idClient));
          if (cliente) {
            resultados.push({
              id_client: parseInt(idClient),
              nome_completo: cliente.nome_completo,
              telefone: cliente.telefone,
              total: total as number
            });
          }
        }
      }

      setClientesRanking(resultados);
      toast.success(`${resultados.length} clientes encontrados no ranking`);
    } catch (error) {
      console.error('Erro ao buscar ranking:', error);
      toast.error('Erro ao buscar ranking de clientes');
    } finally {
      setIsLoadingRanking(false);
    }
  };

  const handleCriarCampanha = async () => {
    if (!novaCampanha.nome) {
      toast.error('Nome da campanha é obrigatório');
      return;
    }

    if (clientesSelecionados.length === 0) {
      toast.error('Selecione pelo menos um cliente');
      return;
    }

    if (vendedoresSelecionados.length === 0) {
      toast.error('Selecione pelo menos um vendedor');
      return;
    }

    try {
      const campanha: any = await criarCampanhaMutation.mutateAsync();
      await vincularClientesMutation.mutateAsync(campanha.id);
      await vincularVendedoresMutation.mutateAsync(campanha.id);
      
      setIsCreateOpen(false);
      resetForm();
      toast.success('Campanha criada com sucesso!');
    } catch (error) {
      console.error('Erro ao criar campanha:', error);
    }
  };

  const resetForm = () => {
    setNovaCampanha({ nome: '', descricao: '', tipo: 'custom' });
    setTipoRanking('valor');
    setTamanhoRanking(10);
    setClientesSelecionados([]);
    setVendedoresSelecionados([]);
    setClientesRanking([]);
  };

  const handleCloseModal = () => {
    setIsCreateOpen(false);
    resetForm();
  };

  const filtrarClientesPorTipo = () => {
    if (!clientes) return [];
    
    if (novaCampanha.tipo === 'aniversario') {
      const hoje = new Date();
      const diaHoje = hoje.getDate();
      const mesHoje = hoje.getMonth() + 1;
      
      return clientes.filter((c: any) => {
        if (!c.aniversario) return false;
        const aniv = new Date(c.aniversario);
        return aniv.getDate() === diaHoje && (aniv.getMonth() + 1) === mesHoje;
      });
    }
    
    return clientes;
  };

  const selecionarTodosClientes = (lista: any[]) => {
    const ids = lista.map((c: any) => c.id_client);
    setClientesSelecionados(ids);
  };

  const limparSelecaoClientes = () => {
    setClientesSelecionados([]);
  };

  const selecionarTodosVendedores = () => {
    const ids = (vendedores || []).map((v: any) => v.vendedor);
    setVendedoresSelecionados(ids);
  };

  const limparSelecaoVendedores = () => {
    setVendedoresSelecionados([]);
  };

  const getRankingLabel = (tipo: TipoRanking) => {
    switch (tipo) {
      case 'valor': return 'Total em R$';
      case 'quantidade_pedidos': return 'Qtd. Pedidos';
      case 'quantidade_produtos': return 'Qtd. Produtos';
    }
  };

  const formatRankingValue = (tipo: TipoRanking, value: number) => {
    if (tipo === 'valor') {
      return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    }
    return value.toString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campanhas</h1>
          <p className="text-muted-foreground">Gerencie campanhas de contato e vendas</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Campanha
        </Button>
      </div>

      {/* Modal de Criação */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between border-b">
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Criar Nova Campanha
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={handleCloseModal}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Informações Básicas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome da Campanha *</Label>
                  <Input
                    id="nome"
                    value={novaCampanha.nome}
                    onChange={(e) => setNovaCampanha({ ...novaCampanha, nome: e.target.value })}
                    placeholder="Ex: Top 10 Clientes VIP"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo de Campanha</Label>
                  <Select
                    value={novaCampanha.tipo}
                    onValueChange={(value: TipoCampanha) => {
                      setNovaCampanha({ ...novaCampanha, tipo: value });
                      setClientesSelecionados([]);
                      setClientesRanking([]);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aniversario">Aniversariantes</SelectItem>
                      <SelectItem value="ranking">Ranking de Clientes</SelectItem>
                      <SelectItem value="custom">Personalizada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição da Campanha</Label>
                <Textarea
                  id="descricao"
                  value={novaCampanha.descricao}
                  onChange={(e) => setNovaCampanha({ ...novaCampanha, descricao: e.target.value })}
                  placeholder="Descreva o objetivo da campanha..."
                  rows={2}
                />
              </div>

              {/* Opções de Ranking */}
              {novaCampanha.tipo === 'ranking' && (
                <Card className="border-2 border-primary/20 bg-primary/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-primary" />
                      Configuração do Ranking
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Tipo de Ranking</Label>
                        <Select
                          value={tipoRanking}
                          onValueChange={(value: TipoRanking) => {
                            setTipoRanking(value);
                            setClientesRanking([]);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="valor">Por Valor Total</SelectItem>
                            <SelectItem value="quantidade_pedidos">Por Quantidade de Pedidos</SelectItem>
                            <SelectItem value="quantidade_produtos">Por Quantidade de Produtos</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Tamanho do Ranking</Label>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          value={tamanhoRanking}
                          onChange={(e) => setTamanhoRanking(parseInt(e.target.value) || 10)}
                          placeholder="Ex: 10"
                        />
                      </div>

                      <div className="flex items-end">
                        <Button 
                          onClick={buscarClientesRanking} 
                          disabled={isLoadingRanking}
                          className="w-full"
                        >
                          {isLoadingRanking ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Trophy className="h-4 w-4 mr-2" />
                          )}
                          Buscar Ranking
                        </Button>
                      </div>
                    </div>

                    {clientesRanking.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Clientes no Ranking ({clientesRanking.length})</Label>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => selecionarTodosClientes(clientesRanking)}>
                              Selecionar Todos
                            </Button>
                            <Button size="sm" variant="outline" onClick={limparSelecaoClientes}>
                              Limpar Seleção
                            </Button>
                          </div>
                        </div>
                        <div className="border rounded-lg max-h-48 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-12"></TableHead>
                                <TableHead>Posição</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Telefone</TableHead>
                                <TableHead className="text-right">{getRankingLabel(tipoRanking)}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {clientesRanking.map((cliente, index) => (
                                <TableRow key={cliente.id_client}>
                                  <TableCell>
                                    <Checkbox
                                      checked={clientesSelecionados.includes(cliente.id_client)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setClientesSelecionados([...clientesSelecionados, cliente.id_client]);
                                        } else {
                                          setClientesSelecionados(clientesSelecionados.filter(id => id !== cliente.id_client));
                                        }
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={index < 3 ? "default" : "secondary"}>
                                      #{index + 1}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>{cliente.nome_completo || 'Sem nome'}</TableCell>
                                  <TableCell>{cliente.telefone || '-'}</TableCell>
                                  <TableCell className="text-right font-medium">
                                    {formatRankingValue(tipoRanking, cliente.total)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Seleção de Clientes para outros tipos */}
              {novaCampanha.tipo !== 'ranking' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Clientes ({clientesSelecionados.length} selecionados)</Label>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => selecionarTodosClientes(filtrarClientesPorTipo())}>
                        Selecionar Todos
                      </Button>
                      <Button size="sm" variant="outline" onClick={limparSelecaoClientes}>
                        Limpar
                      </Button>
                    </div>
                  </div>
                  <div className="border rounded-md p-4 max-h-48 overflow-y-auto space-y-2">
                    {filtrarClientesPorTipo().length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        {novaCampanha.tipo === 'aniversario' 
                          ? 'Nenhum cliente faz aniversário hoje'
                          : 'Nenhum cliente encontrado'}
                      </p>
                    ) : (
                      filtrarClientesPorTipo().map((cliente: any) => (
                        <div key={cliente.id_client} className="flex items-center space-x-2">
                          <Checkbox
                            checked={clientesSelecionados.includes(cliente.id_client)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setClientesSelecionados([...clientesSelecionados, cliente.id_client]);
                              } else {
                                setClientesSelecionados(clientesSelecionados.filter(id => id !== cliente.id_client));
                              }
                            }}
                          />
                          <label className="text-sm">
                            {cliente.nome_completo || 'Sem nome'} - {cliente.telefone || 'Sem telefone'}
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Seleção de Vendedores */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Vendedores ({vendedoresSelecionados.length} selecionados) *</Label>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={selecionarTodosVendedores}>
                      Selecionar Todos
                    </Button>
                    <Button size="sm" variant="outline" onClick={limparSelecaoVendedores}>
                      Limpar
                    </Button>
                  </div>
                </div>
                <div className="border rounded-md p-4 max-h-32 overflow-y-auto space-y-2">
                  {vendedores?.map((vendedor: any) => (
                    <div key={vendedor.vendedor} className="flex items-center space-x-2">
                      <Checkbox
                        checked={vendedoresSelecionados.includes(vendedor.vendedor)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setVendedoresSelecionados([...vendedoresSelecionados, vendedor.vendedor]);
                          } else {
                            setVendedoresSelecionados(vendedoresSelecionados.filter(id => id !== vendedor.vendedor));
                          }
                        }}
                      />
                      <label className="text-sm">{vendedor.nomevendedor}</label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-3 pt-4 border-t">
                <Button variant="outline" onClick={handleCloseModal} className="flex-1">
                  Cancelar
                </Button>
                <Button 
                  onClick={handleCriarCampanha} 
                  disabled={criarCampanhaMutation.isPending || !novaCampanha.nome || clientesSelecionados.length === 0 || vendedoresSelecionados.length === 0}
                  className="flex-1"
                >
                  {criarCampanhaMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Criar Campanha
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campanhas Ativas</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campanhas?.filter((c: any) => c.ativo).length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientes?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendedores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vendedores?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campanhas Criadas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Carregando campanhas...</p>
          ) : campanhas && campanhas.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criada em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campanhas.map((campanha: any) => (
                  <TableRow key={campanha.id}>
                    <TableCell className="font-medium">{campanha.nome}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {campanha.tipo === 'aniversario' && 'Aniversariantes'}
                        {campanha.tipo === 'produto' && 'Por Produto'}
                        {campanha.tipo === 'custom' && 'Personalizada'}
                      </Badge>
                    </TableCell>
                    <TableCell>{campanha.descricao}</TableCell>
                    <TableCell>
                      {campanha.ativo ? (
                        <Badge variant="default">Ativa</Badge>
                      ) : (
                        <Badge variant="secondary">Inativa</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(campanha.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground">Nenhuma campanha criada ainda.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Campanha;
