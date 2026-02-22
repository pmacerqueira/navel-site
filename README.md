# Navel - Açores | Website

Site institucional da **Navel - Açores, Lda.** — máquinas, ferramentas e equipamentos industriais em Ponta Delgada e Pico da Pedra, Açores.

**Estado:** Versão próxima da final. React 18 + Vite 5, PT/EN/ES, responsivo, SEO otimizado (meta tags, Schema.org, sitemap), publicação via cPanel.

---

## Comandos

| Comando | Uso |
|--------|-----|
| `npm install` | Instalar dependências |
| `npm run dev` | Servidor local (http://localhost:3000) |
| `npm run build` | Build de produção → `dist/` |
| `npm run preview` | Pré-visualizar o build |
| **`OPTIMIZAR.bat`** | Pipeline completo: thumbnails, otimizar imagens, build, ZIP para cPanel |

Rotas em hash: `#/sobre`, `#/produtos`, `#/marcas`, `#/contacto`, etc.

---

## Publicação (cPanel)

1. Executar **`OPTIMIZAR.bat`** → gera `navel-publicar.zip`
2. No cPanel: File Manager → Upload do ZIP → Extract → Apagar o ZIP
3. Ver **`DEPLOY.md`** para pormenores

---

## Onde editar

- **Marcas:** `src/data/brands.js` (BRAND_DEFINITIONS, BRANDS_BY_CATEGORY_IDS) + logos em `public/images/brands/`
- **Textos / idiomas:** `src/locales/pt.json`, `en.json`, `es.json`
- **SEO (título, description, keywords):** `index.html` + `src/components/PageTitle.jsx`

Imagens: ver `public/images/README.md`.

---

## Git / GitHub

Repositório: `https://github.com/pmacerqueira/navel-site`

Push após alterações significativas ou antes de publicar. Usar mensagens claras (ex.: `v1.2 - Atualizar catálogos Milwaukee`).

## Documentação

| Ficheiro | Conteúdo |
|----------|----------|
| **DEPLOY.md** | Publicação no cPanel, estrutura no servidor |
| **docs/SEO.md** | Meta tags, Schema.org, palavras-chave, Search Console |
| **docs/ESTRUTURA.md** | Fluxo da app, componentes, dados |
| **docs/OTIMIZACOES.md** | Performance, build, imagens |
| **PUBLICAR-CHECKLIST.txt** | Checklist antes/depois de publicar |

Área reservada (Supabase): `docs/SUPABASE.md`. Live chat (Tawk.to): `docs/TAWKTO-CHATBOT.md`.

---

## Espaço em disco

- **navel-publicar.zip** (~207 MB) — pode apagar após publicar; gerar de novo com `OPTIMIZAR.bat` quando for preciso.
- **dist/** — pode apagar se não for gerar ZIP em breve; `npm run build` recria.
- **node_modules** — não apagar; `npm install` para reinstalar.

---

*Projeto privado — Navel - Açores, Lda.*
