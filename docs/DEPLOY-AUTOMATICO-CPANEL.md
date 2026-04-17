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
> | `navel-site` | cPanel `www.navel.pt` | **este pipeline** (`npm run deploy:*`) |
> | `AT_Manut` | cPanel `public_html/manut/` | `npm run build:zip` + upload manual |
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

| Protocolo | Quando usar | Segurança |
|---|---|---|
| **FTPS** (default) | Funciona em praticamente todos os planos cPanel | Boa (TLS obrigatório) |
| **SFTP** | Só se o plano tiver SSH ativo | Excelente |
| **UAPI** (API Token) | Alternativa HTTPS na porta 2083 | Excelente (token revogável) |

Comandos principais (corridos da pasta `navel-site`):

```powershell
npm run deploy:probe     # testa conectividade dos 3 protocolos
npm run deploy:dry       # mostra o que iria enviar (nunca escreve)
npm run deploy:all       # envia site + PHP (NÃO inclui ZIPs nem catálogos; pede confirmação)
npm run deploy:php       # só public/*.php
npm run deploy:site      # só dist/ (precisa de build prévio; catálogos excluídos)
npm run deploy:zips      # só ZIPs em ../cpanel-upload/ para _deploy-zips/
npm run deploy:file -- --file=public/documentos-api.php
```

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

## Passo 2 — Criar credenciais dedicadas

**Nunca uses a conta cPanel principal para uploads automatizados.**

### FTPS (recomendado)

1. Em cPanel → **FTP Accounts** → **Add FTP Account**:
   - **Login:** `deploy` (fica `deploy@navel.pt`)
   - **Password:** gera uma forte (guarda no gestor de passwords)
   - **Directory:** `/public_html` (limita o acesso a esta pasta)
   - **Quota:** Unlimited
2. Após criar, clica em **Configure FTP Client** e anota:
   - **FTP Server** (ex.: `ftp.navel.pt`)
   - **Username** (ex.: `deploy@navel.pt`)
   - **Port** (normalmente 21; se te oferecer "Explicit FTP over TLS", é isso)

### SFTP (opcional, só se tiveres SSH)

1. Em cPanel → **SSH Access** → **Manage SSH Keys** → **Generate a New Key**,
   ou usa uma chave existente. Autoriza a chave pública.
2. Descarrega a chave privada para um caminho seguro (ex.:
   `C:\Users\Pedro\.ssh\navel_cpanel_ed25519`) e **não a coloques no repo**.
3. Utilizador e host são geralmente o teu user cPanel em `navel.pt` na
   porta 22 (alguns hosts usam 2222).

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

Abre `.env.cpanel` e preenche **apenas o(s) bloco(s) que vais usar**. Exemplo
mínimo (só FTPS):

```env
CPANEL_HOST=navel.pt
CPANEL_REMOTE_ROOT=/public_html
CPANEL_PROTOCOL=ftps

CPANEL_FTP_HOST=ftp.navel.pt
CPANEL_FTP_PORT=21
CPANEL_FTP_USER=deploy@navel.pt
CPANEL_FTP_PASSWORD=a-tua-password-forte
CPANEL_FTP_SECURE=true
```

> **Importante:** `.env.cpanel` está no `.gitignore`. Confirma com
> `git status` que não aparece antes de commitares.

Nota sobre `CPANEL_REMOTE_ROOT`: se a conta FTP já te coloca dentro de
`public_html` ao ligar, deixa `/` — caso contrário, `/public_html`.

---

## Passo 4 — Testar conectividade (`deploy:probe`)

```powershell
npm run deploy:probe
```

Saída esperada:

```
=== cPanel Probe — www.navel.pt ===

Host base:     navel.pt
Remote root:   /public_html
Protocolo ativo: ftps

✅ FTPS                 240ms · dir=/public_html · user=de********pt@ftp.navel.pt:21
❌ SFTP                 SFTP não configurado (falta host/user/password ou chave)
❌ UAPI (API Token)    UAPI não configurado (falta host/user/token)

Protocolos OK: ftps
Sugestão CPANEL_PROTOCOL=ftps
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
- Se o host usa porta não-standard (990 para FTPS implícito, 2222 para SSH),
  ajusta `CPANEL_FTP_PORT` / `CPANEL_SFTP_PORT`.

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

1. **Conta dedicada:** nunca a conta cPanel principal para o deploy.
2. **Password única:** gerada pelo gestor, diferente de tudo o resto.
3. **Rotação:** troca a credencial a cada 3–6 meses ou quando houver suspeita.
4. **Scope mínimo:** FTP limita a pasta; API token com expiração curta.
5. **`.env.cpanel` nunca sai do teu PC:** verifica sempre antes de commit.
6. **`--dry` primeiro:** confirma lista antes de sobrescrever produção.
7. **Cache de deploy:** ajuda a detectar ficheiros que mudaram inesperadamente
   (se algo aparece lá que não editaste, investiga).
8. **Backup:** mantém `public/documentos-api-config.php` em local seguro
   (gestor de passwords ou backup offline) — é gerado no build mas contém
   segredos.
