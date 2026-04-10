# SEO — Navel Website

Resumo do que está implementado e como manter. O site está otimizado para ranking local (Ponta Delgada, Açores) e para pesquisas em PT, EN e ES.

---

## Estado atual

### Domínio canónico e servidor (`.htaccess`)

- **HTTPS** forçado.
- **301** de `www.navel.pt` → `https://navel.pt` (alinhado com `canonical` e OG no HTML).
- **SPA fallback:** pedidos que não correspondem a ficheiros ou pastas reais são servidos com `index.html` (rotas limpas com **BrowserRouter**).
- **MIME:** `application/xml` para `.xml` (sitemap).

### Meta tags estáticas (`index.html`)

- **Title e description (PT)** por defeito antes do JavaScript (fallback para crawlers lentos).
- **Canonical:** `https://navel.pt/`
- **Robots:** `index, follow` (páginas privadas passam a `noindex` em runtime).
- **Geo:** `geo.region` PT-20, `geo.placename` Ponta Delgada, ilha de São Miguel, Açores, Portugal
- **hreflang:** `pt`, `en`, `es`, `x-default` → `https://navel.pt/` (idioma escolhido na UI; URLs únicas).
- **Open Graph / Twitter (home):** valores iniciais; **react-helmet-async** actualiza por rota e idioma após carregar a app.

> **Nota:** As meta **keywords** foram removidas do HTML — o Google não as usa para ranking; termos relevantes mantêm-se no **Schema.org** (`knowsAbout`, descrições).

### Por rota (`PageTitle.jsx` + `react-helmet-async`)

- **`<title>`** — home com título longo institucional (razão social **José Gonçalves Cerqueira (NAVEL-AÇORES), Lda.**); restantes: `[i18n] | José Gonçalves Cerqueira (NAVEL-AÇORES), Lda. | Ponta Delgada`; 404 com `notFound.title`.
- **`meta name="description"`** — home: `seo.homeDescription` nos JSON de locale; outras rotas: `lead` da página (ex. `about.lead`); 404: `seo.notFoundDescription`.
- **`link rel="canonical"`** — `https://navel.pt` + path (ex. `/contacto`).
- **`og:url`, `og:title`, `og:description`, `og:image`, Twitter Card** — espelham a página actual.
- **`noindex, nofollow`:** `/login`, `/registar`, `/area-reservada`, `/admin`, `/aguardar-aprovacao`.

### Schema.org (LocalBusiness)

- Mantido em `index.html`: @id, moradas, horários, `areaServed`, `serviceType`, `knowsAbout` (PT/EN).

### Sitemap e robots

- **`public/sitemap.xml`** — URLs sem fragmento: `/`, `/sobre`, `/produtos`, `/marcas`, `/milwaukee`, `/servicos`, `/catalogos`, `/contacto`, `/privacidade`, `/rgpd`, `/condicoes-gerais` (com `lastmod` e `priority`). `/novidades` não está listada (redirecciona para `/catalogos`).
- **`public/robots.txt`** — `Allow: /`, `Sitemap: https://navel.pt/sitemap.xml`

### URLs antigas com hash

- Ao abrir `https://navel.pt/#/contacto`, o cliente normaliza para `/contacto` antes do React Router (compatibilidade com links antigos).

---

## Palavras-chave (conteúdo e dados estruturados)

- **Produto/serviço:** máquinas, ferramentas, rolamentos, compressores, geradores, assistência técnica, etc.
- **Local:** Ponta Delgada, Açores, ilha de São Miguel, Portugal (e EN: Azores, São Miguel Island).
- **Marcas:** Milwaukee, Beta, King Tony, SKF, Facom, Telwin, Kaeser, etc. — no texto das páginas e no JSON-LD.

---

## Manutenção

1. **Google Search Console** — Propriedade `https://navel.pt` (domínio preferido sem www); submeter `https://navel.pt/sitemap.xml`. Opcional: propriedade `www` só para monitorizar redirecções.
2. **Bing Webmaster** — Site e sitemap.
3. **Novas páginas públicas** — Adicionar rota em `App.jsx`, entrada em `PageTitle.jsx` (`ROUTE_CONFIG`), chaves i18n com `title` + `lead` (o `lead` serve de meta description), e URL em `public/sitemap.xml`.
4. **Supabase** — Manter `https://navel.pt/login` (e variante com www se necessário) em **Redirect URLs** para confirmação de email.
5. **og-image.png** — 1200×630 px na raiz de `public/images/`.

---

## Dependência

- **`react-helmet-async`** — `HelmetProvider` em `main.jsx`; meta dinâmica em `PageTitle.jsx`.
