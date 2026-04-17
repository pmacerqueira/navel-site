# Website institucional — José Gonçalves Cerqueira (NAVEL-AÇORES), Lda.

Site institucional da **José Gonçalves Cerqueira (NAVEL-AÇORES), Lda.** — máquinas, ferramentas e equipamentos industriais em Ponta Delgada e Pico da Pedra, Açores.

**Estado:** Versão próxima da final. React 18 + Vite 5, PT/EN/ES, responsivo, SEO otimizado (meta tags, Schema.org, sitemap), publicação via cPanel.

---

## Comandos

### Desenvolvimento / build

| Comando | Uso |
|--------|-----|
| `npm install` | Instalar dependências |
| `npm run dev` | Servidor local (http://localhost:3000) |
| `npm run build` | Build de produção → `dist/` |
| `npm run preview` | Pré-visualizar o build |
| **`OPTIMIZAR.bat`** | Pipeline completo: thumbnails, otimizar imagens, build, ZIP para cPanel (fallback legado) |

### Deploy automático para cPanel (FTPS) — desde `0.2.5`

| Comando | Uso |
|--------|-----|
| `npm run deploy:probe` | Testa conectividade FTPS/SFTP/UAPI com as credenciais em `.env.cpanel` |
| `npm run deploy:dry` | Mostra o que seria enviado (nada é escrito) |
| `npm run deploy:php -- --yes` | Envia `public/*.php` para o cPanel |
| `npm run deploy:site -- --yes` | Envia `dist/` (sem catálogos) para o cPanel |
| `npm run deploy:all -- --yes` | Envia site + PHP (sem catálogos, sem ZIPs) |
| `npm run deploy:file -- --file=public/X.php --yes` | Envia um ficheiro específico |

Setup único em `docs/DEPLOY-AUTOMATICO-CPANEL.md` (conta FTP dedicada, `.env.cpanel` local, gitignored). Upload incremental: só ficheiros alterados (SHA-1).

Rotas com URL limpa: `/sobre`, `/produtos`, `/marcas`, `/contacto`, etc. (BrowserRouter + `.htaccess` no servidor).

---

## Publicação (cPanel)

**Caminho primário (automatizado):**

1. Uma vez: seguir setup em `docs/DEPLOY-AUTOMATICO-CPANEL.md` (criar conta FTP dedicada + `.env.cpanel`)
2. Editar o código / fazer `npm run build`
3. `npm run deploy:dry` (ver o plano) → `npm run deploy:all -- --yes` (enviar)

**Caminho manual (fallback, ainda suportado):**

1. Executar **`OPTIMIZAR.bat`** (ou `npm run build` → `npm run make-zip`) → gera `navel-publicar.zip` a partir de **`dist/`**
2. No cPanel: File Manager → Upload do ZIP → Extract → Apagar o ZIP
3. Ver **`DEPLOY.md`** para pormenores
4. **Área reservada / documentos PHP / OneDrive:** **`docs/DEPLOY-AREA-RESERVADA-E-ONEDRIVE.md`** (ordem build→zip, apagar `assets/`, erros frequentes)

---

## Onde editar

- **Marcas:** `src/data/brands.js` (BRAND_DEFINITIONS, BRANDS_BY_CATEGORY_IDS) + logos em `public/images/brands/`
- **Textos / idiomas:** `src/locales/pt.json`, `en.json`, `es.json` — em cada **`npm run build`** corre automaticamente `merge-locales` (injeta `scripts/privacy-locale-*.json` e `rgpd-locale-*.json` nas chaves `privacy` e `rgpd`). Para editar a política de privacidade longa, use os ficheiros em **`scripts/privacy-locale-{pt,en,es}.json`** (não só o excerto em `src/locales`).
- **SEO:** `index.html` (fallback) + `src/components/PageTitle.jsx` (react-helmet-async) + `src/locales/*.json` (`seo.homeDescription`, `seo.notFoundDescription` e `lead` das páginas)

Imagens: ver `public/images/README.md`.

---

## Git / GitHub

Repositório: `https://github.com/pmacerqueira/navel-site`

Push após alterações significativas ou antes de publicar. Usar mensagens claras (ex.: `v1.2 - Atualizar catálogos Milwaukee`).

## Documentação

### Fonte canónica (ordem de prioridade)
1. `docs/ARQUITETURA.md`
2. `docs/INDEX.md`
3. `CHANGELOG.md`
4. `DEPLOY.md`

### Núcleo canónico
- `docs/INDEX.md` — mapa oficial dos documentos.
- `docs/ARQUITETURA.md` — decisões técnicas e limites de projeto.
- `CHANGELOG.md` — histórico de mudanças e decisões.
- `DEPLOY.md` — processo de publicação.
- `docs/DEPLOY-AUTOMATICO-CPANEL.md` — upload automático FTPS/SFTP/UAPI.

### Operação
- `docs/CATALOGOS-BOLAS-BETA-TELWIN.md` — actualizar cartões Beta (Bolas) e Telwin
- `docs/SETUP.md`
- `docs/TROUBLESHOOTING.md`
- `docs/CREDENCIAIS-SEGURANCA.md`
- `docs/SEO.md`
- `docs/OTIMIZACOES.md`
- `PUBLICAR-CHECKLIST.txt`

Área reservada (Supabase): `docs/SUPABASE.md`. Live chat (Tawk.to): `docs/TAWKTO-CHATBOT.md`.

> Nota de arquitetura: `navel-site` usa Supabase na área reservada; o projeto `AT_Manut` usa MySQL+PHP/cPanel como fonte de verdade. Não misturar decisões entre projetos.
>
> Nota de continuidade entre agentes: não existe memória global automática entre todos os chats/modelos; a continuidade é mantida no repositório (código + regras + changelog + documentação).

---

## Espaço em disco

- **navel-publicar.zip** (~207 MB) — pode apagar após publicar; gerar de novo com `OPTIMIZAR.bat` quando for preciso.
- **dist/** — pode apagar se não for gerar ZIP em breve; `npm run build` recria.
- **node_modules** — não apagar; `npm install` para reinstalar.

---

*Projecto privado — José Gonçalves Cerqueira (NAVEL-AÇORES), Lda.*
