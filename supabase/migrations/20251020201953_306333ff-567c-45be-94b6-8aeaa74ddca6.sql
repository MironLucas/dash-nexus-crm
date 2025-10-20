-- Add DELETE policy for users table to allow deleting via REST API
-- Drop old policy if exists and create new one
drop policy if exists "Permitir exclusão de usuários" on public.users;

create policy "Permitir exclusão de usuários"
  on public.users
  for delete
  using (true);
