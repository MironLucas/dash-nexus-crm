-- Adicionar políticas de UPDATE e INSERT para a tabela vendedores
-- Permitir que admins e gerentes possam atualizar vendedores
CREATE POLICY "Admins podem atualizar vendedores"
ON public.vendedores
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'gerente')
  )
);

-- Permitir que admins e gerentes possam inserir vendedores
CREATE POLICY "Admins podem inserir vendedores"
ON public.vendedores
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'gerente')
  )
);