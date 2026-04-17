# Publicação no cPanel

Como publicar o site da Navel (navel.pt) no cPanel.

> **Desde `0.2.5`** o caminho primário é o **deploy automático via FTPS**
> (`npm run deploy:*`). Ver `docs/DEPLOY-AUTOMATICO-CPANEL.md` para setup
> único (conta FTP dedicada + `.env.cpanel`). O fluxo manual abaixo continua
> válido como fallback ou para quem preferir arrastar um ZIP no File Manager.

---

## Via rápida (automatizada, recomendada)

```powershell
npm run build
npm run deploy:dry      # ver o que vai ser enviado
npm run deploy:all -- --yes
```

Detalhes, troubleshooting e setup em
**[`docs/DEPLOY-AUTOMATICO-CPANEL.md`](docs/DEPLOY-AUTOMATICO-CPANEL.md)**.

Os catálogos PDF continuam **excluídos** por defeito (já vivem no cPanel).
Para os incluir ao adicionar novos: `npm run deploy:site -- --with-catalogos --yes`.

---

## Pré-requisitos

- Conta cPanel (File Manager ou FTP)
- Domínio apontado (navel.pt ou www.navel.pt)

---

## 1. Preparar o build

**Área reservada + documentos PHP + OneDrive:** seguir **`docs/DEPLOY-AREA-RESERVADA-E-ONEDRIVE.md`** — **sempre** `npm run build` **antes** de `npm run make-zip` (o ZIP sai de `dist/`, onde o Vite copia `public/`).

Executar **`OPTIMIZAR.bat`** na pasta do projeto. O script:

1. Descarrega thumbnails (Facom, Beta, XTOOLS) para `public/images/catalogos/`
2. Verifica imagens obrigatórias
3. Otimiza imagens (sharp)
4. Faz **build** (`npm run build`), que inclui **`prebuild`** → **`merge-locales`** (política de privacidade e RGPD a partir de `scripts/privacy-locale-*.json` e `rgpd-locale-*.json` → `src/locales`) e só depois o Vite
5. Cria **`navel-publicar.zip`** com o conteúdo de `dist/`

Usar sempre **OPTIMIZAR.bat** para publicar; assim o ZIP inclui todos os recursos (incl. catálogos).

**Traduções legais longas:** editar os JSON em **`scripts/`** conforme `docs/INDEX.md` e `README.md`; não confiar só em edições parciais dentro de `src/locales/*.json` para `privacy` / `rgpd`, pois o próximo build repõe essas chaves a partir dos ficheiros-fonte.

---

## 2. Upload no cPanel

**Opção A — Deploy automático (recomendado):**

```powershell
npm run deploy:all -- --yes
```

Envia `dist/` (sem catálogos) + todos os `public/*.php` via FTPS para
`/home/navel/public_html/`. Upload incremental por hash SHA-1 — nas vezes
seguintes só envia o que mudou. Ver `docs/DEPLOY-AUTOMATICO-CPANEL.md`.

**Opção B — File Manager manual (fallback):**

1. Ir a `public_html` (ou raiz do domínio)
2. Upload de **navel-publicar.zip**
3. Botão direito no ZIP → **Extract**
4. Apagar o ficheiro ZIP após extrair

**Alternativa:** Enviar manualmente todo o conteúdo de `dist/` (index.html, assets/, images/, robots.txt, sitemap.xml, send-contact.php, .htaccess).

---

## 3. Estrutura no servidor

```
public_html/
├── index.html
├── favicon.ico
├── robots.txt
├── sitemap.xml
├── send-contact.php
├── .htaccess
├── assets/
└── images/          (logo, og-image, flags, brands, campaigns, catalogos)
```

URLs limpas (ex.: `https://navel.pt/contacto`). O ficheiro **`.htaccess`** no `dist/` faz fallback para `index.html` nas rotas da SPA e redirecciona **www → navel.pt** (sem www).

---

## 4. Verificação

- https://navel.pt — página principal
- https://navel.pt/contacto — navegação e formulário
- https://navel.pt/produtos — recarregar (F5) confirma que o `.htaccess` serve a SPA correctamente
- https://navel.pt/privacidade, https://navel.pt/rgpd, https://navel.pt/condicoes-gerais — páginas legais; F5 sem 404
- https://navel.pt/sitemap.xml e /robots.txt — acessíveis (HTTP 200, não 500); o sitemap deve listar `/condicoes-gerais` (além de `/privacidade` e `/rgpd`)
- Enviar um teste pelo formulário (destino: comercial@navel.pt)

---

## Atualizações

**Via automatizada (rápida):**

```powershell
npm run build
npm run deploy:all -- --yes
```

Só envia ficheiros alterados (cache SHA-1 em `scripts/.cpanel-deploy-cache.json`).
Os hashes nos assets garantem que o browser carrega as novas versões.

**Via manual:** alterar código local → executar **OPTIMIZAR.bat** → enviar novo ZIP para o servidor, substituindo o anterior.

**Miniaturas em `public/images/catalogos/`:** Estão no `.gitignore`; num clone limpo é preciso as gerar antes do build. O **OPTIMIZAR.bat** já corre os scripts de descarga (Beta: capas 2026 via CDN Bolas + C45/RSC50 via Proxira; Facom; XTOOLS). À mão, só Beta: `node scripts/download-beta-thumbnails.js`.

**Nota sobre catálogos:** A pasta `catalogos/` (PDFs) **não** é incluída no ZIP nem no `deploy:site` por defeito. Já está no cPanel e não precisa de ser re-enviada a cada deploy. Só enviar quando houver novos catálogos ou alterações nessa pasta.

Para enviar **com** catálogos (ex: ao adicionar novos PDFs):

```powershell
npm run deploy:site -- --with-catalogos --yes
```

Ou gerar ZIP com catálogos:

```powershell
node scripts/make-zip.js --with-catalogos
```
