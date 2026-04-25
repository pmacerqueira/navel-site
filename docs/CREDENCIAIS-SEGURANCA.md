# Credenciais e Segurança

Regras para evitar exposição de segredos no `navel-site`.

---

## Regras obrigatórias

- Não guardar passwords/tokens/chaves reais em `.md`/`.txt` do projeto.
- Usar `.env` local para variáveis de ambiente.
- Manter `.env` fora do Git (já coberto pelo `.gitignore`).
- **Workspace NAVEL:** ficheiro consolidado **`C:\Cursor_Projetos\NAVEL\.navel-secrets\navel-secrets.env`** (fora dos repos Git) — manter alinhado com `navel-site/.env` e `.env.cpanel`; não commitar.

---

## Variáveis esperadas

### `.env` (frontend, committed em `.env.example`)

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Opcional (scripts internos):
- `SUPABASE_SERVICE_ROLE_KEY` (nunca no frontend)

### `.env.cpanel` (deploy — template `.env.cpanel.example`)

- **SFTP** (ex. navel.pt / CiberConceito, porta **11022**): user = conta **principal** SSH; `CPANEL_REMOTE_ROOT` absoluto até `public_html`.
- **FTPS:** subconta dedicada (`deploy@…`); `CPANEL_REMOTE_ROOT=/` quando o login FTP já está em `public_html`.
- `CPANEL_FTP_TLS_STRICT=false` em alguns hosts (certificado do hostname interno).

Ver `docs/DEPLOY-AUTOMATICO-CPANEL.md`, `docs/HOSTING-CIBERCONCEITO-NAVEL.md`.

**Regras:** não commitar; passwords fortes; rotacionar após fuga; evitar colar passwords em chats públicos.

---

## Boas práticas

- Rotacionar credenciais se tiverem sido partilhadas fora de canais seguros.
- Evitar copiar credenciais em conversas, issues ou commits.
- Usar placeholders em exemplos/documentação.

