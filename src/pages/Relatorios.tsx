import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileBarChart, Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type FilterType = "pedidos" | "produtos" | "clientes" | "vendedores";

const Relatorios = () => {
  const [selectedFilter, setSelectedFilter] = useState<FilterType>("pedidos");
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  // Fetch orders
  const { data: orders, isLoading: loadingOrders } = useQuery({
    queryKey: ['orders-report'],
    queryFn: async () => {
      const { data, error } = await supabase.from('orders').select('*');
      if (error) throw error;
      return data;
    },
    enabled: selectedFilter === "pedidos"
  });

  // Fetch products
  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ['products-report'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*');
      if (error) throw error;
      return data;
    },
    enabled: selectedFilter === "produtos"
  });

  // Fetch customers
  const { data: customers, isLoading: loadingCustomers } = useQuery({
    queryKey: ['customers-report'],
    queryFn: async () => {
      const { data, error } = await supabase.from('customers').select('*');
      if (error) throw error;
      return data;
    },
    enabled: selectedFilter === "clientes"
  });

  // Fetch vendedores
  const { data: vendedores, isLoading: loadingVendedores } = useQuery({
    queryKey: ['vendedores-report'],
    queryFn: async () => {
      const { data, error } = await supabase.from('vendedores').select('*');
      if (error) throw error;
      return data;
    },
    enabled: selectedFilter === "vendedores"
  });

  const isLoading = loadingOrders || loadingProducts || loadingCustomers || loadingVendedores;

  const handleExport = () => {
    setExporting(true);
    try {
      let data: any[] = [];
      let filename = "";
      let headers: string[] = [];

      switch (selectedFilter) {
        case "pedidos":
          data = orders || [];
          filename = "pedidos.csv";
          headers = ["ID", "Cliente", "Vendedor", "Data", "Valor Total", "Valor Final", "Status", "Canal"];
          break;
        case "produtos":
          data = products || [];
          filename = "produtos.csv";
          headers = ["ID", "SKU", "Título", "Categoria", "Preço", "Estoque", "Ativo"];
          break;
        case "clientes":
          data = customers || [];
          filename = "clientes.csv";
          headers = ["ID", "Nome", "Email", "Telefone", "Cidade", "Estado", "Aniversário"];
          break;
        case "vendedores":
          data = vendedores || [];
          filename = "vendedores.csv";
          headers = ["ID", "Nome"];
          break;
      }

      if (data.length === 0) {
        toast({
          title: "Sem dados",
          description: "Não há dados para exportar.",
          variant: "destructive"
        });
        setExporting(false);
        return;
      }

      // Create CSV content
      let csvContent = headers.join(";") + "\n";
      
      data.forEach((item) => {
        let row: string[] = [];
        switch (selectedFilter) {
          case "pedidos":
            row = [
              item.id_order?.toString() || "",
              item.id_client?.toString() || "",
              item.vendedor?.toString() || "",
              item.data_pedido || "",
              item.valor_total?.toString() || "",
              item.valor_final?.toString() || "",
              item.status || "",
              item.canal_venda || ""
            ];
            break;
          case "produtos":
            row = [
              item.id_product?.toString() || "",
              item.sku || "",
              item.titulo || "",
              item.categoria || "",
              item.preco?.toString() || "",
              item.estoque || "",
              item.ativo || ""
            ];
            break;
          case "clientes":
            row = [
              item.id_client?.toString() || "",
              item.nome_completo || "",
              item.email || "",
              item.telefone || "",
              item.cidade || "",
              item.estado || "",
              item.aniversario || ""
            ];
            break;
          case "vendedores":
            row = [
              item.vendedor?.toString() || "",
              item.nomevendedor || ""
            ];
            break;
        }
        csvContent += row.map(cell => `"${cell}"`).join(";") + "\n";
      });

      // Download file
      const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Exportação concluída",
        description: `Arquivo ${filename} baixado com sucesso.`
      });
    } catch (error) {
      toast({
        title: "Erro na exportação",
        description: "Ocorreu um erro ao exportar os dados.",
        variant: "destructive"
      });
    }
    setExporting(false);
  };

  const getFilterLabel = (filter: FilterType) => {
    switch (filter) {
      case "pedidos": return "Pedidos";
      case "produtos": return "Produtos";
      case "clientes": return "Clientes";
      case "vendedores": return "Vendedores";
    }
  };

  const getCurrentData = () => {
    switch (selectedFilter) {
      case "pedidos": return orders || [];
      case "produtos": return products || [];
      case "clientes": return customers || [];
      case "vendedores": return vendedores || [];
    }
  };

  const renderTableContent = () => {
    const data = getCurrentData();

    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (data.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum registro encontrado.
        </div>
      );
    }

    switch (selectedFilter) {
      case "pedidos":
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Valor Final</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data as any[]).slice(0, 10).map((item) => (
                <TableRow key={item.id_order}>
                  <TableCell>{item.id_order}</TableCell>
                  <TableCell>{item.id_client}</TableCell>
                  <TableCell>{item.data_pedido ? new Date(item.data_pedido).toLocaleDateString('pt-BR') : '-'}</TableCell>
                  <TableCell>R$ {Number(item.valor_final || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell>{item.status || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );
      case "produtos":
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Ativo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data as any[]).slice(0, 10).map((item) => (
                <TableRow key={item.id_product}>
                  <TableCell>{item.id_product}</TableCell>
                  <TableCell>{item.titulo || '-'}</TableCell>
                  <TableCell>{item.categoria || '-'}</TableCell>
                  <TableCell>R$ {Number(item.preco || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell>{item.ativo || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );
      case "clientes":
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Cidade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data as any[]).slice(0, 10).map((item) => (
                <TableRow key={item.id_client}>
                  <TableCell>{item.id_client}</TableCell>
                  <TableCell>{item.nome_completo || '-'}</TableCell>
                  <TableCell>{item.email || '-'}</TableCell>
                  <TableCell>{item.telefone || '-'}</TableCell>
                  <TableCell>{item.cidade || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );
      case "vendedores":
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nome</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data as any[]).slice(0, 10).map((item) => (
                <TableRow key={item.vendedor}>
                  <TableCell>{item.vendedor}</TableCell>
                  <TableCell>{item.nomevendedor || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground">Exporte dados do sistema</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <FileBarChart className="h-5 w-5" />
              Exportar Dados
            </CardTitle>
            <div className="flex gap-2">
              <Select value={selectedFilter} onValueChange={(value: FilterType) => setSelectedFilter(value)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pedidos">Pedidos</SelectItem>
                  <SelectItem value="produtos">Produtos</SelectItem>
                  <SelectItem value="clientes">Clientes</SelectItem>
                  <SelectItem value="vendedores">Vendedores</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleExport} disabled={exporting || isLoading}>
                {exporting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Exportar CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Visualizando: <strong>{getFilterLabel(selectedFilter)}</strong> ({getCurrentData().length} registros)
          </p>
          <div className="border rounded-md">
            {renderTableContent()}
          </div>
          {getCurrentData().length > 10 && (
            <p className="text-xs text-muted-foreground mt-2">
              Mostrando 10 de {getCurrentData().length} registros. Exporte para ver todos.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Relatorios;
