import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Package, TrendingUp, ShoppingCart, DollarSign, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";

const Produtos = () => {
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [categoryFilter, setCategoryFilter] = useState("todas");
  
  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products' as any)
        .select('*')
        .order('id_product', { ascending: false });
      if (error) throw error;
      return data as any[];
    }
  });

  const { data: soldItems } = useQuery({
    queryKey: ['sold-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('itens' as any)
        .select('id_product');
      if (error) throw error;
      return data as any[];
    }
  });

  const produtosAtivos = products?.filter(p => p.ativo?.toLowerCase() === 'ativo').length || 0;
  const estoqueTotal = products?.reduce((sum, p) => sum + Number(p.estoque || 0), 0) || 0;
  const produtosVendidos = soldItems?.length || 0;
  const valorTotalEstoque = products?.reduce((sum, p) => {
    const estoque = Number(p.estoque || 0);
    const preco = Number(p.preco || 0);
    return sum + (estoque * preco);
  }, 0) || 0;

  const categories = useMemo(() => {
    const cats = new Set(products?.map(p => p.categoria).filter(Boolean));
    return Array.from(cats);
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    
    return products.filter(product => {
      const matchesSearch = 
        product.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.categoria?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = 
        statusFilter === "todos" || 
        (statusFilter === "ativo" && product.ativo?.toLowerCase() === 'ativo') ||
        (statusFilter === "inativo" && product.ativo?.toLowerCase() !== 'ativo');
      
      const matchesCategory = 
        categoryFilter === "todas" || 
        product.categoria === categoryFilter;
      
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [products, searchTerm, statusFilter, categoryFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Produtos</h1>
          <p className="text-muted-foreground">Gerencie seu catálogo de produtos</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo Produto
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos Ativos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{produtosAtivos}</div>
            <p className="text-xs text-muted-foreground">
              de {products?.length || 0} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estoque Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estoqueTotal}</div>
            <p className="text-xs text-muted-foreground">unidades</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos Vendidos</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{produtosVendidos}</div>
            <p className="text-xs text-muted-foreground">itens vendidos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {valorTotalEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">valor do estoque</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Produtos</CardTitle>
          <div className="flex gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, SKU ou categoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ativo">Ativos</SelectItem>
                <SelectItem value="inativo">Inativos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Carregando produtos...</p>
          ) : filteredProducts && filteredProducts.length > 0 ? (
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Mostrando {filteredProducts.length} de {products?.length || 0} produtos
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Título</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Estoque</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow 
                    key={product.id_product}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedProduct(product)}
                  >
                    <TableCell className="font-medium">{product.sku}</TableCell>
                    <TableCell>{product.titulo}</TableCell>
                    <TableCell>{product.categoria}</TableCell>
                    <TableCell>
                      R$ {Number(product.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>{product.estoque}</TableCell>
                    <TableCell>
                      <Badge variant={product.ativo?.toLowerCase() === 'ativo' ? 'default' : 'secondary'}>
                        {product.ativo || 'Inativo'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          ) : (
            <p className="text-muted-foreground">Nenhum produto encontrado.</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedProduct?.titulo}</DialogTitle>
          </DialogHeader>
          
          {selectedProduct && (
            <div className="space-y-4">
              {selectedProduct.imagem && (
                <div className="w-full aspect-video relative bg-muted rounded-lg overflow-hidden">
                  <img 
                    src={selectedProduct.imagem} 
                    alt={selectedProduct.titulo}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">SKU</p>
                  <p className="font-medium">{selectedProduct.sku || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Categoria</p>
                  <p className="font-medium">{selectedProduct.categoria || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Preço</p>
                  <p className="font-medium">R$ {Number(selectedProduct.preco || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estoque</p>
                  <p className="font-medium">{selectedProduct.estoque || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={selectedProduct.ativo?.toLowerCase() === 'ativo' ? 'default' : 'secondary'}>
                    {selectedProduct.ativo || 'Inativo'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tags</p>
                  <p className="font-medium">{selectedProduct.tags || '-'}</p>
                </div>
              </div>

              {selectedProduct.variante1 && (
                <div>
                  <p className="text-sm text-muted-foreground">Variante 1</p>
                  <p className="font-medium">{selectedProduct.variante1}</p>
                </div>
              )}

              {selectedProduct.variante2 && (
                <div>
                  <p className="text-sm text-muted-foreground">Variante 2</p>
                  <p className="font-medium">{selectedProduct.variante2}</p>
                </div>
              )}

              {selectedProduct.descricao && (
                <div>
                  <p className="text-sm text-muted-foreground">Descrição</p>
                  <p className="text-sm">{selectedProduct.descricao}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Produtos;
