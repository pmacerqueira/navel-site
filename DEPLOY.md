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
4. Faz build e cria **`navel-publicar.zip`** com o conteúdo de `dist/`

Usar sempre **OPTIMIZAR.bat** para publicar; assim o ZIP inclui todos os recursos (incl. catálogos).

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

URLs são em hash (ex.: https://navel.pt/#/contacto). Não é preciso configurar reescritas.

---

## 4. Verificação

- https://navel.pt — página principal
- https://navel.pt/#/contacto — navegação e formulário
- https://navel.pt/sitemap.xml e /robots.txt — acessíveis
- Enviar um teste pelo formulário (destino: comercial@navel.pt)

---

## Atualizações

Alterar código local → executar **OPTIMIZAR.bat** → enviar novo ZIP (ou conteúdo de `dist/`) para o servidor, substituindo o anterior. Os hashes nos assets garantem que o browser carrega as novas versões.
