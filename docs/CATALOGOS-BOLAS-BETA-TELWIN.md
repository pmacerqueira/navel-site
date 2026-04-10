# Ritual de actualização — Beta (Bolas) e Telwin

Documento para **humanos** e para **agentes**: manter cartões alinhados com o importador [Bolas S.A.](https://www.bolas.pt) e renovar materiais Telwin quando mudar o ano ou a edição.

---

## 1. Beta Tools — PDFs e capas via Bolas

### Fonte de verdade

1. Abrir **Folhetos** no site Bolas (ex.: [folhetos](https://www.bolas.pt/pt/folhetos_987.html) — o `_987` pode mudar; seguir o menu *Folhetos*).
2. Localizar o **carrossel/banner** onde aparecem as capas Beta (tabela de preços, Action, Worker).
3. **Confirmar o par imagem ↔ PDF** (não assumir números `fileNNN` de memória):
   - *Ver código-fonte da página* ou inspeccionar cada `<a href="...">` à volta de `block2_*.jpg`, `block3_*.jpg`, `block4_*.jpg`.
   - Anotar o **URL completo** do PDF (inclui `cbid`, `cbida`, etc., quando existirem).

### Mapeamento habitual (verificar sempre)

| Papel | PDF (típico) | Thumbnail CDN (ficheiro local) |
|--------|--------------|--------------------------------|
| Tabela / catálogo geral | `file275` ou shortlink | `block2` → `beta-tabela-precos-2026.jpg` |
| **Beta Action** | `file271` | `block3` → `beta-action-2026.jpg` |
| **Beta Worker** | `file224` | `block4` → `beta-worker-2026.jpg` |

- O **`165`** é o ID do banner; pode mudar. Após cada renovação na Bolas, confirmar no código-fonte da página o par `<a href="...file...">` + `<img src="...blockN...">` e, se as capas não baterem certo com o PDF, **só então** trocar no `download-beta-thumbnails.js` qual `blockN` vai para `beta-action` vs `beta-worker`.

- **PDFs:** `file271` = Action; `file224` = Worker — não inverter links.

### Checklist no repositório (Beta)

| Passo | O quê |
|-------|--------|
| 1 | `src/data/brands.js` — constantes exportadas `BOLAS_BETA_TABELA_2026_PDF`, `BOLAS_BETA_ACTION_2026_PDF`, `BOLAS_BETA_WORKER_2026_PDF` (renomear ano no identificador se fizer sentido) e URLs em `BETA_CATALOG_ITEMS`. |
| 2 | `scripts/download-beta-thumbnails.js` — URLs `block2` / `block3` / `block4` alinhados ao HTML Bolas; rever capas vs PDFs ao vivo. |
| 3 | `scripts/verify-catalog-images.js` — nomes em `public/images/catalogos/beta/` (ex.: `beta-tabela-precos-2026.jpg`, `beta-action-2026.jpg`, `beta-worker-2026.jpg`). |
| 4 | `src/locales/pt.json`, `en.json`, `es.json` — chaves `catalogs.betaTabelaPrecos2026`, `catalogs.betaAction2026`, `catalogs.betaWorker2026` com texto **igual ao que a Bolas mostra na capa** (ex. Worker *2025/2* se for o caso). |
| 5 | `src/constants.js` — `HOME_CAMPAIGNS` e `HERO_SLIDES` usam os PDFs importados de `brands.js`; ajustar só se mudarem ficheiros de imagem (`src` dos cartões). |
| 6 | Terminal: `node scripts/download-beta-thumbnails.js` → `node scripts/verify-catalog-images.js` → `npm run optimize-images` → `npm run build`. |
| 7 | `CHANGELOG.md` — uma linha com o que mudou (novos `fileNNN` / banner). |

**Deploy:** os PDFs Beta são **externos** (bolas.pt); o ZIP normal (`npm run make-zip`) **não** precisa de os incluir. Miniaturas sim vão no build/`dist`.

---

## 2. Telwin — magazine / catálogo (local, renovação anual)

Hoje o site serve o PDF **em casa** (`/catalogos/telwin/...`) e uma **capa** em `public/images/campaigns/`. Se no futuro a Bolas passar a ter folheto Telwin com link directo, pode replicar o padrão Beta (URL externo + thumb); até lá, seguir o fluxo abaixo.

### Checklist Telwin (novo ano ou nova edição)

| Passo | O quê |
|-------|--------|
| 1 | Comprimir o PDF; colocar em `public/catalogos/telwin/magazine-telwin-AAAA.pdf` (ou manter nome e substituir o ficheiro). |
| 2 | Capa do magazine: `public/images/campaigns/magazine-telwin-AAAA.png` (ou `.webp`). |
| 3 | `src/data/brands.js` — entrada `telwin.brochure`: `catalogPdf`, `imageSrc`, `titleKey` se necessário. |
| 4 | `src/constants.js` — `HOME_CAMPAIGNS` e `HERO_SLIDES` (URL `/catalogos/telwin/...`, `src` da imagem). |
| 5 | `src/locales/pt.json`, `en.json`, `es.json` — `home.campaignTelwinMagazineTitle` (e outras chaves `catalogs.*` se existirem para Telwin). |
| 6 | `scripts/optimize-images.js` — chave com largura máxima para o novo nome do ficheiro da capa, se mudou. |
| 7 | `public/catalogos/README.md` — tabela de ficheiros esperados, se o nome mudou. |
| 8 | Build + ZIP: para o **novo PDF** ir para produção, **ou** enviar a pasta `catalogos/telwin` manualmente ao cPanel **ou** `node scripts/make-zip.js --with-catalogos` após `npm run build`. |

---

## 3. Para agentes (Cursor) — prompt mínimo

Ao pedir actualização:

> «Actualizar cartões Beta segundo folhetos Bolas [URL da página]` + confirmar thumbs em `download-beta-thumbnails.js` e legendas nos 3 locales.»

ou

> «Renovar Telwin AAAA: PDF + capa + brands.js + constants.js + locales + optimize-images.»

**Ficheiros canónicos:** `src/data/brands.js`, `src/constants.js`, `scripts/download-beta-thumbnails.js`, `scripts/verify-catalog-images.js`, `src/locales/*.json`.

---

## 4. Relação com `OPTIMIZAR.bat`

O batch já corre `download-beta-thumbnails.js` e `verify-catalog-images.js` antes do build. Depois de editar URL no código, volte a executar o pipeline (ou estes dois nós + `npm run build`).
