-- Function to get current user's role without exposing user_roles table (bypasses RLS safely)
create or replace function public.get_my_role()
returns app_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.user_roles
  where user_id = auth.uid()
  limit 1
$$;

-- Restrict and grant execution
revoke all on function public.get_my_role() from public;
grant execute on function public.get_my_role() to authenticated;