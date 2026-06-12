-- =============================================================================
-- Legado — substituído por docs/supabase-security-hardening-2026-02.sql
-- =============================================================================
-- O conteúdo antigo recriava só «Admin can read all» e partia o padrão actual
-- (política SELECT única «profiles_select_own_or_admin»).
--
-- Para corrigir lista de pendentes vazia ou políticas antigas, execute no SQL Editor:
--   docs/supabase-security-hardening-2026-02.sql
-- ou o bloco RLS completo em docs/supabase-setup.sql
-- =============================================================================

SELECT 'Execute docs/supabase-security-hardening-2026-02.sql em vez deste ficheiro.' AS instruction;
