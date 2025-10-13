-- Converter tipo da coluna vendedor na tabela orders para bigint
ALTER TABLE public.orders
ALTER COLUMN vendedor TYPE bigint USING vendedor::bigint;

-- Converter tipo da coluna vendedor na tabela vendedores para bigint  
ALTER TABLE public.vendedores
ALTER COLUMN vendedor TYPE bigint USING vendedor::bigint;

-- Adicionar primary key na tabela vendedores se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_type = 'PRIMARY KEY'
        AND table_name = 'vendedores'
    ) THEN
        ALTER TABLE public.vendedores
        ADD PRIMARY KEY (vendedor);
    END IF;
END $$;

-- Foreign key de orders para vendedores
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_orders_vendedores'
        AND table_name = 'orders'
    ) THEN
        ALTER TABLE public.orders
        ADD CONSTRAINT fk_orders_vendedores
        FOREIGN KEY (vendedor)
        REFERENCES public.vendedores(vendedor)
        ON DELETE SET NULL;
    END IF;
END $$;

-- Habilitar RLS na tabela vendedores
ALTER TABLE public.vendedores ENABLE ROW LEVEL SECURITY;

-- Criar política de leitura pública
CREATE POLICY "Permitir leitura de vendedores"
ON public.vendedores
FOR SELECT
USING (true);