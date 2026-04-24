# Segredos em cPanel (NAVEL + AT_Manut) — variáveis de ambiente

> Contexto: resposta de suporte **CiberConceito** (ticket #225838, Renato Rodrigues) para API PHP em alojamento partilhado.
>
> **Runbook operacional canónico** (rotação, rollback, troubleshooting, checklist anual): **`AT_Manut/docs/CPANEL-RUNBOOK-SEGREDOS.md`**.
> Este ficheiro cobre a **arquitectura** (porquê) e o **papel do `navel-site`** como operador (scripts). Para procedimentos passo-a-passo em produção, seguir o runbook.

## Resumo rápido (validado 2026-04-24 em produção)

- Alojamento actual: **LiteSpeed + LSPHP 8.1** (SAPI `litespeed`).
- `mod_env` **não** está carregado → `SetEnv` em `.htaccess` é **ignorado**.
- O método web-native que funciona: **`RewriteRule ^ - [E=KEY:VALUE]`** (mod_rewrite). Os valores aparecem em `$_SERVER[KEY]` e `getenv(KEY)` intactos, inclusive com caracteres especiais (`' " + { } ~`).
- `SetEnvIf` também chega ao PHP, mas envolve o valor em aspas literais — não fiável.
- Alternativa operacional mantida: `config.deploy-secrets.php` com `putenv(…)` só no servidor (gitignored, bloqueado via `FilesMatch`).

## Scripts de operação (em `navel-site/scripts/`)

| Script | Função |
|---|---|
| `cpanel-migrate-setenv.mjs` | Lê `config.deploy-secrets.php` no servidor, gera `.htaccess` com `RewriteRule [E=…]` para cada `ATM_*`, faz backup `.htaccess.bak-TS` e publica. `--dry` por defeito; `--yes` aplica; `--remove-fallback` renomeia o fallback para `.disabled-TS`. |
| `cpanel-verify-setenv.mjs` | Renomeia o fallback para `.test-disabled-TS`, faz smoke-test HTTPS ao `/api/data.php` (login inválido + pedido sem token); só confirma o arquivamento definitivo se ambos forem 4xx esperados — rollback automático em qualquer 5xx. |
| `cpanel-rollback-htaccess.mjs` | Repõe o `.htaccess` à versão do repo (com backup `.bak-TS`). Usar só se for preciso reverter a migração. |

Exemplo típico de upgrade dos segredos em produção:

```powershell
cd navel-site
node scripts/cpanel-migrate-setenv.mjs          # dry-run: confere vars detectadas
node scripts/cpanel-migrate-setenv.mjs --yes    # aplica com backup
node scripts/cpanel-verify-setenv.mjs --yes     # confirma SetEnv sozinho + arquiva fallback
```

## AT_Manut — `public_html/api/`

- Repo: `servidor-cpanel/api/.htaccess` documenta a arquitectura e contém apenas o bloco `FilesMatch` de defesa em profundidade (bloqueia `test-*.php`, `teste-*.php`, `clear-cache.php`, `ingest-istobal-retro.php`, `config.deploy-secrets.php(.disabled-*)`, `atm_report_auth.secret.php`, `.htaccess.bak-*`).
- O `.htaccess` **real** no servidor é gerado pelo script e **não** versionado.
- `config.php` lê via **`atm_env()`** (`getenv`, `$_ENV`, `$_SERVER`, `REDIRECT_*`).
- `config.deploy-secrets.php.example` serve de modelo para o fallback `putenv(…)`.

## navel-site — `public_html/` (raiz)

Scripts PHP na raiz (ex.: `keep-alive-supabase.php`, `documentos-api.php`) correm no **mesmo SAPI LSPHP**, pelo que o método `SetEnv` continua inviável. Se for necessário injectar segredos via `.htaccess`:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteRule ^ - [E=SUPABASE_URL:https://xxx.supabase.co]
  RewriteRule ^ - [E=SUPABASE_ANON_KEY:eyJ...]
</IfModule>
```

Para escape dentro de `[E=…]`: `\` → `\\`, `,` → `\,`, `]` → `\]`. Os restantes caracteres passam inalterados (incluindo aspas e chavetas).

### `documentos-api.php`

A configuração principal está em **`documentos-api-config.php`** (array PHP gitignored no servidor). Migrar cada chave para `getenv()` + `[E=…]` seria uma evolução separada; até lá, continuar a manter o ficheiro fora do Git no servidor.

## Auditoria cruzada (após qualquer alteração)

```powershell
cd navel-site
node scripts/cpanel-audit-crosssite.mjs
```

Verifica integridade do `.htaccess` raiz e `/api/`, listagem dos ficheiros
`.bak-*` e `.disabled-*`, e faz smoke-tests HTTPS aos 10 endpoints críticos
dos dois projectos (`documentos-api.php`, `area-reservada`,
`keep-alive-supabase.php`, `onedrive-callback.php`, `taxonomy-nodes.php`,
`navel-documentos-upload.php`, `data.php`, e rejeição de ficheiros
bloqueados). Usar sempre depois de rodar segredos.

## Referências

- **`AT_Manut/docs/CPANEL-RUNBOOK-SEGREDOS.md`** — runbook operacional completo (fluxos, rollback, troubleshooting, checklist anual).
- `AT_Manut/CHANGELOG.md` — entrada `[Operação] — 2026-04-24` com diagnóstico completo.
- `AT_Manut/docs/DEPLOY_CHECKLIST.md` — receita operacional.
- `AT_Manut/docs/SEGURANCA-REVISAO-NAVEL-PT.md` — revisão de segurança actualizada.
