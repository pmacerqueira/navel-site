# Índice Rápido de Documentação — navel-site

## Continuidade entre agentes (obrigatório)
- Não assumir memória global automática entre chats/sessões.
- Não assumir aprendizagem permanente automática de um modelo para outro.
- A continuidade real vem de: código, `.cursor/rules`, `CHANGELOG.md` e esta documentação.
- Em cada nova conversa, iniciar com resumo curto: objetivo, estado atual, risco principal, ficheiros canónicos e próxima ação.

## Essencial
- `README.md` — comandos e visão geral
- `DEPLOY.md` — publicação cPanel
- **`docs/DEPLOY-AUTOMATICO-CPANEL.md`** — **upload automático para cPanel** (FTPS/SFTP/UAPI com dry-run e incremental — `npm run deploy:probe` / `deploy:dry` / `deploy:all`; secção **AT_Manut** para enviar PHP em `public_html/api/` com o mesmo `.env.cpanel`)
- **`../AT_Manut/docs/CPIANEL-NAVEL-SHARED-HOSTING.md`** (repo irmão) — **namespace único `public_html/`**: donos por pasta, evitar homónimos entre apps, política de `api/data.php` (nunca replace cego)
- **`../AT_Manut/docs/SEGURANCA-REVISAO-NAVEL-PT.md`** (repo irmão) — revisão de segurança navel.pt: riscos, prioridades e próximos passos em linguagem clara
- **`docs/HOSTING-CIBERCONCEITO-NAVEL.md`** — SSH/SFTP **porta 11022**, limites FTP (CiberConceito / navel.pt)
- **`docs/DEPLOY-AREA-RESERVADA-E-ONEDRIVE.md`** — **checklist obrigatória** (build→zip, PHP, OneDrive, i18n, erros a evitar)
- `docs/SETUP.md` — setup local completo
- `docs/TROUBLESHOOTING.md` — resolução de problemas
- `docs/ARQUITETURA.md` — arquitetura e separação com AT_Manut
- `docs/CREDENCIAIS-SEGURANCA.md` — política de secrets (inclui ponte para `NAVEL\.navel-secrets`)
- `CHANGELOG.md` — histórico de alterações

## Especializado
- **i18n — Política de privacidade e RGPD:** o texto longo da página `/privacidade` e blocos `rgpd` não deve ser editado só no excerto de `src/locales/*.json`. Fonte canónica: **`scripts/privacy-locale-{pt,en,es}.json`** e **`scripts/rgpd-locale-{pt,en,es}.json`**. Em cada **`npm run build`** (e **`OPTIMIZAR.bat`**) corre **`prebuild`** → `npm run merge-locales`, que injeta esses JSON nas chaves `privacy` e `rgpd`, e em seguida **`node scripts/apply-pt-ui-patch.mjs`**, que funde **`scripts/pt-ui-patch-data.mjs`** em **`src/locales/pt.json`** (home, footer, contacto, catálogos, hero, CGVS *chrome*, pesquisa, cookies, etc.). Manual: `npm run merge-locales`. Se `privacy`/`rgpd` falharem, em produção podem aparecer chaves cruas (ex.: `privacy.introWho`). Se o patch PT não correr, o site pode voltar a mostrar inglês no corpo das páginas com idioma PT. Ver `README.md` → “Onde editar” e `docs/TROUBLESHOOTING.md` → “Site em inglês com PT seleccionado”.
- **Condições gerais de venda (CGVS):** rota `https://navel.pt/condicoes-gerais` — conteúdo em `src/data/cgvs-pt.js` (IMP.01); UI `src/pages/CondicoesGerais.jsx`; após alterar texto legal, rever `public/sitemap.xml`, i18n `cgvs.*` e deploy.
- `docs/CATALOGOS-BOLAS-BETA-TELWIN.md` — ritual de actualização: cartões Beta (PDFs/capas Bolas) e Telwin (PDF local + capa)
- `docs/SUPABASE.md` — setup e operação Supabase
- `docs/SEO.md` — otimização SEO
- `docs/RESPONSIVIDADE.md` — padrões responsive
- `docs/OTIMIZACOES.md` — performance/build
- `docs/ESTRUTURA.md` — mapa das pastas e ficheiros principais (`src/`, `public/`, `scripts/`)
- **`docs/ROADMAP-SHAREPOINT.md`** — roadmap Área Reservada ↔ OneDrive ↔ AT_Manut (Fase C: fundações navel-site com `at_integration_bearer`; UI **`MaquinaDetalhe` / `data.php` no AT_Manut** ainda por implementar no repo do AT)
- **`docs/INTEGRACAO-BIBLIOTECA-AT-MANUT.md`** — contrato biblioteca única; §10 proxy AT + token serviço

## Regra de ouro
Antes de fechar uma fase:
1. validar setup + build local;
2. rever credenciais e `.gitignore`;
3. atualizar docs alterados, changelog e nota curta de sessão;
4. só depois preparar publicação.

