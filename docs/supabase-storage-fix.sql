-- =============================================================================
-- Navel — Correção RLS Storage (portal documentos)
-- Executar no SQL Editor do Supabase: https://supabase.com/dashboard
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_admin_documentos()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public
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
