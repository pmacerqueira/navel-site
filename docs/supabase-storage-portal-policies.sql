-- =============================================================================
-- Navel — Storage «documentos»: portal (upload para todos, só admin apaga)
-- =============================================================================
-- Executar no SQL Editor do projecto Supabase (após bucket documentos existir).
--
-- Comportamento:
--   - Qualquer utilizador autenticado: SELECT (listar / download) e INSERT (upload)
--   - Apenas comercial@navel.pt (JWT): UPDATE (substituir) e DELETE
--
-- O site usa upsert só para admin; utilizadores normais fazem upload sem
-- sobrescrever (cliente com upsert: false).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_admin_documentos()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((auth.jwt()->>'email') = 'comercial@navel.pt', false);
$$;

DROP POLICY IF EXISTS "Authenticated read documentos" ON storage.objects;
CREATE POLICY "Authenticated read documentos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'documentos');

DROP POLICY IF EXISTS "Admin upload documentos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated insert documentos" ON storage.objects;
CREATE POLICY "Authenticated insert documentos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'documentos');

DROP POLICY IF EXISTS "Admin select documentos" ON storage.objects;

DROP POLICY IF EXISTS "Admin update documentos" ON storage.objects;
CREATE POLICY "Admin update documentos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'documentos' AND public.is_admin_documentos())
  WITH CHECK (bucket_id = 'documentos');

DROP POLICY IF EXISTS "Admin delete documentos" ON storage.objects;
CREATE POLICY "Admin delete documentos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'documentos' AND public.is_admin_documentos());
