-- =============================================================================
-- Navel — Correção RLS Storage (erro "new row violates row-level security policy")
-- Executar no SQL Editor do Supabase: https://supabase.com/dashboard
-- =============================================================================

-- Função auxiliar: verifica se o utilizador é o admin (comercial@navel.pt)
CREATE OR REPLACE FUNCTION public.is_admin_documentos()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'comercial@navel.pt',
    (auth.jwt()->>'email') = 'comercial@navel.pt',
    false
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Remover políticas antigas e criar novas
DROP POLICY IF EXISTS "Admin upload documentos" ON storage.objects;
DROP POLICY IF EXISTS "Admin select documentos" ON storage.objects;
DROP POLICY IF EXISTS "Admin update documentos" ON storage.objects;

-- Política: admin pode fazer upload (INSERT)
CREATE POLICY "Admin upload documentos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'documentos' AND public.is_admin_documentos());

-- Política: admin pode ler (necessário para upsert verificar ficheiro existente)
CREATE POLICY "Admin select documentos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'documentos' AND public.is_admin_documentos());

-- Política: admin pode atualizar/substituir ficheiros (UPDATE — necessário para upsert)
CREATE POLICY "Admin update documentos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'documentos' AND public.is_admin_documentos())
  WITH CHECK (bucket_id = 'documentos');
