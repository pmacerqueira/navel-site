# Changelog — navel-site

## [0.2.7] — 2026-04-17

### i18n — site público em português (correcção estrutural)

- **Problema:** Com idioma `pt` activo, o **menu** e parte da **área reservada** apareciam em português, mas o **corpo** das páginas institucionais (home, rodapé, contacto, catálogos, etc.) continuava em **inglês** porque `src/locales/pt.json` repetia o conteúdo de `en.json` nessas chaves (só `nav`, `privacy`, `rgpd` e `auth` estavam consistentemente em PT).
- **Solução:** Ficheiro de patch **`scripts/pt-ui-patch-data.mjs`** (textos PT-PT para marketing, CGVS UI, pesquisa, cookies, etc.) e **`scripts/apply-pt-ui-patch.mjs`**, que faz *deep merge* em `pt.json`.
- **Build:** `npm run merge-locales` passa a ser `merge-privacy` → `merge-rgpd` → **`apply-pt-ui-patch`**; `npm run build` mantém `prebuild` → `merge-locales` → Vite. Assim, cada build reaplica o patch PT **depois** de injetar `privacy` / `rgpd`.
- **Operação:** Deploy para produção: `npm run build` → `npm run deploy:all -- --yes` (executado; ~721 KB de assets JS/CSS/HTML novos enviados via FTPS incremental).

### Documentação e roadmap

- Actualizados `README.md`, `DEPLOY.md`, `docs/INDEX.md`, `docs/TROUBLESHOOTING.md`, `docs/OTIMIZACOES.md`, `docs/SETUP.md`, `PUBLICAR-CHECKLIST.txt`, `docs/ROADMAP-SHAREPOINT.md` — fluxo de traduções, troubleshooting “site em inglês com PT”, e **cinco melhorias prioritárias** de qualidade/performance/UI/UX para iteração imediata.

---

## [0.2.6] — 2026-04-17

### Auditoria de sanitização e hardening de segurança

Varredura completa da documentação, ficheiros, código-fonte e superfície de
ataque. `npm audit` = **0 vulnerabilidades** (259 dependências). Correcções
distribuídas por 3 camadas:

#### Limpeza (Fase 1)
- **Removidos** (obsoletos / one-shot / fora de escopo):
  - `temp-rgpd.html` — página RGPD copiada de outro domínio (globalfiltros.pt), sem ligação ao site.
  - `fix-istobal.php` — script one-shot com segredo fraco em claro (`NAVEL-istobal-2026`) e destruição via `GET ?confirm=1`.
  - `scripts/download-brands.js` — apontava para `public/brands/` (caminho errado; o código usa `public/images/brands/`), não registado em `npm run` nem em `OPTIMIZAR.bat`.
  - `docs/TAWKTO-PROXIMOS-PASSOS.md` — duplicava o checklist de `docs/TAWKTO-CHATBOT.md`.
- **Fundidos:** `SETUP-SUPABASE.txt` reduzido a redirect curto para `docs/SUPABASE.md`.
- **Documentação corrigida:**
  - `docs/DEPLOY-AUTOMATICO-CPANEL.md` e `scripts/cpanel-deploy.mjs` L14 — `deploy:all` documentado correctamente (site + PHP, **sem** ZIPs nem catálogos).
  - `docs/ONEDRIVE.md` §10 — "bidireccional" marcado como concluído (Fase G), deixando de contradizer o `ROADMAP-SHAREPOINT.md`.
  - `docs/ROADMAP-SHAREPOINT.md` — `make-zip` substituído por `deploy:all` como primário.
  - `docs/CPANEL-DOCUMENTOS.md` — numeração do checklist corrigida, nota operacional informal removida, novo passo explícito para criar `.navel-permissions.json` no cPanel.
  - `docs/SUPABASE.md` — URL real do projecto substituído por placeholder no exemplo PHP.
  - `docs/INDEX.md` — `ESTRUTURA.md` adicionado.
  - `docs/OTIMIZACOES.md` — secção Publicação passa a destacar o pipeline `deploy:*` como primário.
  - `public/images/README.md` — referência à página "Novidades" (removida) substituída por pastas reais.
