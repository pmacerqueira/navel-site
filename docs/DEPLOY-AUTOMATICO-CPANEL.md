# Deploy automático para cPanel (www.navel.pt)

> **Objetivo:** permitir que o Cursor/agent envie ficheiros editados diretamente
> para o cPanel sem teres de usar o File Manager à mão.
>
> **Segurança:** credenciais vivem apenas em `.env.cpanel` local (gitignored).
> Nunca são partilhadas com nenhum serviço externo nem commitadas.

> **⚠️ Âmbito — apenas `navel-site` / `www.navel.pt`**
>
> Este pipeline é **exclusivo** do projecto `navel-site`. Outros projectos
> do workspace NAVEL têm ferramentas próprias:
>
> | Projecto | Destino | Ferramenta correcta |
> |---|---|---|
> | `navel-site` | cPanel `public_html/` (raiz do site) | **este pipeline** (`npm run deploy:*`) |
> | `AT_Manut` | cPanel `public_html/manut/` + `public_html/api/` | **PWA:** `npm run build` em **AT_Manut** → `npm run deploy:at-manut -- --yes` em **navel-site** (lê `../AT_Manut/dist`). **API:** `cpanel-deploy.mjs --file=…/servidor-cpanel/api/… --remote=<CPANEL_REMOTE_ROOT>/api`. **Fallback:** `build:zip` + File Manager. Ver **AT_Manut** `docs/DEPLOY_CHECKLIST.md` |
> | `app-stocks-next` | **Vercel** | Vercel CLI / `git push` |
> | `app-ftecnicas` | Desktop/Electron | Build local |
> | `navel-propostas` | Servidor local | Ver `AGENTS.md` do repo |
>
> Os scripts têm um **runtime fence** (`enforceProjectFence`) que aborta se
> forem executados fora de `navel-site/` ou se o host configurado não
> pertencer a `navel.pt`. Esta protecção existe para impedir que uma cópia
> acidental cause uploads para o servidor errado.

