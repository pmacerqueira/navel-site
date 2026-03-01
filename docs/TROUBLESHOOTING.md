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

## 2) Problemas Supabase

### Sintoma
Área reservada não autentica ou storage falha.

### Ações
1. Validar `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
2. Rever `docs/SUPABASE.md`.
3. Aplicar scripts SQL de correção quando necessário (`docs/supabase-storage-fix.sql`).

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
Links internos parecem quebrados em produção.

### Ações
1. Confirmar que as rotas usam `#/...` (HashRouter).
2. Validar se `index.html` e `assets/` foram publicados corretamente.

---

## 5) Segurança de credenciais

- Não guardar passwords/tokens reais em docs de projeto.
- Usar `.env` local e manter secrets fora do repositório.

