-- =============================================================================
-- Correcção: Admin não vê utilizadores pendentes (lista vazia)
-- =============================================================================
-- As políticas antigas usavam (SELECT email FROM auth.users WHERE id = auth.uid()).
-- O role authenticated não consegue ler auth.users nesse contexto, pelo que a
-- condição falha e o admin só "via" o próprio perfil — nunca os pendentes.
--
-- Substituir por email no JWT (igual ao fallback em is_admin_documentos()).
-- Executar no SQL Editor → Run.
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
