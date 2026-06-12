-- =============================================================================
-- Legado — substituído por docs/supabase-security-hardening-2026-02.sql
-- =============================================================================
-- Este ficheiro recriava políticas antigas («Users can read own profile» +
-- «Admin can read all») e is_admin_documentos sem search_path fixo.
--
-- Para corrigir permission denied em profiles ou alinhar com o projecto actual:
--   docs/supabase-security-hardening-2026-02.sql
-- =============================================================================

SELECT 'Execute docs/supabase-security-hardening-2026-02.sql em vez deste ficheiro.' AS instruction;
