# Troubleshooting — navel-site

Runbook rápido para erros frequentes em desenvolvimento e publicação.

---

## 1) Build falha

### Sintoma
`npm run build` termina com erro.

### Ações
1. Confirmar versão do Node.
2. Correr `npm install` novamente.
3. Verificar paths de imagens e ficheiros referenciados.

---

## 2a) Página Privacidade mostra chaves como `privacy.introWho`

### Sintoma
Em `/privacidade` (sobretudo em EN/ES) aparecem títulos tipo `privacy.introWho` em vez de texto humano.

### Causa
A chave `privacy` em `src/locales/*.json` ficou reduzida ou desactualizada em relação a `Privacidade.jsx`; o texto completo vive em **`scripts/privacy-locale-{pt,en,es}.json`**.

### Ações
1. `npm run merge-locales` (ou simplesmente `npm run build`, que inclui `prebuild`).
2. Confirmar que `src/locales/en.json` → `privacy` tem dezenas de chaves (ex.: `introWho`).
3. Volver a gerar o ZIP e publicar.

---

## 2) Problemas Supabase

### Sintoma
Área reservada não autentica ou storage falha.

### Ações
1. Validar `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
2. Rever `docs/SUPABASE.md`.
3. Aplicar scripts SQL de correção quando necessário (`docs/supabase-storage-fix.sql`).

### E-mail “project is going to be paused” (free-tier)

O Supabase conta **inactividade** na API/BD (tipicamente vários dias sem tráfego útil).

1. No Supabase: executar (ou re-executar) **`docs/supabase-keep-alive-rpc.sql`** — a versão actual faz **UPDATE** numa tabela pequena, não só `SELECT 1`.
2. No servidor: garantir `https://navel.pt/keep-alive-supabase.php` acessível e **cron** com `curl` **2× por dia** (ver `docs/SUPABASE.md` §8). O script **já não inclui chave no código** — usar `keep-alive-supabase.secret.php` ou env no cron.
3. Abrir o URL do keep-alive no browser: deve aparecer `OK` com `rpc` e `auth/health`. Se der erro SQL/RPC, falta correr o SQL ou a chave é inválida.

---

## 3) Publicação não reflete mudanças

### Sintoma
Site publicado mantém versão antiga.

### Ações (fluxo automatizado, preferido)
1. `npm run build` (sem rebuild, o `dist/` continua com a versão antiga).
2. `npm run deploy:dry` — ver se algum ficheiro é listado. Se mostrar
   `0 ficheiros a enviar`, a tua cache SHA-1 acha que está tudo igual;
   corre `npm run deploy:all -- --force --yes` para ignorar a cache.
3. Limpar cache do browser (`Ctrl+F5`).

### Ações (fluxo manual)
1. Regerar pacote com `OPTIMIZAR.bat`.
2. Confirmar extração do zip no diretório correto (`public_html`).
3. Limpar cache do browser (`Ctrl+F5`).

### Deploy automático falha
Ver **`docs/DEPLOY-AUTOMATICO-CPANEL.md`** → secção Troubleshooting para
erros FTPS (TLS, `530 Login incorrect`, `ECONNREFUSED`, SFTP key, UAPI).

---

## 4) Rotas não funcionam

### Sintoma
Links internos ou refresh (F5) em `/contacto`, `/produtos`, etc. devolvem 404 em produção.

### Ações
1. Confirmar que **`.htaccess`** do `dist/` está na raiz do site no servidor (fallback SPA para `index.html`).
2. Validar que **mod_rewrite** está activo no Apache (cPanel).
3. Validar se `index.html` e `assets/` foram publicados correctamente.

---

## 5) Segurança de credenciais

- Não guardar passwords/tokens reais em docs de projeto.
- **`.env.cpanel`** (FTP/SFTP/UAPI) está no `.gitignore`; nunca commitar.
  Se por engano for commitado, rotacionar a password FTP imediatamente
  no cPanel → FTP Accounts → Change Password.