## Índice
1. [Visão geral](#visão-geral)
2. [Passo 1 — Descobrir o que o teu cPanel suporta](#passo-1--descobrir-o-que-o-teu-cpanel-suporta)
3. [Passo 2 — Criar credenciais dedicadas](#passo-2--criar-credenciais-dedicadas)
4. [Passo 3 — Preencher `.env.cpanel`](#passo-3--preencher-envcpanel)
5. [Passo 4 — Testar conectividade (`deploy:probe`)](#passo-4--testar-conectividade-deployprobe)
6. [Passo 5 — Usar o deploy](#passo-5--usar-o-deploy)
7. [Troubleshooting](#troubleshooting)
8. [Boas práticas de segurança](#boas-práticas-de-segurança)

---

## Visão geral

São suportados 3 protocolos. Podes configurar mais do que um e o `deploy:probe`
diz quais funcionam no teu cPanel.

**Build antes do deploy:** `npm run build` corre `prebuild` → `merge-locales` (privacidade + RGPD + **patch PT** em `src/locales/pt.json`) e só depois o Vite. Sem um build fresco, o deploy pode enviar um `dist/` desactualizado (incl. textos errados por idioma).

| Protocolo | Quando usar | Segurança |
|---|---|---|
| **SFTP** | Plano com SSH (ex. **navel.pt / CiberConceito**, porta **11022**) | Excelente |
| **FTPS** | Universal; usar conta **FTP dedicada** (`deploy@…`) | Boa (TLS); alguns hosts limitam ligações paralelas |
| **UAPI** (API Token) | Quando FTP/SSH falham e o painel permite tokens | Excelente (token revogável) |

Em **navel.pt**, o suporte recomendou **SFTP na porta 11022** e reduzir ligações FTP paralelas se houver bloqueios — ver **`docs/HOSTING-CIBERCONCEITO-NAVEL.md`**. O `CPANEL_PROTOCOL` em `.env.cpanel` escolhe o modo activo (`sftp` ou `ftps`).

Comandos principais (corridos da pasta `navel-site`):

```powershell
npm run deploy:probe     # testa conectividade dos 3 protocolos
npm run deploy:dry       # mostra o que iria enviar (nunca escreve)
npm run deploy:all       # envia site + PHP (NÃO inclui ZIPs nem catálogos; pede confirmação)
npm run deploy:php       # só public/*.php
npm run deploy:site      # só dist/ (precisa de build prévio; catálogos excluídos)
npm run deploy:zips      # só ZIPs em ../cpanel-upload/ para _deploy-zips/
npm run deploy:at-manut  # ../AT_Manut/dist → public_html/manut/ (precisa build prévio no repo AT_Manut)
npm run deploy:file -- --file=public/documentos-api.php
```

### AT_Manut — PWA em `public_html/manut/`

O alvo **`manut/`** é o build Vite do repositório **irmão** `AT_Manut`: o script resolve `NAVEL_ROOT/AT_Manut/dist` (ou seja, `../AT_Manut/dist` relativamente à pasta `navel-site`).

```powershell
cd c:\Cursor_Projetos\NAVEL\AT_Manut
npm run build
cd c:\Cursor_Projetos\NAVEL\navel-site
npm run deploy:at-manut -- --dry   # opcional: ver o que iria enviar
npm run deploy:at-manut -- --yes
```

### AT_Manut — ficheiros em `public_html/api/`

O **mesmo** `.env.cpanel` e o **mesmo** `cpanel-deploy.mjs` servem para enviar ficheiros PHP que vivem na pasta **`api/`** do servidor (API REST do AT_Manut), desde que indiques o caminho remoto completo da pasta `api` com `--remote`.

Exemplo (Windows; ajusta o caminho local do repo AT_Manut se for diferente):

```powershell
cd c:\Cursor_Projetos\NAVEL\navel-site
node scripts/cpanel-deploy.mjs --file="c:/Cursor_Projetos/NAVEL/AT_Manut/servidor-cpanel/api/data.php" --remote="<CPANEL_REMOTE_ROOT>/api" --yes
```

Substitui `<CPANEL_REMOTE_ROOT>` pelo valor de `CPANEL_REMOTE_ROOT` no teu `.env.cpanel` (ex.: `/home/navel/public_html`). O ficheiro fica em `…/public_html/api/data.php`.

> **Nota:** o modo `--file` calcula o nome remoto a partir da pasta pai do ficheiro local; o `--remote` deve ser **a pasta `api` no servidor**, não o `public_html` raiz.

Documentação canónica do AT_Manut (estrutura `manut` + `api`, RBAC, checklist completo): repositório **AT_Manut**, `docs/DEPLOY_CHECKLIST.md`.

Todos os envios são **incrementais** — ficheiros inalterados são ignorados via
hash SHA-1 guardado em `scripts/.cpanel-deploy-cache.json` (gitignored).

---

## Passo 1 — Descobrir o que o teu cPanel suporta

Entra em https://www.navel.pt:2083/ (ou o endereço de login cPanel que o teu
alojamento te deu) e procura as seguintes secções:

1. **"FTP Accounts"** → garante que existe (quase sempre existe).
2. **"SSH Access"** → se aparecer, SFTP está disponível. Se não aparecer, SFTP
   não está ativo neste plano — ignora o bloco SFTP.
3. **"Manage API Tokens"** (ou "API Tokens") → se existir, podes usar UAPI.
   Alguns planos mais antigos não expõem este menu.

Anota o que encontraste. O mínimo viável é **"FTP Accounts"**.

---

## Passo 2 — Credenciais

### SFTP (recomendado em navel.pt / CiberConceito)

Usa o **utilizador SSH** (normalmente o **nome curto da conta cPanel**, ex. `navel`) e a **password do login do painel** — **não** é a subconta `deploy@`. Porta **11022**. O destino no servidor costuma ser caminho absoluto `CPANEL_REMOTE_ROOT=/home/USER/public_html`.

Podes usar **chave SSH** em vez de password (`CPANEL_SFTP_KEY_PATH`); ver secção SFTP abaixo.

### FTPS — conta FTP dedicada

**Para FTPS**, cria uma **subconta FTP** só para deploy (não uses a password principal no cliente FTP se puderes evitar):

1. Em cPanel → **FTP Accounts** → **Add FTP Account**:
   - **Login:** `deploy` (fica `deploy@navel.pt`)
   - **Password:** gera uma forte (guarda no gestor de passwords)
   - **Directory:** `/public_html` (limita o acesso a esta pasta)
   - **Quota:** Unlimited
2. Após criar, clica em **Configure FTP Client** e anota:
   - **FTP Server** (ex.: `ftp.navel.pt`)
   - **Username** (ex.: `deploy@navel.pt`)
   - **Port** (normalmente 21; se te oferecer "Explicit FTP over TLS", é isso)

### SFTP com chave SSH (opcional)

Em vez de password, podes usar `CPANEL_SFTP_KEY_PATH` + chave autorizada no cPanel (**SSH Access → Manage SSH Keys**). Porta **navel.pt: 11022** — ver **`docs/HOSTING-CIBERCONCEITO-NAVEL.md`**.

### cPanel API Token (opcional)

1. Em cPanel → **Manage API Tokens** → **Create**.
2. **Name:** `cursor-deploy`
3. **Expiration:** define uma data (ex.: 1 ano).
4. Copia o token **imediatamente** — só é mostrado uma vez.

---

## Passo 3 — Preencher `.env.cpanel`

Na raiz de `navel-site`:

```powershell
Copy-Item .env.cpanel.example .env.cpanel
```

Abre `.env.cpanel` e preenche o protocolo que vais usar. **Dois padrões:**

**A) SFTP (navel.pt / CiberConceito)** — caminho absoluto para `public_html`:

```env
CPANEL_HOST=navel.pt
CPANEL_REMOTE_ROOT=/home/SEU_USER/public_html
CPANEL_PROTOCOL=sftp

CPANEL_SFTP_HOST=navel.pt
CPANEL_SFTP_PORT=11022
CPANEL_SFTP_USER=SEU_USER
CPANEL_SFTP_PASSWORD="a-tua-password-com-aspas-se-tiver_=_caracteres_especiais"
```

**B) FTPS** — subconta `deploy@`; se o FTP abre já dentro de `public_html`, usa `CPANEL_REMOTE_ROOT=/`:

```env
CPANEL_HOST=navel.pt
CPANEL_REMOTE_ROOT=/
CPANEL_PROTOCOL=ftps

CPANEL_FTP_HOST=ftp.navel.pt
CPANEL_FTP_PORT=21
CPANEL_FTP_USER=deploy@navel.pt
CPANEL_FTP_PASSWORD=a-tua-password-forte
CPANEL_FTP_SECURE=true
```

> **Importante:** `.env.cpanel` está no `.gitignore`. Confirma com
> `git status` que não aparece antes de commitares.

Segredos consolidados fora do repo: **`C:\Cursor_Projetos\NAVEL\.navel-secrets\navel-secrets.env`** — manter alinhado com `.env.cpanel` ao mudar passwords.

---

## Passo 4 — Testar conectividade (`deploy:probe`)

```powershell
npm run deploy:probe
```

Exemplo com **SFTP** activo:

```
=== cPanel Probe — www.navel.pt ===

Host base:     navel.pt
Remote root:   /home/navel/public_html
Protocolo ativo: sftp

❌ FTPS                 Timeout ou não usado
✅ SFTP                 … · user=na*el@navel.pt:11022
❌ UAPI                 UAPI não configurado

Protocolos OK: sftp
```

Exemplo só com **FTPS**:

```
Protocolo ativo: ftps
✅ FTPS                 … @ftp.navel.pt:21
❌ SFTP                 …
```

Se FTPS falhar com `530 Login incorrect`, revê user/password. Se falhar com
`unable to get local issuer certificate` ou erro TLS, vê
[Troubleshooting](#troubleshooting).

---

## Passo 5 — Usar o deploy

### Fluxo recomendado (sempre dry-run primeiro)

```powershell
# 1. ver o que ia ser enviado
npm run deploy:dry

# 2. se o resumo parecer bem, enviar de facto
npm run deploy:all -- --yes
```

Ou por partes:

```powershell
# só editei PHP:
npm run deploy:php -- --yes

# só editei o frontend (já fiz build):
npm run build
npm run deploy:site -- --yes

# enviar um único ficheiro:
npm run deploy:file -- --file=public/documentos-api.php --yes
```

### Flags úteis

| Flag | Efeito |
|---|---|
| `--dry` | Mostra o que ia enviar, não escreve nada (default se faltar `--yes`) |
| `--yes` | Confirma o envio (obrigatório para escrever no cPanel) |
| `--force` | Ignora a cache de hashes (re-envia tudo) |
| `--protocol=sftp` | Override do protocolo do `.env.cpanel` |
| `--remote=/public_html/teste` | Override do destino (útil para testar em pasta separada) |
| `--file=CAMINHO` | Envia um ficheiro específico |
| `--with-catalogos` | No `--site`, inclui `dist/catalogos/` e `dist/images/catalogos/` (por defeito são excluídos — os PDFs já vivem no cPanel) |

### Notas importantes sobre o scope

- **`--all` = `--site` + `--php`**, NÃO inclui `--zips` nem catálogos. Se
  precisares de enviar catálogos PDF novos, corre `npm run deploy:site -- --with-catalogos --yes`.
- **`--zips`** é para enviar os pacotes gerados pelo `cpanel:pack` para uma
  subpasta `_deploy-zips/` — útil se preferires extrair manualmente no File
  Manager em vez de usar `--all`.

### Upload incremental

Após cada envio bem-sucedido, guarda hash SHA-1 em
`scripts/.cpanel-deploy-cache.json`. No envio seguinte, ficheiros com hash igual
são ignorados. Para forçar re-envio completo, apaga esse ficheiro ou usa
`--force`.

---

## Troubleshooting

### FTPS falha com erro TLS / certificado

Alguns cPanel usam certificados self-signed internos. O `basic-ftp` por defeito
é estrito. Como workaround:

1. Preferível: corrige o certificado no host.
2. Alternativa temporária: no `.env.cpanel` muda `CPANEL_FTP_SECURE=false`
   (downgrade para FTP sem TLS — **só usar em rede de confiança**; FTP normal
   envia credenciais em texto claro).
3. Melhor alternativa: usa SFTP ou UAPI.

### `530 Login incorrect`

- Confirma que o user inclui o domínio: `deploy@navel.pt` (não só `deploy`).
- Alguns hosts só aceitam o "mailbox-style" (`deploy%navel.pt`).
- Testa com FileZilla primeiro para isolar credencial vs código.

### `ECONNREFUSED` / timeout

- Porta bloqueada por firewall. Testa de outra rede.
- Se o host usa porta não-standard (990 para FTPS implícito, 2222 ou **11022** para SSH/SFTP),
  ajusta `CPANEL_FTP_PORT` / `CPANEL_SFTP_PORT`. **navel.pt:** ver `docs/HOSTING-CIBERCONCEITO-NAVEL.md`.
- **FTP:** alguns hosts (ex. CiberConceito) limitam ligações simultâneas; se houver bloqueios temporários, reduzir paralelismo no cliente FTP para **2–3** ligações.

### SFTP: `All configured authentication methods failed`

- User errado. No cPanel, o user SSH costuma ser o **user principal da conta
  cPanel**, não a conta FTP.
- Se usas chave, confirma que a chave pública está autorizada em
  **SSH Access → Manage SSH Keys → Public Keys → Authorize**.

### UAPI devolve `status: 0`

- Token revogado ou expirado.
- O user tem de ser o user cPanel principal (não conta FTP).
- Testa com `curl` directamente (ver docs oficial).

---

## Boas práticas de segurança

1. **FTPS:** preferir **subconta FTP** dedicada (`deploy@`) com chroot a `public_html`. **SFTP:** o utilizador é o da **conta principal** SSH — password forte ou chave; o `cpanel-deploy` só envia ficheiros, não abre shell interactivo.
2. **Passwords e rotação:** uma credencial por serviço; trocar a cada 3–6 meses ou após partilha em canal inseguro (chat, email, ticket).
3. **Scope mínimo:** subconta FTP limita pasta; API token com expiração curta.
4. **`.env.cpanel` e `.navel-secrets`:** ficam só na tua máquina; confirma `git status` antes de commit.
5. **`--dry` primeiro:** confirma lista antes de sobrescrever produção.
6. **Cache de deploy:** detecta ficheiros que mudaram inesperadamente.
7. **Backup:** mantém `public/documentos-api-config.php` em local seguro
   (gestor de passwords ou backup offline) — é gerado no build mas contém
   segredos.
