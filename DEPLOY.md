# Publicação no cPanel

Como publicar o site da Navel (navel.pt) no cPanel.

> **Deploy automático** (`npm run deploy:*`): **SFTP** (ex. navel.pt, porta **11022**) ou **FTPS** conforme `.env.cpanel`. Ver `docs/DEPLOY-AUTOMATICO-CPANEL.md` e `docs/HOSTING-CIBERCONCEITO-NAVEL.md`. O fluxo com **ZIP** no File Manager continua como fallback.

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
4. Faz **build** (`npm run build`), que inclui **`prebuild`** → **`merge-locales`** (política de privacidade e RGPD a partir de `scripts/privacy-locale-*.json` e `rgpd-locale-*.json` → `src/locales`, mais **patch PT** `scripts/pt-ui-patch-data.mjs` → `pt.json`) e só depois o Vite
5. Cria **`navel-publicar.zip`** com `node scripts/make-zip.js` (conteúdo na **raiz** do ZIP; **sem** `catalogos/` por defeito — PDFs ficam no servidor)

Para publicação **completa** com catálogos no ZIP: `node scripts/make-zip.js --with-catalogos`. O **OPTIMIZAR.bat** pode incluir passos extra de imagens; o ZIP final segue as regras do `make-zip.js`.

**Traduções:** editar os JSON em **`scripts/`** conforme `docs/INDEX.md` e `README.md`. O build **repõe** `privacy` / `rgpd` a partir de `privacy-locale-*` / `rgpd-locale-*` e **funde** o copy público em PT a partir de **`scripts/pt-ui-patch-data.mjs`** — não editar só `pt.json` para esse conteúdo sem actualizar o patch, senão a próxima `merge-locales` pode sobrescrever.

---

## 2. Upload no cPanel

**Opção A — Deploy automático (recomendado):**

```powershell
npm run deploy:all -- --yes
```

Envia `dist/` (sem catálogos) + todos os `public/*.php` via **SFTP ou FTPS** para
`public_html` (caminho configurado em `CPANEL_REMOTE_ROOT`). Upload incremental por SHA-1. Ver `docs/DEPLOY-AUTOMATICO-CPANEL.md`.

**Opção B — File Manager manual (fallback):**

1. Ir a `public_html` (ou raiz do domínio)
2. Upload de **navel-publicar.zip**
3. Botão direito no ZIP → **Extract**
4. Apagar o ficheiro ZIP após extrair

**Alternativa:** Enviar manualmente todo o conteúdo de `dist/` (index.html, assets/, images/, robots.txt, sitemap.xml, send-contact.php, .htaccess).

---

## 3. Estrutura no servidor

Na mesma conta cPanel coexistem o **site institucional** (este repo) e a app operacional **AT_Manut** (outro repositório), sob o mesmo domínio **www.navel.pt**:

```
public_html/
├── index.html              ← navel-site (SPA raiz)
├── favicon.ico
├── robots.txt
├── sitemap.xml
├── send-contact.php
├── documentos-api.php      ← Área reservada / integrações (ver docs)
├── .htaccess
├── assets/
├── images/
├── api/                    ← AT_Manut: PHP (data.php, db.php, config.php, …)
├── manut/                  ← AT_Manut: PWA (index.html, assets/, …)
└── uploads/                ← partilhado (ex. machine-docs, brand-logos)
```

URLs limpas (ex.: `https://navel.pt/contacto`). O ficheiro **`.htaccess`** no `dist/` faz fallback para `index.html` nas rotas da SPA e redirecciona **www → navel.pt** (sem www).

**AT_Manut:** `https://www.navel.pt/manut` (ou equivalente); API típica `https://www.navel.pt/api`. Deploy da app e da API: ver o repositório **AT_Manut** (`docs/DEPLOY_CHECKLIST.md`). Para enviar **só** um PHP da API com as credenciais deste projeto: `docs/DEPLOY-AUTOMATICO-CPANEL.md` → secção *AT_Manut (ficheiros em `public_html/api/`)*.

**Alojamento partilhado:** o mesmo `public_html/` é um namespace único — donos por pasta, sem homónimos acidentais nem substituição cega de `api/data.php`. Política e checklist: **`../AT_Manut/docs/CPIANEL-NAVEL-SHARED-HOSTING.md`**.

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
