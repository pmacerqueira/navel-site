-- =============================================================================
-- Navel — Configuração Supabase (área reservada)
-- Executar no SQL Editor do Supabase: https://supabase.com/dashboard
-- =============================================================================

-- Tabela de perfis (aprovação manual; admin auto-aprovado)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: criar perfil quando utilizador se regista
-- comercial@navel.pt fica aprovado automaticamente
--
-- IMPORTANTE (Supabase / Postgres 15+): a função deve ser SECURITY DEFINER com
-- search_path fixo. Caso contrário o Auth pode executar o trigger como um role
-- sem acesso a public.profiles e o registo falha com:
-- "Database error saving new user".
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, approved)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    (NEW.email = 'comercial@navel.pt')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS: utilizadores veem o próprio perfil
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Admin: usar email do JWT (o role authenticated não pode ler auth.users em RLS)
DROP POLICY IF EXISTS "Admin can read all" ON profiles;
CREATE POLICY "Admin can read all"
  ON profiles FOR SELECT
  USING ((auth.jwt()->>'email') = 'comercial@navel.pt');

DROP POLICY IF EXISTS "Admin can update approved" ON profiles;
CREATE POLICY "Admin can update approved"
  ON profiles FOR UPDATE
  USING ((auth.jwt()->>'email') = 'comercial@navel.pt')
  WITH CHECK (true);

-- =============================================================================
-- Storage: bucket documentos (catálogos, tabelas de preços, manuais)
-- =============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos', 'documentos', false)
ON CONFLICT (id) DO NOTHING;

-- Função auxiliar: admin comercial (só JWT — nunca consultar auth.users aqui:
-- o role authenticated não tem permissão e pode rebentar RLS/Storage noutros fluxos)
CREATE OR REPLACE FUNCTION public.is_admin_documentos()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((auth.jwt()->>'email') = 'comercial@navel.pt', false);
$$;

-- Storage portal: leitura + upload para todos autenticados; UPDATE/DELETE só admin
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
