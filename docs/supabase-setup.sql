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
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, approved)
  VALUES (
    NEW.id,
    NEW.email,
    (NEW.email = 'comercial@navel.pt')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- RLS: utilizadores veem o próprio perfil
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admin can read all" ON profiles;
CREATE POLICY "Admin can read all"
  ON profiles FOR SELECT
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'comercial@navel.pt'
  );

DROP POLICY IF EXISTS "Admin can update approved" ON profiles;
CREATE POLICY "Admin can update approved"
  ON profiles FOR UPDATE
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'comercial@navel.pt'
  )
  WITH CHECK (true);

-- =============================================================================
-- Storage: bucket documentos (catálogos, tabelas de preços, manuais)
-- =============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos', 'documentos', false)
ON CONFLICT (id) DO NOTHING;

-- Política: utilizadores autenticados podem ler (download)
DROP POLICY IF EXISTS "Authenticated read documentos" ON storage.objects;
CREATE POLICY "Authenticated read documentos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'documentos');

-- Política: admin pode fazer upload
DROP POLICY IF EXISTS "Admin upload documentos" ON storage.objects;
CREATE POLICY "Admin upload documentos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documentos' AND
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'comercial@navel.pt'
  );
