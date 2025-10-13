-- Converter tipo e adicionar foreign keys verificando se já existem

-- Converter id_product na tabela itens de numeric para bigint
DO $$
BEGIN
    -- Só altera se o tipo ainda não for bigint
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'itens' 
        AND column_name = 'id_product' 
        AND data_type = 'numeric'
    ) THEN
        ALTER TABLE public.itens
        ALTER COLUMN id_product TYPE bigint USING id_product::bigint;
    END IF;
END $$;

-- Verificar e adicionar foreign key de orders para customers se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_orders_customers'
        AND table_name = 'orders'
    ) THEN
        ALTER TABLE public.orders
        ADD CONSTRAINT fk_orders_customers
        FOREIGN KEY (id_client)
        REFERENCES public.customers(id_client)
        ON DELETE CASCADE;
    END IF;
END $$;

-- Verificar e adicionar foreign key de itens para orders se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_itens_orders'
        AND table_name = 'itens'
    ) THEN
        ALTER TABLE public.itens
        ADD CONSTRAINT fk_itens_orders
        FOREIGN KEY (id_order)
        REFERENCES public.orders(id_order)
        ON DELETE CASCADE;
    END IF;
END $$;

-- Verificar e adicionar foreign key de itens para products se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_itens_products'
        AND table_name = 'itens'
    ) THEN
        ALTER TABLE public.itens
        ADD CONSTRAINT fk_itens_products
        FOREIGN KEY (id_product)
        REFERENCES public.products(id_product)
        ON DELETE CASCADE;
    END IF;
END $$;