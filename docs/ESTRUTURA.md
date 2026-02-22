# Estrutura do código — Navel Website

Referência técnica para manutenção. Versão próxima da final (PT, EN, ES).

---

## Fluxo

1. **main.jsx** — i18n, HashRouter, árvore React
2. **App.jsx** — Rotas, Layout, lazy loading das páginas
3. **Layout.jsx** — PageTitle, Header, main, Breadcrumbs, Footer, CookieConsent, WhatsApp, Tawk

Cada rota → página em `src/pages/`.

---

## Componentes principais

| Componente | Função |
|------------|--------|
| PageTitle | document.title por rota (SEO) |
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

- **src/locales/** — pt.json, en.json, es.json (chaves tipo `section.key`)
- Idioma em localStorage só após consentimento (RGPD)

---

## Build

- Vite: chunks (vendor, router, i18n), lazy pages
- Output: `dist/` com index.html, assets/, images/, robots.txt, sitemap.xml, .htaccess, send-contact.php

SEO: ver **docs/SEO.md**.
