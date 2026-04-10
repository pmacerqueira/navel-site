-- =============================================================================
-- Keep-alive Supabase — evitar pausa automática do projeto free-tier (~7 dias).
-- Executar no SQL Editor (ou anexar a um deploy SQL): Dashboard → SQL → New query
--
-- O script PHP público/keep-alive-supabase.php:
--   1) POST /rest/v1/rpc/keep_alive_ping  (esta função)
--   2) GET  /auth/v1/health               (actividade no serviço Auth)
--
-- Porque uma tabela + UPDATE: só SELECT 1 pode não ser contabilizado da mesma
-- forma que uma escrita leve na BD; um UPDATE periódico é actividade de Postgres
-- explícita (recomendado em guias comunitários de "pause prevention").
-- =============================================================================

-- Tabela mínima (uma linha). Sem políticas RLS para anon — só a função SECURITY DEFINER toca na tabela.
CREATE TABLE IF NOT EXISTS public.supabase_keepalive_heartbeats (
  id smallint PRIMARY KEY CHECK (id = 1),
  last_ping timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.supabase_keepalive_heartbeats (id, last_ping)
VALUES (1, now())
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.supabase_keepalive_heartbeats ENABLE ROW LEVEL SECURITY;

-- Impedir leitura/escrita directa por roles da aplicação (opcional mas explícito)
REVOKE ALL ON TABLE public.supabase_keepalive_heartbeats FROM anon, authenticated;

-- Se já existia keep_alive_ping() com outro tipo de retorno (ex.: smallint), CREATE OR REPLACE falha.
-- É preciso remover primeiro; os GRANT abaixo voltam a aplicar-se à função nova.
DROP FUNCTION IF EXISTS public.keep_alive_ping();

CREATE OR REPLACE FUNCTION public.keep_alive_ping()
RETURNS timestamptz
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.supabase_keepalive_heartbeats
  SET last_ping = now()
  WHERE id = 1
  RETURNING last_ping;
$$;

REVOKE ALL ON FUNCTION public.keep_alive_ping() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.keep_alive_ping() TO anon;
GRANT EXECUTE ON FUNCTION public.keep_alive_ping() TO authenticated;
GRANT EXECUTE ON FUNCTION public.keep_alive_ping() TO service_role;
