-- Habilitar RLS para as tabelas existentes
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens ENABLE ROW LEVEL SECURITY;

-- Criar políticas para permitir leitura pública (temporário para desenvolvimento)
-- IMPORTANTE: Ajuste essas políticas conforme suas necessidades de segurança

CREATE POLICY "Permitir leitura de clientes"
ON public.customers
FOR SELECT
USING (true);

CREATE POLICY "Permitir leitura de pedidos"
ON public.orders
FOR SELECT
USING (true);

CREATE POLICY "Permitir leitura de produtos"
ON public.products
FOR SELECT
USING (true);

CREATE POLICY "Permitir leitura de itens"
ON public.itens
FOR SELECT
USING (true);