- **Higiene:**
  - `src/pages/AreaReservada.jsx:704` — `console.info('[OneDrive debug]', …)` só corre em `import.meta.env.DEV`.
  - `.gitignore` — adicionado `public/documentos-store/.navel-permissions.json` (ficheiro real com emails, fica apenas no servidor; o `.example` continua versionado).
  - `.env.example` — adicionadas variáveis `SUPABASE_ADMIN_PASSWORD`, `VITE_TAWK_PROPERTY_ID`, `VITE_TAWK_WIDGET_ID` como comentadas.

#### Hardening PHP (Fase 2)
- **Fail-closed default permissions** (`public/documentos-api.php` — `n_doc_builtin_default_permissions`): quando o ficheiro `.navel-permissions.json` não existe ou é inválido, a API deixa de assumir `['*']` para todos — apenas o admin (`comercial@navel.pt`) tem acesso. Impede que uma instalação "meia" exponha a biblioteca a qualquer utilizador autenticado. **Acção operacional:** confirmar que o servidor tem o ficheiro criado; caso contrário, partir de `.navel-permissions.json.example`.
- **`keep-alive-supabase.php`** — removido fallback que continha a URL real do projecto Supabase (`kgvbvgwqkqkfccraaehb.supabase.co`) hardcoded no código. Agora falha explicitamente se `SUPABASE_URL`/`VITE_SUPABASE_URL` ou a chave `url` no `keep-alive-supabase.secret.php` não estiver definida.
- **`onedrive-cron.php`** — token passa a ser aceite apenas via header `X-Cron-Token` (evita log em access logs de proxies/CDN). Compatibilidade temporária: `cfg.onedrive_cron_allow_query=true` para crons legados.
- **`n_doc_action_onedrive_status`** — resposta filtrada para não-admins: deixa de expor `userPrincipalName`, `displayName`, `driveId`, `rootItemId`, `deltaLink`, estatísticas de sync. Admins continuam a ver o resumo completo.
- **Upload guards (`n_doc_action_upload`):**
  - Limite de tamanho aplicacional configurável (`cfg.upload_max_bytes`, default 100 MiB) — complementa `php.ini`.
  - Blocklist de extensões executáveis (inclui **double-extensions** tipo `foo.pdf.php`): PHP (`php`, `phtml`, `phar`, `php3-8`, `phps`), CGI (`cgi`, `pl`, `py`, `rb`), binários Windows (`exe`, `dll`, `com`, `bat`, `cmd`, `sh`, `msi`, `scr`), outros servidores (`asp`, `aspx`, `jsp`, `jspx`), Apache (`htaccess`, `htpasswd`). Configurável via `cfg.upload_blocked_extensions`. Defesa em profundidade face a `documentos-store/.htaccess` (`Require all denied`).
- **HSTS** em `public/.htaccess`: `Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"` (condicionado a `%{HTTPS} == 'on'`).
- **Sample actualizado:** `documentos-api-config.sample.php` ganhou `onedrive_cron_allow_query`, `upload_max_bytes`, `upload_blocked_extensions` e comentário sobre o novo cron via header.

#### Nota de segurança — bucket Supabase Storage `documentos` (S3 não fechado)
- Policies actuais (`docs/supabase-setup.sql` §Storage) permitem que qualquer utilizador autenticado leia (`SELECT`) e insira (`INSERT`) em qualquer caminho do bucket. Não há partição por parceiro.
- O bucket ainda é usado activamente pelo `AreaReservada.jsx` (fallback do modo cPanel), portanto **as policies não foram alteradas** — fechá-las sem mapear o uso real poderia quebrar o portal em produção.
- Adicionado bloco de aviso forte no topo da secção de policies em `docs/supabase-setup.sql` e nova secção em `docs/SUPABASE.md` §6.1 explicando o trade-off e oferecendo exemplo de hardening por `storage.foldername(name)[1] = auth.jwt()->>'email'`.

#### Duplicados / ficheiros órfãos
- Investigação dos pares `src\…` vs `src/…` no `git status`: confirmado que é **artefacto de exibição do PowerShell no Windows** — não há duplicação em disco.

## [0.2.5] — 2026-04-17

