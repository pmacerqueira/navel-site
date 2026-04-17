-- =============================================================================
-- Correcção: "permission denied for table users" ao ler public.profiles
-- =============================================================================
-- Sintoma no site: "Não foi possível ler o perfil: permission denied for table users"
--
-- Causa: uma política RLS em profiles (muito frequentemente "Admin can read all"
-- antiga) usa subconsulta a auth.users. O role authenticated NÃO pode ler
-- auth.users; o Postgres avalia todas as políticas permissivas e a expressão
-- falha, abortando o SELECT mesmo para o próprio utilizador.
--
-- Solução: recriar as políticas de admin SEM auth.users — só JWT, como no
-- setup actual. Executar no SQL Editor → Run (projecto correcto).
-- =============================================================================

DROP POLICY IF EXISTS "Admin can read all" ON public.profiles;
CREATE POLICY "Admin can read all"
  ON public.profiles FOR SELECT
  USING ((auth.jwt()->>'email') = 'comercial@navel.pt');

DROP POLICY IF EXISTS "Admin can update approved" ON public.profiles;
CREATE POLICY "Admin can update approved"
  ON public.profiles FOR UPDATE
  USING ((auth.jwt()->>'email') = 'comercial@navel.pt')
  WITH CHECK (true);

-- Garantir leitura do próprio perfil (recriar por segurança)
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Função usada nas políticas de Storage: remover leitura a auth.users (mesmo padrão)
CREATE OR REPLACE FUNCTION public.is_admin_documentos()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((auth.jwt()->>'email') = 'comercial@navel.pt', false);
$$;
