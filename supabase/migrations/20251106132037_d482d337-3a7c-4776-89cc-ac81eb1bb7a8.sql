-- Adicionar campo user_id na tabela vendedores para vincular com usuários do sistema
ALTER TABLE public.vendedores 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Criar índice para melhor performance nas consultas
CREATE INDEX IF NOT EXISTS idx_vendedores_user_id ON public.vendedores(user_id);

COMMENT ON COLUMN public.vendedores.user_id IS 'ID do usuário do sistema vinculado a este vendedor';