-- =============================================================================
-- NAVEL Supabase — Security + Performance hardening (Security Advisor 2026-02)
-- =============================================================================
-- Aplicado remotamente ao projecto de produção via migrações Supabase:
--   harden_profiles_rls_and_functions
--   fix_profiles_rls_auth_jwt_initplan
--
-- Este ficheiro é a cópia *idempotente* para:
--   - novos ambientes / reproducibilidade
--   - SQL Editor manual se precisares de reaplicar
--
-- Resolve (DB):
--   - function_search_path_mutable em is_admin_documentos
--   - rls_policy_always_true (WITH CHECK true no UPDATE admin)
--   - anon/authenticated EXECUTE em handle_new_user (só trigger; não RPC)
--   - authenticated EXECUTE em keep_alive_ping (mantém anon para cron PHP)
--   - auth_rls_initplan + multiple_permissive_policies em profiles
--
-- O modelo de acesso do keep-alive (função SECURITY INVOKER + RLS na tabela
-- supabase_keepalive_heartbeats) vive em docs/supabase-keep-alive-rpc.sql —
-- este ficheiro já não toca nessa tabela (2026-06-12).
--
-- NÃO resolve via SQL (activar no dashboard):
--   - Leaked password protection (HaveIBeenPwned) — ver docs/SUPABASE.md
-- =============================================================================

-- --- is_admin_documentos ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin_documentos()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE((auth.jwt()->>'email') = 'comercial@navel.pt', false);
$$;

-- --- profiles RLS (uma política SELECT; UPDATE com WITH CHECK correcto) ------
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can read all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "Admin can update approved" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_update_approved" ON public.profiles;

CREATE POLICY "profiles_select_own_or_admin"
  ON public.profiles FOR SELECT
  USING (
    (SELECT auth.uid()) = id
    OR ((SELECT auth.jwt()) ->> 'email') = 'comercial@navel.pt'
  );

CREATE POLICY "profiles_admin_update_approved"
  ON public.profiles FOR UPDATE
  USING (((SELECT auth.jwt()) ->> 'email') = 'comercial@navel.pt')
  WITH CHECK (((SELECT auth.jwt()) ->> 'email') = 'comercial@navel.pt');

-- --- handle_new_user: não expor como RPC -----------------------------------
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated;

-- --- keep_alive: só anon (e service_role pelo default do owner) ------------
-- Condicional: em ambientes onde o keep-alive ainda não foi criado, um REVOKE
-- directo abortava o script inteiro e o hardening de profiles nunca aplicava.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'keep_alive_ping'
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.keep_alive_ping() FROM authenticated;
  END IF;
END
$$;
