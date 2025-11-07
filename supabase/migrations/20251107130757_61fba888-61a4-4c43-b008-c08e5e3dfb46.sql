-- Criar enum para tipo de campanha
CREATE TYPE tipo_campanha AS ENUM ('aniversario', 'produto', 'custom');

-- Criar enum para status de campanha_clientes
CREATE TYPE status_campanha AS ENUM ('pendente', 'contatado', 'convertido');

-- Criar tabela de campanhas
CREATE TABLE public.campanhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo tipo_campanha NOT NULL DEFAULT 'custom',
  criterios JSONB DEFAULT '{}'::jsonb,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de campanha_vendedores (relacionamento N:N entre campanhas e vendedores)
CREATE TABLE public.campanha_vendedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campanha_id UUID NOT NULL REFERENCES public.campanhas(id) ON DELETE CASCADE,
  vendedor_id BIGINT NOT NULL REFERENCES public.vendedores(vendedor) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(campanha_id, vendedor_id)
);

-- Criar tabela de campanha_clientes (relacionamento N:N entre campanhas e clientes)
CREATE TABLE public.campanha_clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campanha_id UUID NOT NULL REFERENCES public.campanhas(id) ON DELETE CASCADE,
  cliente_id BIGINT NOT NULL REFERENCES public.customers(id_client) ON DELETE CASCADE,
  status status_campanha NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(campanha_id, cliente_id)
);

-- Habilitar RLS nas tabelas
ALTER TABLE public.campanhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campanha_vendedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campanha_clientes ENABLE ROW LEVEL SECURITY;

-- Políticas para campanhas
CREATE POLICY "Admins e gerentes podem ver todas as campanhas"
ON public.campanhas
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'gerente')
  )
);

CREATE POLICY "Admins e gerentes podem criar campanhas"
ON public.campanhas
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'gerente')
  )
);

CREATE POLICY "Admins e gerentes podem atualizar campanhas"
ON public.campanhas
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'gerente')
  )
);

-- Políticas para campanha_vendedores
CREATE POLICY "Admins e gerentes podem gerenciar vendedores de campanhas"
ON public.campanha_vendedores
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'gerente')
  )
);

CREATE POLICY "Vendedores podem ver suas próprias campanhas"
ON public.campanha_vendedores
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.vendedores
    WHERE vendedores.user_id = auth.uid()
    AND vendedores.vendedor = campanha_vendedores.vendedor_id
  )
);

-- Políticas para campanha_clientes
CREATE POLICY "Admins e gerentes podem gerenciar clientes de campanhas"
ON public.campanha_clientes
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'gerente')
  )
);

CREATE POLICY "Vendedores podem ver clientes das suas campanhas"
ON public.campanha_clientes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.campanha_vendedores cv
    JOIN public.vendedores v ON v.vendedor = cv.vendedor_id
    WHERE v.user_id = auth.uid()
    AND cv.campanha_id = campanha_clientes.campanha_id
  )
);

CREATE POLICY "Vendedores podem atualizar status dos clientes das suas campanhas"
ON public.campanha_clientes
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.campanha_vendedores cv
    JOIN public.vendedores v ON v.vendedor = cv.vendedor_id
    WHERE v.user_id = auth.uid()
    AND cv.campanha_id = campanha_clientes.campanha_id
  )
);

-- Criar índices para melhorar performance
CREATE INDEX idx_campanhas_tipo ON public.campanhas(tipo);
CREATE INDEX idx_campanhas_ativo ON public.campanhas(ativo);
CREATE INDEX idx_campanha_vendedores_campanha ON public.campanha_vendedores(campanha_id);
CREATE INDEX idx_campanha_vendedores_vendedor ON public.campanha_vendedores(vendedor_id);
CREATE INDEX idx_campanha_clientes_campanha ON public.campanha_clientes(campanha_id);
CREATE INDEX idx_campanha_clientes_cliente ON public.campanha_clientes(cliente_id);
CREATE INDEX idx_campanha_clientes_status ON public.campanha_clientes(status);

-- Trigger para atualizar updated_at em campanhas
CREATE TRIGGER update_campanhas_updated_at
BEFORE UPDATE ON public.campanhas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar updated_at em campanha_clientes
CREATE TRIGGER update_campanha_clientes_updated_at
BEFORE UPDATE ON public.campanha_clientes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();