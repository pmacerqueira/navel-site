-- =============================================================================
-- Correcção: registo falha com "Database error saving new user"
-- =============================================================================
-- Este erro vem do Supabase Auth quando o trigger em auth.users falha ao
-- inserir em public.profiles (ver logs: Postgres ou Auth no dashboard).
--
-- Causas frequentes:
--   - Função do trigger sem SECURITY DEFINER (Postgres 15+ assume INVOKER)
--   - search_path ambíguo (INSERT não encontra public.profiles)
--   - Tabela profiles inexistente ou colunas incompatíveis
--
-- Executar no SQL Editor do projeto (Run). É idempotente (CREATE OR REPLACE).
-- =============================================================================

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