### Deploy automático para cPanel (FTPS / SFTP / UAPI) — exclusivo `navel-site`
- **Âmbito restrito:** o novo pipeline aplica-se **apenas** ao `navel-site`/`www.navel.pt`. Outros projectos NAVEL (`app-stocks-next` em Vercel, `AT_Manut`, `app-ftecnicas`, `navel-propostas`) mantêm as suas próprias ferramentas de deploy. Documentado em `.cursor/rules/cpanel-deploy.mdc` (secção "Âmbito") e na tabela de `navel-workspace.mdc`.
- **Runtime fence `enforceProjectFence()` em `scripts/cpanel-env.mjs`** — abortam `cpanel-probe.mjs` / `cpanel-deploy.mjs` se executados fora de `navel-site/` ou se `CPANEL_HOST` / `CPANEL_FTP_HOST` / `CPANEL_SFTP_HOST` não pertencerem ao domínio `navel.pt`. Previne uploads acidentais para servidor errado caso `.env.cpanel` seja copiado para outro repo.
- **Novo pipeline `npm run deploy:*`** substitui o upload manual no File Manager como caminho primário de publicação do `navel-site`. Upload **incremental** por hash SHA-1 (`scripts/.cpanel-deploy-cache.json`, gitignored); só envia ficheiros alterados.
- **Scripts:**
  - `scripts/cpanel-env.mjs` — carregador partilhado de `.env.cpanel` (sem dependências runtime).
  - `scripts/cpanel-probe.mjs` — testa FTPS, SFTP e UAPI em paralelo e reporta quais funcionam + latência.
  - `scripts/cpanel-deploy.mjs` — deploy com `--dry`, `--yes`, `--force`, `--protocol=`, `--with-catalogos`, `--remote=`, `--file=`, `--php`, `--site`, `--zips`, `--all`.
- **Comandos npm:** `deploy:probe`, `deploy:dry`, `deploy:php`, `deploy:site`, `deploy:zips`, `deploy:file`, `deploy:all`.
- **Defaults seguros:** `--dry` se faltar `--yes`; `--all` = site + PHP (sem catálogos, sem ZIPs); catálogos PDF só com `--with-catalogos` explícito.
- **TLS pragmático:** `CPANEL_FTP_TLS_STRICT=false` documentado para hosts partilhados (Ciberserver e similares) cujo certificado é válido para o hostname interno (`pplcXXXXX.ciberserver.com`), não para `ftp.domain.com`. Ligação continua encriptada.

### Segurança
- **`.env.cpanel`** (e `.env.cpanel.local`, cache `.cpanel-deploy-cache.json`) adicionados ao `.gitignore`. Credenciais nunca entram no repositório.
- Recomendação: **conta FTP dedicada** ao deploy, chroot a `/home/<user>/public_html`, nunca a conta cPanel principal.

### Dependências (devDependencies)
- `basic-ftp` (FTPS) e `ssh2-sftp-client` (SFTP) — só usadas por scripts de deploy, não entram no bundle do site.

### Documentação
- **Novo** `docs/DEPLOY-AUTOMATICO-CPANEL.md` — guia passo-a-passo: descoberta do protocolo suportado, criação de credenciais dedicadas, `.env.cpanel`, probe, fluxos de uso, troubleshooting, boas práticas.
- **Atualizados** `README.md`, `DEPLOY.md`, `PUBLICAR-CHECKLIST.txt`, `docs/INDEX.md`, `docs/DEPLOY-AREA-RESERVADA-E-ONEDRIVE.md`, `docs/TROUBLESHOOTING.md`, `docs/SETUP.md`, `docs/CPANEL-DOCUMENTOS.md`, `docs/CREDENCIAIS-SEGURANCA.md`, `OPTIMIZAR.bat`.
- **Regras atualizadas:** `.cursor/rules/cpanel-deploy.mdc` (fluxo automatizado + ficheiros sensíveis + ordens canónicas), `.cursor/rules/otimizar-bat.mdc` (nota sobre o novo caminho primário).

### Continuidade
- Fluxo primário: `npm run build` → `npm run deploy:dry` → `npm run deploy:all -- --yes`.
- `OPTIMIZAR.bat` + ZIP manual continuam suportados como fallback e para backups/envios a parceiros.

## [0.2.4] — 2026-04-17

