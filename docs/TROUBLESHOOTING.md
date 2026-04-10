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

### Ações
1. Regerar pacote com `OPTIMIZAR.bat`.
2. Confirmar extração do zip no diretório correto (`public_html`).
3. Limpar cache do browser (`Ctrl+F5`).

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
- Usar `.env` local e manter secrets fora do repositório.

