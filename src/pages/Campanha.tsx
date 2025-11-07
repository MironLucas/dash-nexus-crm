import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Users, Target } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const Campanha = () => {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [novaCampanha, setNovaCampanha] = useState({
    nome: '',
    descricao: '',
    tipo: 'custom' as 'aniversario' | 'produto' | 'custom',
    criterios: ''
  });
  const [clientesSelecionados, setClientesSelecionados] = useState<number[]>([]);
  const [vendedoresSelecionados, setVendedoresSelecionados] = useState<number[]>([]);
  const [campanhaParaVincular, setCampanhaParaVincular] = useState<string | null>(null);

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
          tipo: novaCampanha.tipo,
          criterios: novaCampanha.criterios ? JSON.parse(novaCampanha.criterios) : {},
          created_by: user.id,
          ativo: true
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campanhas'] });
      setIsCreateOpen(false);
      setNovaCampanha({ nome: '', descricao: '', tipo: 'custom', criterios: '' });
      toast.success('Campanha criada com sucesso!');
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
      toast.success('Clientes vinculados à campanha!');
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
      setCampanhaParaVincular(null);
      queryClient.invalidateQueries({ queryKey: ['campanhas'] });
      toast.success('Vendedores vinculados à campanha!');
    }
  });

  const handleCriarCampanha = async () => {
    if (!novaCampanha.nome) {
      toast.error('Nome da campanha é obrigatório');
      return;
    }

    const campanha = await criarCampanhaMutation.mutateAsync();
    
    if (clientesSelecionados.length > 0) {
      await vincularClientesMutation.mutateAsync(campanha.id);
    }
    
    if (vendedoresSelecionados.length > 0) {
      await vincularVendedoresMutation.mutateAsync(campanha.id);
    }
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campanhas</h1>
          <p className="text-muted-foreground">Gerencie campanhas de contato e vendas</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Campanha
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Nova Campanha</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome da Campanha</Label>
                <Input
                  id="nome"
                  value={novaCampanha.nome}
                  onChange={(e) => setNovaCampanha({ ...novaCampanha, nome: e.target.value })}
                  placeholder="Ex: Aniversariantes de Janeiro"
                />
              </div>

              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={novaCampanha.descricao}
                  onChange={(e) => setNovaCampanha({ ...novaCampanha, descricao: e.target.value })}
                  placeholder="Descreva o objetivo da campanha"
                />
              </div>

              <div>
                <Label htmlFor="tipo">Tipo de Campanha</Label>
                <Select
                  value={novaCampanha.tipo}
                  onValueChange={(value: any) => setNovaCampanha({ ...novaCampanha, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aniversario">Aniversariantes</SelectItem>
                    <SelectItem value="produto">Por Produto</SelectItem>
                    <SelectItem value="custom">Personalizada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Clientes ({clientesSelecionados.length} selecionados)</Label>
                <div className="border rounded-md p-4 max-h-60 overflow-y-auto space-y-2">
                  {filtrarClientesPorTipo().map((cliente: any) => (
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
                        {cliente.nome_completo || 'Sem nome'} - {cliente.telefone}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Vendedores ({vendedoresSelecionados.length} selecionados)</Label>
                <div className="border rounded-md p-4 max-h-40 overflow-y-auto space-y-2">
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

              <Button 
                onClick={handleCriarCampanha} 
                disabled={criarCampanhaMutation.isPending}
                className="w-full"
              >
                Criar Campanha
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

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
