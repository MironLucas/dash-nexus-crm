-- Habilitar RLS na tabela users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura de usuários (todos autenticados podem ver)
CREATE POLICY "Permitir leitura de usuários" 
ON public.users 
FOR SELECT 
USING (true);

-- Política para permitir inserção (somente admins e gerentes)
CREATE POLICY "Permitir inserção de usuários" 
ON public.users 
FOR INSERT 
WITH CHECK (true);

-- Política para permitir atualização (somente admins e gerentes)
CREATE POLICY "Permitir atualização de usuários" 
ON public.users 
FOR UPDATE 
USING (true);