---

## 6) Área reservada, `documentos-api.php`, OneDrive (erros “de deploy”)

**Documento canónico:** `docs/DEPLOY-AREA-RESERVADA-E-ONEDRIVE.md` (ler primeiro).

| Sintoma | Causa frequente | O que fazer |
|--------|-------------------|-------------|
| UI antiga (faltam botões / fluxo OneDrive) | ZIP antigo ou **`assets/` não apagada** antes do extract | `npm run build` → `npm run make-zip`; no cPanel **apagar `public_html/assets/`** → extrair ZIP. |
| PHP “não muda” no servidor | Build não corrido após editar `public/*.php` | O ZIP vem de **`dist/`**; o Vite copia `public/` no **build**. Ordem: **build → make-zip**. |
| `onedrive_sync_failed` / timeout | Proxy ou pedido longo | Usar **sync por ticks** na UI ou **cron** no servidor; ver `docs/ONEDRIVE.md`. |
| `0 ficheiros` com pastas OK | Delta sem `downloadUrl` | Já tratado no servidor com `/content`; se persistir, ver `.navel-onedrive-sync.log`. |
| Chaves i18n `{{x}}` não interpoladas | Sintaxe errada nos JSON | Usar **`{{placeholder}}`** em `src/locales/*.json`. |
| `documentos-api-config.php` com erro | Falta `<?php` ou JWT errado | Secret = JWT Secret Supabase, não anon key. |
| **Todos os utilizadores veem "sem pastas" / 403** | **Falta `.navel-permissions.json`** no cPanel (desde v0.2.6 a API é **fail-closed**) | Criar `documentos-store/.navel-permissions.json` a partir de `.navel-permissions.json.example` com os emails reais (ver `docs/CPANEL-DOCUMENTOS.md`). |
| Upload rejeitado com `blocked_extension` | Ficheiro tem extensão executável (`.php`, `.exe`, `.bat`, …) ou double-extension (`relatorio.pdf.php`) | Renomear. Se for legítimo, configurar `upload_blocked_extensions` em `documentos-api-config.php`. |
| Upload rejeitado com `file_too_large` | Ultrapassa `upload_max_bytes` (default 100 MiB) | Ajustar `cfg.upload_max_bytes` **e** `upload_max_filesize` / `post_max_size` no `php.ini` do cPanel. |
| `onedrive-cron.php` / log com **403** e `message: Acesso negado` | **Isto não vem** do nosso `onedrive-cron.php` — costuma ser **ModSecurity** (firewall do alojamento) a bloquear o header `X-Cron-Token`. | Usar **`curl -X POST -d "token=SEU_TOKEN" "https://navel.pt/onedrive-cron.php"`** (corrigido no repo; fazer deploy do PHP). Ou reactivar `?token=` com `onedrive_cron_allow_query => true` em `documentos-api-config.php`. |
| `onedrive-cron.php` devolve `401 unauthorized` | Token errado ou vazio | Conferir `onedrive_cron_token` no `documentos-api-config.php` do servidor; alinhar com o cron. |
| F5 desloga ao refresh | Lógica extra de `signOut` em reload | Não forçar logout em `navigation.type === 'reload'`. |

---

## 7) Publicação não reflete mudanças (área reservada + PHP)

Além de `docs/TROUBLESHOOTING.md` §3:

### Fluxo automatizado (preferido)
1. Editar `public/*.php` ou código JS/CSS.
2. Se alterou PHP: `npm run deploy:php -- --yes`.
3. Se alterou frontend: `npm run build && npm run deploy:site -- --yes`.
4. Se alterou ambos: `npm run build && npm run deploy:all -- --yes`.

### Fluxo manual (fallback)
1. Confirmar **`npm run build`** (gera `dist/` com `public/` copiado).
2. Confirmar **`npm run make-zip`** (empacota **`dist/`**).
3. No servidor: substituir **PHP** na raiz do site e limpar **`assets/`** como acima.