### Portal de documentos (área reservada, modo cPanel)
- **Pesquisa global:** `cpanelSearch` + paleta **Ctrl+K** (`PortalCommandPalette.jsx`); filtro por `documentType`; abrir pasta do resultado.
- **Fase B (metadata):** em `Assistencia Tecnica/.../...` (≥3 segmentos), upload exige `documentType`; `taxonomyNodeId` por match de path; multipart com `versionLabel` / `notes`; chips na listagem; `cpanelList` com metadata completa.
- **Pré-visualização:** `GET download&inline=1` (PDF e imagens); `DocumentPreviewModal.jsx`.
- **PHP:** `n_doc_action_download` com parâmetro `inline`; `n_doc_mime_allows_inline`.

### Fase C (fundações navel-site — integração AT_Manut)
- **`documentos-api.php`:** autenticação opcional por **`at_integration_bearer`** (string opaca; não JWT Supabase) com âmbito **apenas** `Assistencia Tecnica/...`; bloqueio explícito de OneDrive, deletes, taxonomia, `reindex`, `ensure_marker`, etc. (`403 forbidden_for_at_integration`).
- **Upload:** campo multipart opcional **`linkMachineIds`** (JSON array) para gravar vínculos no mesmo pedido; `n_doc_store_machine_links_row` partilhado com `POST machine_links`.
- **JS:** `cpanelMachineLinksGet` / `cpanelMachineLinksSet` em `documentosCpanelApi.js`.

### Documentação
- Actualizados **`docs/ROADMAP-SHAREPOINT.md`** (Fase B concluída na UI; itens 1–3 do plano de 10 marcados como entregues; próximo: Fase C), **`docs/CPANEL-DOCUMENTOS.md`** (tabela API portal), **`docs/DEPLOY-AREA-RESERVADA-E-ONEDRIVE.md`** (`search`, `download` inline), **`docs/INDEX.md`**, **`docs/INTEGRACAO-BIBLIOTECA-AT-MANUT.md`** (§9–10 token AT + proxy).

## [0.2.3] — 2026-04-17

### Documentação operacional (área reservada + OneDrive)
- Novo **`docs/DEPLOY-AREA-RESERVADA-E-ONEDRIVE.md`**: checklist **build → make-zip**, deploy cPanel (apagar `assets/`), PHP/`dist`, JWT, OPcache, tabela de erros OneDrive/i18n, notas para agentes.
- Actualizados **`docs/INDEX.md`**, **`docs/TROUBLESHOOTING.md`** (§6–7), **`DEPLOY.md`**, **`docs/CPANEL-DOCUMENTOS.md`**, **`docs/ONEDRIVE.md`** (cron `run_until_done`, API `onedrive_sync_preview` / `onedrive_sync_tick`).

## [0.2.2] — 2026-03-29

