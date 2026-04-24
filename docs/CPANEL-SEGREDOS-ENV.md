# Segredos em cPanel (NAVEL + AT_Manut) — variáveis de ambiente

> Contexto: resposta de suporte **CiberConceito** (ticket #225838, Renato Rodrigues) para API PHP em alojamento partilhado.

## Recomendação do alojador

1. Definir variáveis com **`SetEnv`** num **`.htaccess`** na pasta onde corre o PHP relevante.
2. Ler em PHP com **`getenv()`** ou **`$_ENV`** (evitar `putenv()` disperso no código).
3. Manter **`.htaccess`** protegido contra acesso directo (o Apache não serve normalmente este ficheiro; na raiz do site já existe bloqueio de ficheiros sensíveis).

## AT_Manut — `public_html/api/`

- Modelo versionado: no repo **AT_Manut**, `servidor-cpanel/api/.htaccess` inclui um bloco comentado com `SetEnv` para `ATM_*`.
- Em produção: descomentar e preencher **só no servidor**; fazer deploy do `.htaccess` com o bloco activo (sem commitar segredos no Git).
- `config.php` já usa **`atm_env()`**, compatível com o que o Apache expõe após `SetEnv`.
- **Fallback:** `config.deploy-secrets.php` (gitignored) se `mod_env` não estiver disponível.

## navel-site — `public_html/` (raiz)

Scripts PHP na raiz (ex.: `keep-alive-supabase.php`) usam **`getenv('SUPABASE_URL')`**, etc. Podes definir no **`public/.htaccess`** (deploy para `public_html/.htaccess`) um bloco análogo:

```apache
# Exemplo — preencher no servidor; não versionar valores reais.
# <IfModule mod_env.c>
#   SetEnv SUPABASE_URL https://xxx.supabase.co
#   SetEnv SUPABASE_ANON_KEY ...
#   # ou os nomes VITE_* se o script fizer fallback para eles
# </IfModule>
```

### `documentos-api.php`

Hoje a configuração principal está em **`documentos-api-config.php`** (ficheiro PHP de retorno de array, **gitignored** em produção). Migrar cada chave para `getenv()` + `SetEnv` seria uma evolução separada; até lá:

- manter **`documentos-api-config.php`** fora do Git no servidor;
- credenciais **OneDrive** já podem usar **`getenv('MICROSOFT_*')`** como fallback em `onedrive-lib.php` (ver código).

## Referências

- AT_Manut: `docs/DEPLOY_CHECKLIST.md`, `servidor-cpanel/api/config.php`.
- Integração biblioteca: `docs/INTEGRACAO-BIBLIOTECA-AT-MANUT.md`.
