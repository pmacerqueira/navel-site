# Publicação no cPanel

Como publicar o site da Navel (navel.pt) no cPanel.

---

## Pré-requisitos

- Conta cPanel (File Manager ou FTP)
- Domínio apontado (navel.pt ou www.navel.pt)

---

## 1. Preparar o build

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

**File Manager:**

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

Alterar código local → executar **OPTIMIZAR.bat** → enviar novo ZIP para o servidor, substituindo o anterior. Os hashes nos assets garantem que o browser carrega as novas versões.

**Miniaturas em `public/images/catalogos/`:** Estão no `.gitignore`; num clone limpo é preciso as gerar antes do build. O **OPTIMIZAR.bat** já corre os scripts de descarga (Beta: capas 2026 via CDN Bolas + C45/RSC50 via Proxira; Facom; XTOOLS). À mão, só Beta: `node scripts/download-beta-thumbnails.js`.

**Nota sobre catálogos:** A pasta `catalogos/` (PDFs) **não** é incluída no ZIP por defeito. Já está no cPanel e não precisa de ser re-enviada a cada deploy. Só enviar quando houver novos catálogos ou alterações nessa pasta.

Para gerar um ZIP **com** catálogos (ex: ao adicionar novos PDFs):

```
node scripts/make-zip.js --with-catalogos
```
