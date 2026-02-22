# SEO — Navel Website

Resumo do que está implementado e como manter. O site está otimizado para ranking local (Ponta Delgada, Açores) e para pesquisas em PT e EN.

---

## Estado atual

### Meta tags (index.html)

- **Title:** `Navel - Açores | Máquinas, Ferramentas e Acessórios Industriais | Ponta Delgada`
- **Description (PT):** ~155 caracteres, CTA «Consulte-nos»
- **Description (EN):** `meta description` com `lang="en"` para pesquisas em inglês
- **Keywords (PT e EN):** produto + local (ex.: ferramentas manuais Ponta Delgada, power tools Azores)
- **Canonical:** `https://navel.pt/`
- **Robots:** `index, follow` (rotas de login/área reservada usam `noindex` via PageTitle.jsx)
- **Geo:** `geo.region` PT-20, `geo.placename` Ponta Delgada, ilha de São Miguel, Açores, Portugal

### Open Graph e Twitter Card

- og:type, url, title, description, image (1200×630), image:alt
- twitter:card summary_large_image, title, description, image, image:alt
- og:locale pt_PT, alternates en_GB, es_ES

### Schema.org (LocalBusiness)

- @id, name, alternateName, description, image, logo, url, foundingDate (1982)
- telephone, email, address (Ponta Delgada + Pico da Pedra), geo
- openingHours (Mo-Fr 08:00-12:00, 13:00-17:00)
- areaServed: Açores, Azores, ilha de São Miguel, São Miguel Island, Ponta Delgada, Pico da Pedra, Portugal
- serviceType e knowsAbout com termos PT e EN (produto + local)

### Títulos dinâmicos (PageTitle.jsx)

- **Home:** `Navel - Açores | Máquinas, Ferramentas e Acessórios Industriais | Ponta Delgada`
- **Outras páginas:** `[Título da página] | Navel - Açores | Ponta Delgada`
- **404:** `Página não encontrada | Navel - Açores | Ponta Delgada`

### Sitemap e robots

- **public/sitemap.xml** — Home, Sobre, Produtos, Marcas, Milwaukee, Serviços, Novidades, Catálogos, Contacto, Privacidade (com lastmod e priority)
- **public/robots.txt** — Allow /, Sitemap: https://navel.pt/sitemap.xml

---

## Palavras-chave

- **Produto/serviço:** máquinas, ferramentas manuais/elétricas, rolamentos, vedantes, parafusos, sistemas de fixação, correias, compressores, geradores, equipamentos oficina automóvel, assistência técnica.
- **Local:** Ponta Delgada, Açores, ilha de São Miguel, Portugal (e em inglês: Azores, São Miguel Island).
- **Marcas:** Milwaukee, Beta, King Tony, SKF, Facom, Telwin, Kaeser, etc., em PT e EN nas keywords e no Schema.org.

---

## Manutenção

1. **Google Search Console** — Adicionar propriedade https://navel.pt e submeter https://navel.pt/sitemap.xml
2. **Bing Webmaster** — Adicionar site e sitemap
3. **Conteúdo** — Manter H1 descritivos e atualizar campanhas/novidades
4. **og-image.png** — 1200×630 px; substituir mantendo nome e dimensões se mudar a identidade

O site usa **HashRouter**; o Google indexa o conteúdo. Para hospedagem estática (cPanel) não são precisas reescritas no servidor.
