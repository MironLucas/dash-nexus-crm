-- Criar sequência para id_users se não existir
CREATE SEQUENCE IF NOT EXISTS users_id_users_seq;

-- Definir o valor padrão para id_users usando a sequência
ALTER TABLE public.users 
ALTER COLUMN id_users SET DEFAULT nextval('users_id_users_seq')::numeric;

-- Vincular a sequência à coluna
ALTER SEQUENCE users_id_users_seq OWNED BY public.users.id_users;