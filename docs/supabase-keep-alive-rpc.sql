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

-- Tabela mínima (uma linha).
CREATE TABLE IF NOT EXISTS public.supabase_keepalive_heartbeats (
  id smallint PRIMARY KEY CHECK (id = 1),
  last_ping timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.supabase_keepalive_heartbeats (id, last_ping)
VALUES (1, now())
ON CONFLICT (id) DO NOTHING;

-- 2026-06-12: função passou a SECURITY INVOKER com políticas RLS explícitas.
-- A versão anterior (SECURITY DEFINER + EXECUTE para anon) levantava o aviso
-- «Public Can Execute SECURITY DEFINER Function» no Security Advisor.
-- Pior abuso possível: actualizar um timestamp — inócuo.

-- Se existia versão antiga com outro tipo de retorno, CREATE OR REPLACE falha.
DROP FUNCTION IF EXISTS public.keep_alive_ping();

CREATE OR REPLACE FUNCTION public.keep_alive_ping()
RETURNS timestamptz
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  UPDATE public.supabase_keepalive_heartbeats
  SET last_ping = now()
  WHERE id = 1
  RETURNING last_ping;
$$;

-- Invoker precisa de privilégios na tabela + políticas RLS.
GRANT SELECT, UPDATE ON TABLE public.supabase_keepalive_heartbeats TO anon;

ALTER TABLE public.supabase_keepalive_heartbeats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Heartbeat row is readable" ON public.supabase_keepalive_heartbeats;
CREATE POLICY "Heartbeat row is readable"
  ON public.supabase_keepalive_heartbeats FOR SELECT
  TO anon
  USING (id = 1);

DROP POLICY IF EXISTS "Heartbeat row can be bumped" ON public.supabase_keepalive_heartbeats;
CREATE POLICY "Heartbeat row can be bumped"
  ON public.supabase_keepalive_heartbeats FOR UPDATE
  TO anon
  USING (id = 1)
  WITH CHECK (id = 1);
