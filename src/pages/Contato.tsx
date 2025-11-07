import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, Phone } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const Contato = () => {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [vendedorId, setVendedorId] = useState<number | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        
        // Buscar o vendedor vinculado a este usuário
        const { data: vendedorData } = await supabase
          .from('vendedores' as any)
          .select('vendedor')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (vendedorData) {
          setVendedorId(vendedorData.vendedor);
        }
      }
    };

    fetchUser();
  }, []);

  // Buscar campanhas vinculadas ao vendedor
  const { data: campanhas, isLoading } = useQuery({
    queryKey: ['contatos-campanhas', vendedorId],
    queryFn: async () => {
      if (!vendedorId) return [];
      
      const { data, error } = await supabase
        .from('campanha_vendedores' as any)
        .select(`
          *,
          campanhas:campanha_id (
            id,
            nome,
            descricao,
            tipo
          )
        `)
        .eq('vendedor_id', vendedorId);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!vendedorId
  });

  // Buscar clientes de cada campanha
  const { data: clientesPorCampanha } = useQuery({
    queryKey: ['clientes-campanhas', campanhas],
    queryFn: async () => {
      if (!campanhas || campanhas.length === 0) return {};
      
      const campanhaIds = campanhas.map((c: any) => c.campanha_id);
      
      const { data, error } = await supabase
        .from('campanha_clientes' as any)
        .select(`
          *,
          customers:cliente_id (
            id_client,
            nome_completo,
            telefone,
            email,
            aniversario
          )
        `)
        .in('campanha_id', campanhaIds);
      
      if (error) throw error;
      
      // Agrupar por campanha
      const grouped = (data || []).reduce((acc: any, item: any) => {
        if (!acc[item.campanha_id]) {
          acc[item.campanha_id] = [];
        }
        acc[item.campanha_id].push(item);
        return acc;
      }, {});
      
      return grouped;
    },
    enabled: !!campanhas && campanhas.length > 0
  });

  const marcarContatadoMutation = useMutation({
    mutationFn: async ({ campanhaId, clienteId }: { campanhaId: string; clienteId: number }) => {
      const { error } = await supabase
        .from('campanha_clientes' as any)
        .update({ status: 'contatado' })
        .eq('campanha_id', campanhaId)
        .eq('cliente_id', clienteId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes-campanhas'] });
      toast.success('Cliente marcado como contatado!');
    },
    onError: () => {
      toast.error('Erro ao atualizar status');
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente':
        return <Badge variant="outline">Pendente</Badge>;
      case 'contatado':
        return <Badge variant="secondary">Contatado</Badge>;
      case 'convertido':
        return <Badge variant="default">Convertido</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!vendedorId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contatos</h1>
          <p className="text-muted-foreground">Suas campanhas e leads para contato</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Você não está vinculado a um vendedor.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contatos</h1>
        <p className="text-muted-foreground">Suas campanhas e leads para contato</p>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Carregando campanhas...</p>
          </CardContent>
        </Card>
      ) : campanhas && campanhas.length > 0 ? (
        <div className="space-y-6">
          {campanhas.map((campanha: any) => {
            const clientes = clientesPorCampanha?.[campanha.campanha_id] || [];
            
            return (
              <Card key={campanha.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{campanha.campanhas?.nome}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {campanha.campanhas?.descricao}
                      </p>
                      <Badge className="mt-2" variant="outline">
                        {campanha.campanhas?.tipo === 'aniversario' && 'Aniversariantes'}
                        {campanha.campanhas?.tipo === 'produto' && 'Por Produto'}
                        {campanha.campanhas?.tipo === 'custom' && 'Personalizada'}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{clientes.length}</p>
                      <p className="text-sm text-muted-foreground">Leads</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {clientes.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Telefone</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clientes.map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">
                              {item.customers?.nome_completo || 'N/A'}
                            </TableCell>
                            <TableCell>
                              {item.customers?.telefone || 'N/A'}
                            </TableCell>
                            <TableCell>
                              {item.customers?.email || 'N/A'}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(item.status)}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {item.customers?.telefone && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      window.open(`https://wa.me/55${item.customers.telefone.replace(/\D/g, '')}`, '_blank');
                                    }}
                                  >
                                    <MessageCircle className="h-4 w-4 mr-2" />
                                    WhatsApp
                                  </Button>
                                )}
                                {item.status === 'pendente' && (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => marcarContatadoMutation.mutate({
                                      campanhaId: campanha.campanha_id,
                                      clienteId: item.cliente_id
                                    })}
                                    disabled={marcarContatadoMutation.isPending}
                                  >
                                    Marcar Contatado
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-muted-foreground">Nenhum cliente nesta campanha.</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Você não possui campanhas atribuídas no momento.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Contato;
