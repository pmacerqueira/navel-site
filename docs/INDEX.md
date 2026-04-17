# Índice Rápido de Documentação — navel-site

## Continuidade entre agentes (obrigatório)
- Não assumir memória global automática entre chats/sessões.
- Não assumir aprendizagem permanente automática de um modelo para outro.
- A continuidade real vem de: código, `.cursor/rules`, `CHANGELOG.md` e esta documentação.
- Em cada nova conversa, iniciar com resumo curto: objetivo, estado atual, risco principal, ficheiros canónicos e próxima ação.

## Essencial
- `README.md` — comandos e visão geral
- `DEPLOY.md` — publicação cPanel
- **`docs/DEPLOY-AREA-RESERVADA-E-ONEDRIVE.md`** — **checklist obrigatória** (build→zip, PHP, OneDrive, i18n, erros a evitar)
- `docs/SETUP.md` — setup local completo
- `docs/TROUBLESHOOTING.md` — resolução de problemas
- `docs/ARQUITETURA.md` — arquitetura e separação com AT_Manut
- `docs/CREDENCIAIS-SEGURANCA.md` — política de secrets
- `CHANGELOG.md` — histórico de alterações

## Especializado
- **i18n — Política de privacidade e RGPD:** o texto longo da página `/privacidade` e blocos `rgpd` não deve ser editado só no excerto de `src/locales/*.json`. Fonte canónica: **`scripts/privacy-locale-{pt,en,es}.json`** e **`scripts/rgpd-locale-{pt,en,es}.json`**. Em cada **`npm run build`** (e **`OPTIMIZAR.bat`**) corre **`prebuild`** → `npm run merge-locales`, que injeta esses JSON nas chaves `privacy` e `rgpd`. Manual: `node scripts/merge-privacy-locales.js` e `node scripts/merge-rgpd-locales.js`. Se isso falhar, em produção podem aparecer chaves cruas (ex.: `privacy.introWho`). Ver `README.md` → “Onde editar”.
- **Condições gerais de venda (CGVS):** rota `https://navel.pt/condicoes-gerais` — conteúdo em `src/data/cgvs-pt.js` (IMP.01); UI `src/pages/CondicoesGerais.jsx`; após alterar texto legal, rever `public/sitemap.xml`, i18n `cgvs.*` e deploy.
- `docs/CATALOGOS-BOLAS-BETA-TELWIN.md` — ritual de actualização: cartões Beta (PDFs/capas Bolas) e Telwin (PDF local + capa)
- `docs/SUPABASE.md` — setup e operação Supabase
- `docs/SEO.md` — otimização SEO
- `docs/RESPONSIVIDADE.md` — padrões responsive
- `docs/OTIMIZACOES.md` — performance/build

## Regra de ouro
Antes de fechar uma fase:
1. validar setup + build local;
2. rever credenciais e `.gitignore`;
3. atualizar docs alterados, changelog e nota curta de sessão;
4. só depois preparar publicação.