### Privacidade / i18n
- **`src/locales`:** a política completa estava em `scripts/privacy-locale-*.json` mas **não** tinha sido fundida nos JSON principais, pelo que em EN (e outros) apareciam chaves cruas tipo `privacy.introWho` em [navel.pt/privacidade](https://navel.pt/privacidade). Corrido `merge-privacy-locales.js` e adicionado **`prebuild`** → `npm run merge-locales` (privacy + rgpd) para cada `npm run build` / `OPTIMIZAR.bat`.
- **Documentação:** `docs/INDEX.md`, `ESTRUTURA.md`, `OTIMIZACOES.md`, `TROUBLESHOOTING.md` (secção 2a), `DEPLOY.md`, `PUBLICAR-CHECKLIST.txt`, `OPTIMIZAR.bat` (cabeçalho passo 5), `.cursor/rules/otimizar-bat.mdc` — fluxo merge-locales e fontes canónicas.

### Supabase keep-alive (anti-pausa free-tier)
- **`docs/supabase-keep-alive-rpc.sql`:** tabela `supabase_keepalive_heartbeats` + `keep_alive_ping()` passa a fazer **UPDATE** (escrita leve na BD), mais alinhado com o que o Supabase costuma contar como actividade.
- **`public/keep-alive-supabase.php` (v1.3):** removida chave anon hardcoded (passa a ser obrigatório `secret.php` ou env); **re-tentativas** na RPC; segundo ping **GET `/auth/v1/health`**; suporte a `secret.php` com array `url` + `anon_key`; cron recomendado **2×/dia** via `curl` ao URL público; documentação em `docs/SUPABASE.md` §8.
- **Segurança:** quem tiver exposto a chave antiga deve **gerar nova anon key** no dashboard Supabase e actualizar servidor + `.env`.

### Condições gerais de venda e serviço (CGVS)
- **Página `/condicoes-gerais`:** texto conforme impresso IMP.01(01), edição 01 / 30.03.2022, em `src/data/cgvs-pt.js`; renderização em `src/pages/CondicoesGerais.jsx` com listas (ex. §3.6, §6.2); nota sobre numeração (capítulos 10 e 11 inexistentes no documento fonte).
- **i18n:** chaves `cgvs.*` e `footer.cgvs` (PT/EN/ES); EN/ES com aviso de que a redação juridicamente vinculante é a versão em português.
- **SEO e navegação:** `PageTitle`, `Breadcrumbs`, `Footer`, `public/sitemap.xml`.
- **Documentação:** `docs/INDEX.md`, `docs/SEO.md`, `docs/ESTRUTURA.md`, `DEPLOY.md`, `PUBLICAR-CHECKLIST.txt`, `OPTIMIZAR.bat` (notas pós-deploy e referência CGVS).

## [0.2.1] — 2026-03-23

### Privacidade e RGPD
- **Página /rgpd:** compromisso com o RGPD, lista de direitos dos titulares, forma de exercício, remissão à Política de Privacidade e botão para contacto; PT/EN/ES; link no rodapé; `sitemap.xml`; ficheiros fonte `scripts/rgpd-locale-*.json` + `node scripts/merge-rgpd-locales.js`. (A Global Filtros usa também um formulário dedicado; aqui o pedido faz-se por contacto/e-mail, coerente com o site.)
- **Política de Privacidade** alargada (RGPD): âmbito, definições, contacto para proteção de dados, dados por canal (contacto, newsletter por e-mail, área Supabase), encargados (Supabase, Google Fonts, alojamento), conservação, marketing, transferências extra-EEE, segurança, alterações e data de atualização; três idiomas. Edição auxiliar: `scripts/privacy-locale-*.json` + `node scripts/merge-privacy-locales.js`.

### SEO e URLs
- **BrowserRouter** em substituição do HashRouter: URLs limpas (`/contacto`, `/produtos`, …) com fallback SPA no `.htaccess` (Apache).
- **Redireciono 301** `www.navel.pt` → `https://navel.pt` e **HTTPS** forçado (mesma regra que antes, estendida).
- **Sitemap** com `loc` sem fragmento (`#`); removida entrada `/novidades` (redirecciona para `/catalogos`); `lastmod` actualizado.
- **Meta keywords** removidos do `index.html` (não usados pelo Google); descrição EN em `meta` duplicado removida — descrições por idioma via `react-helmet-async` + `PageTitle`.
- **`PageTitle` + Helmet:** por rota — `title`, `description`, `canonical`, `og:*`, `twitter:*`, `robots` (mantém `noindex` em login/registo/área reservada/admin/aguardar).
- **`send-contact.php`**, **Contacto.jsx**, **Register.jsx:** redirecções e callbacks alinhados com paths sem hash; origem canónica `https://navel.pt`.
- **`MANUT_DASHBOARD_URL`:** `https://navel.pt/manut/` (evita salto www).
- **Compatibilidade:** ao carregar, URLs antigas `#/rota` são normalizadas para `/rota` antes do React Router.
- **Supabase:** garantir que `https://navel.pt/login` está em **Redirect URLs** (email de confirmação de registo).
- **Catálogos Beta 2026:** PDFs via [Bolas folhetos](https://www.bolas.pt/pt/folhetos_987.html); miniaturas block2 / block3 / block4 → tabela, Action, Worker (`beta-tabela-precos-2026.jpg`, `beta-action-2026.jpg`, `beta-worker-2026.jpg`). Ver `docs/CATALOGOS-BOLAS-BETA-TELWIN.md`.

---

Política de continuidade:
- cada entrada deve registar contexto, decisão e impacto;
- no fim de cada sessão crítica, acrescentar nota de handoff (próximo passo claro);
- o changelog é fonte de verdade para continuidade entre agentes/modelos.

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
