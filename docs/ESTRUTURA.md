# Estrutura do código — Navel Website

Referência técnica para manutenção. Versão próxima da final (PT, EN, ES).

---

## Fluxo

1. **main.jsx** — i18n, HelmetProvider, BrowserRouter, árvore React
2. **App.jsx** — Rotas, Layout, lazy loading das páginas
3. **Layout.jsx** — PageTitle, Header, main, Breadcrumbs, Footer, CookieConsent, WhatsApp, Tawk

Cada rota → página em `src/pages/`.

---

## Componentes principais

| Componente | Função |
|------------|--------|
| PageTitle | title, meta description, canonical, OG/Twitter, robots por rota (SEO) |
| Header | Nav, logo, idioma (PT/EN/ES), login |
| Footer | Links, carrossel marcas, newsletter |
| Breadcrumbs | Navegação (a11y) |
| CookieConsent | RGPD |
| LanguageSwitcher | Bandeiras PT, EN, ES |
| WhatsAppButton | Botão flutuante |

---

## Dados

| Ficheiro | Conteúdo |
|----------|----------|
| **src/data/brands.js** | Marcas: BRAND_DEFINITIONS, BRANDS_BY_CATEGORY_IDS, BROCHURES (fonte única) |
| **src/constants.js** | NAV_ITEMS, FOOTER_NAV, CATEGORY_KEYS, HERO_SLIDES, HOME_CAMPAIGNS, URLs |
| **src/data/cgvs-pt.js** | Texto das Condições Gerais de Venda e Serviço (IMP.01), consumido por `CondicoesGerais.jsx` |
| **src/i18n.js** | i18next; idioma após consentimento cookies |
| **src/utils/consent.js** | hasCookieConsent(), CONSENT_KEY |

Adicionar marca: editar `brands.js` + colocar logo em `public/images/brands/`.

---

## Estilos

- **index.css** — Tokens, variáveis, base
- **styles/components.css** — Header, Footer, forms, cards, LanguageSwitcher
- **styles/pages.css** — Por página (Home, Produtos, Marcas, etc.)

---

## Traduções

- **src/locales/** — `pt.json`, `en.json`, `es.json` (chaves `section.key`). O **português** está no bundle principal; EN/ES carregam por lazy em `i18n.js`.
- Idioma em `localStorage` só após consentimento (RGPD).
- **Privacidade (texto longo):** fonte em **`scripts/privacy-locale-{pt,en,es}.json`** — fundido na chave `privacy` por **`scripts/merge-privacy-locales.js`**.
- **RGPD:** fonte em **`scripts/rgpd-locale-{pt,en,es}.json`** — fundido na chave `rgpd` por **`scripts/merge-rgpd-locales.js`** (actualiza também `footer.rgpd`).
- **`package.json`:** `npm run merge-locales` executa os dois merges; **`prebuild`** chama `merge-locales` antes de cada `vite build`, para o site publicado não ficar com chaves i18n em falta na política.

---

## Build

- **Antes do Vite:** `prebuild` → `merge-locales` (privacy + rgpd → `src/locales`).
- Vite: chunks (vendor, router, i18n), lazy pages
- Output: `dist/` com index.html, assets/, images/, robots.txt, sitemap.xml, .htaccess, send-contact.php

SEO: ver **docs/SEO.md**.
