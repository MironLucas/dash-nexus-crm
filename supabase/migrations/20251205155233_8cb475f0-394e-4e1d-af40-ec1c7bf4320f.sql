-- Função para executar queries somente leitura (SELECT) de forma segura
CREATE OR REPLACE FUNCTION public.execute_readonly_query(query_text TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  cleaned_query TEXT;
BEGIN
  -- Limpar e validar a query
  cleaned_query := TRIM(query_text);
  
  -- Verificar se começa com SELECT (case insensitive)
  IF NOT (UPPER(cleaned_query) LIKE 'SELECT%') THEN
    RAISE EXCEPTION 'Apenas queries SELECT são permitidas';
  END IF;
  
  -- Verificar se contém comandos perigosos
  IF UPPER(cleaned_query) ~ '(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|GRANT|REVOKE|EXECUTE)' THEN
    RAISE EXCEPTION 'Comando não permitido detectado na query';
  END IF;
  
  -- Executar a query e retornar o primeiro resultado como JSONB
  EXECUTE 'SELECT row_to_json(t)::jsonb FROM (' || cleaned_query || ' LIMIT 1) t'
  INTO result;
  
  RETURN COALESCE(result, '{}'::jsonb);
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao executar query: %', SQLERRM;
END;
$$;

-- Conceder permissão para service_role executar
GRANT EXECUTE ON FUNCTION public.execute_readonly_query(TEXT) TO service_role;