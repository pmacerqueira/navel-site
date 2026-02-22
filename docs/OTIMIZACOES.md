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

- **OPTIMIZAR.bat** — pipeline único: thumbnails → verificar imagens → otimizar imagens → build → `navel-publicar.zip`
- Favicon gerado no build a partir do logo
- HashRouter: sem reescritas no servidor (cPanel estático)

---

## Acessibilidade e mobile

- Skip link, aria-labels, focus-visible
- Header mobile: hamburger até 1024px, logo e botões proporcionais
- Botão WhatsApp reduzido em mobile/tablet

---

## Manutenção

- Novas páginas: atualizar `sitemap.xml` e `PageTitle.jsx` (ROUTE_TITLES)
- Atualizar `og-image.png` (1200×630) se mudar identidade visual
