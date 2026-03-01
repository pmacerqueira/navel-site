# Credenciais e Segurança

Regras para evitar exposição de segredos no `navel-site`.

---

## Regras obrigatórias

- Não guardar passwords/tokens/chaves reais em `.md`/`.txt` do projeto.
- Usar `.env` local para variáveis de ambiente.
- Manter `.env` fora do Git (já coberto pelo `.gitignore`).

---

## Variáveis esperadas

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Opcional (scripts internos):
- `SUPABASE_SERVICE_ROLE_KEY` (nunca no frontend)

---

## Boas práticas

- Rotacionar credenciais se tiverem sido partilhadas fora de canais seguros.
- Evitar copiar credenciais em conversas, issues ou commits.
- Usar placeholders em exemplos/documentação.

