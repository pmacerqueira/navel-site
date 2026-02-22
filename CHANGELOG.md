# Changelog — navel-site

## [0.1.0] — 2026-02-22

### Novo
- **Área reservada (Supabase):** autenticação, registo com aprovação manual, área de documentos com upload/download
- **Admin:** painel de aprovação de utilizadores em `/admin` (apenas `comercial@navel.pt`)
- **Botão flutuante "N":** ícone Navel flutuante acima do WhatsApp, direciona para o Dashboard AT_Manut; ícone roda continuamente ao hover
- **Mensagem de boas-vindas:** "Bem-vindo, [email] !" na área reservada
- **Script `npm run create-admin`:** cria o utilizador admin automaticamente via service role key

### Corrigido
- Login do admin (`comercial@navel.pt`) agora vai diretamente para a área reservada em vez de "Aguardar aprovação"
- `AguardarAprovacao` redireciona automaticamente o admin para a área reservada
- RLS do Storage corrigido: adicionadas políticas SELECT e UPDATE necessárias para o `upsert` de ficheiros no bucket `documentos`
- Função `public.is_admin_documentos()` criada para resolver falha de verificação de email no contexto do Storage

### Alterado
- `docs/supabase-setup.sql` actualizado com políticas de Storage corrigidas e função auxiliar
- `docs/supabase-storage-fix.sql` criado para aplicar apenas as correcções de RLS
- `scripts/optimize-images.js`: adicionada dimensão máxima para `navel-icon.png` (128px)
- `.env.example` actualizado com `SUPABASE_SERVICE_ROLE_KEY`
- `SETUP-SUPABASE.txt` e `docs/SUPABASE.md` actualizados com opção de script para criar admin

---

## [0.0.1] — inicial

- Versão inicial do website Navel: Home, Produtos, Marcas, Serviços, Catálogos, Contacto, Milwaukee, Sobre, Privacidade
- i18n: Português, English, Español
- Botão WhatsApp flutuante
- Formulário de contacto via PHP (cPanel)
- SEO: sitemap.xml, robots.txt, og:image
- PWA: manifest, ícones
