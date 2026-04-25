# Otimizações — Navel Website

O que está otimizado na versão atual (performance, build, publicação).

---

## Performance

- **Preload** do logo (LCP)
- **Preconnect** para Google Fonts
- **Lazy loading** de páginas (exceto Home) e de idiomas EN/ES
- **Chunks** separados: vendor (React), router, i18n
- **Minificação** JS e CSS no build
- Fontes com `display=swap`

---

## Imagens

- **public/images/** — logo, og-image (1200×630), flags, brands, campaigns, catalogos (facom, beta, xtools, xtools-folhetos, xtools-resumo)
- **scripts/optimize-images.js** — redimensiona e comprime (brands max 400px) antes do build
- Thumbnails dos catálogos obtidos por scripts em `scripts/` (Facom, Beta, XTOOLS)

---

## Publicação

- **Pipeline primário (FTPS automatizado):** `npm run deploy:all -- --yes` (ou `deploy:site` / `deploy:php` / `deploy:file`). Incremental por SHA-1, dry-run disponível em `deploy:dry`. Ver `docs/DEPLOY-AUTOMATICO-CPANEL.md`. Exclusivo do `navel-site` (fence `enforceProjectFence`).
- **Fallback manual (`OPTIMIZAR.bat`):** pipeline único — thumbnails → verificar imagens → otimizar imagens → build → `navel-publicar.zip` para upload no File Manager cPanel.
- **Build (`npm run build`):** hook **`prebuild`** executa **`merge-locales`** — injeta `scripts/privacy-locale-*.json` e `rgpd-locale-*.json` em `src/locales`, depois **`apply-pt-ui-patch.mjs`** (fundir `scripts/pt-ui-patch-data.mjs` em `pt.json`) — evita `/privacidade` com chaves cruas e evita regressão do **site público em inglês** com idioma PT por `pt.json` desactualizado relativamente ao patch.
- Favicon gerado no build a partir do logo
- BrowserRouter: `.htaccess` com fallback para `index.html`, HTTPS e www → canónico

---

## Acessibilidade e mobile

- Skip link, aria-labels, focus-visible
- Header mobile: hamburger até 1024px, logo e botões proporcionais
- Botão WhatsApp reduzido em mobile/tablet

---

## Manutenção

- Novas páginas: atualizar `sitemap.xml` e `PageTitle.jsx` (`ROUTE_CONFIG`)
- Atualizar `og-image.png` (1200×630) se mudar identidade visual
