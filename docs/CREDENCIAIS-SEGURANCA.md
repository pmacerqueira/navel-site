# Credenciais e Segurança

Regras para evitar exposição de segredos no `navel-site`.

---

## Regras obrigatórias

- Não guardar passwords/tokens/chaves reais em `.md`/`.txt` do projeto.
- Usar `.env` local para variáveis de ambiente.
- Manter `.env` fora do Git (já coberto pelo `.gitignore`).

---

## Variáveis esperadas

### `.env` (frontend, committed em `.env.example`)

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Opcional (scripts internos):
- `SUPABASE_SERVICE_ROLE_KEY` (nunca no frontend)

### `.env.cpanel` (deploy automático FTPS/SFTP/UAPI — committed em `.env.cpanel.example`)

Template completo em `.env.cpanel.example`. Campos ativos por defeito (FTPS):

- `CPANEL_HOST`, `CPANEL_REMOTE_ROOT`, `CPANEL_PROTOCOL=ftps`
- `CPANEL_FTP_HOST`, `CPANEL_FTP_PORT`, `CPANEL_FTP_USER`, `CPANEL_FTP_PASSWORD`
- `CPANEL_FTP_SECURE=true`, `CPANEL_FTP_TLS_STRICT` (false em hosts Ciberserver
  e similares, onde o certificado TLS é do hostname interno)

Alternativas (SFTP, UAPI) documentadas em `.env.cpanel.example` e
`docs/DEPLOY-AUTOMATICO-CPANEL.md`.

**Regras específicas para `.env.cpanel`:**
- Conta FTP dedicada, **não** a conta cPanel principal.
- Chroot à pasta `/home/<user>/public_html` para limitar escopo.
- Rotacionar password a cada 3-6 meses ou ao suspeitar fuga.
- Nunca colar passwords em chats/issues/commits.

---

## Boas práticas

- Rotacionar credenciais se tiverem sido partilhadas fora de canais seguros.
- Evitar copiar credenciais em conversas, issues ou commits.
- Usar placeholders em exemplos/documentação.

