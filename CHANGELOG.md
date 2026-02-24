# Changelog — navel-site

## [0.2.0] — 2026-02-22

### Responsividade (mobile, tablet, landscape/portrait)
- **Hero em landscape mobile:** layout muda para linha (texto + animação lado a lado) em vez de coluna, para caber no viewport estreito em altura; título, lead e botões ajustados
- **Botões flutuantes (WhatsApp + N) em landscape:** reduzidos para 36×36px e reposicionados para não tapar conteúdo quando o ecrã está deitado
- **Tooltips em touch/mobile:** ocultos em ecrãs ≤1024px — sem estado hover real em dispositivos de toque
- **Menu de navegação em landscape:** `max-height: 100dvh` + `overflow-y: auto` — itens acessíveis por scroll quando o menu excede a altura do ecrã em landscape
- **Cookie consent em landscape:** compacto (padding mínimo, uma linha, texto mais pequeno) para não ocultar conteúdo na parte inferior
- **Botão flutuante — secção hero:** `padding-block` reduzido para `space-sm` em landscape ≤900px
- **Auth card:** padding reduzido de `space-2xl` → `space-lg` em mobile (≤640px)
- **Section auth:** padding vertical reduzido em mobile
- **FAQ:** `max-height` do item expandido aumentado de 300px → 600px (evitar corte em respostas longas)
- **Página de Marcas:** grid forçado para 2 colunas em mobile (≤560px) em vez de 1 cartão enorme
- **Área Reservada — folder input:** `min-width: 0` em ecrãs estreitos (≤480px) para evitar overflow
- **Newsletter footer input:** `min-width` removido em ecrãs ≤480px
- **Card base:** padding reduzido em ecrãs ≤400px (`space-xl` → `space-lg`)
- **Container:** `padding-inline` reduzido em ecrãs ≤400px para melhor uso do espaço
- **Milwaukee hero:** padding reduzido em landscape
- **Page hero lead:** font-size escalado para `0.95rem` em mobile (≤640px)
- **`doc-list__name`:** `word-break` alterado de `break-all` para `break-word` + `overflow-wrap: break-word` (menos agressivo)

---

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
