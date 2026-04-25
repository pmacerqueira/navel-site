# Documentos da área reservada no cPanel (disco)

Por defeito o site **pode** usar o **Storage Supabase** para ficheiros. Se preferir **armazenamento no servidor** (espaço do alojamento, útil para centenas de MB ou vários GB sem depender da quota do Supabase), use a API PHP em `public/documentos-api.php`.

O **login e a aprovação de utilizadores** continuam no **Supabase** (Auth + tabela `profiles`). Só os **ficheiros** da área reservada passam a ficar no **disco do cPanel** quando activa a opção abaixo.

---

## Erro `invalid_token` na área reservada (API PHP)

A API chama o Supabase `GET /auth/v1/user` com o JWT do utilizador e o cabeçalho `apikey` igual à **mesma** chave pública que o site usa (`VITE_SUPABASE_ANON_KEY` no build). No servidor, isso tem de estar em **`documentos-api-config.php`** como `supabase_anon_key` (e `supabase_url` alinhado).

- Se estes valores **não coincidirem** com o projecto Supabase actual, ou estiverem vazios, a API responde **`invalid_token`**.
- O prebuild executa `scripts/sync-documentos-api-config.mjs`, que **actualiza só** `supabase_url`, `supabase_anon_key` e (se definido) `onedrive_cron_token`. **Não apaga** Microsoft, taxonomy, `at_integration_bearer`, etc.
- **Fonte recomendada:** na workspace `NAVEL`, manter os valores correctos em **`..\.navel-secrets\navel-secrets.env`**. O script faz merge: lê `.env` e depois **sobrescreve** com `navel-secrets.env` quando existe (evita um `.env` local desactualizado).
- **Desligar o sync** (útil se o `documentos-api-config.php` local for só cópia manual do servidor): no `.env`, `DOCUMENTOS_API_CONFIG_SYNC=0`.
- Antes de cada gravação, o script guarda backup em **`.doc-api-config-backups/`** (não é copiado para `dist/`).
- **Correcção no cPanel:** editar `public_html/documentos-api-config.php` e colar `supabase_url` + `supabase_anon_key` iguais ao Supabase Dashboard (API Keys), ou voltar a fazer deploy do `documentos-api-config.php` gerado localmente após `npm run build` com secrets correctos.

---

## Checklist rápida

1. No PC: `.env` → `VITE_DOCUMENTOS_API=/documentos-api.php` (ou caminho correcto) → **`npm run build`** → enviar:
   - **Automatizado (preferido):** `npm run deploy:all -- --yes` (envia site + PHP via FTPS incremental). Ver **`docs/DEPLOY-AUTOMATICO-CPANEL.md`**.
   - **Manual:** `npm run make-zip` + upload do ZIP no File Manager. Ver **`docs/DEPLOY-AREA-RESERVADA-E-ONEDRIVE.md`**.
2. Para **só actualizar o PHP da API** sem rebuild do site: `npm run deploy:php -- --yes`.
3. No cPanel (fluxo manual apenas): antes de extrair o ZIP, **apagar `public_html/assets/`** para evitar JS/CSS antigos com hash diferente. O fluxo automatizado substitui pelo nome, por isso não precisa.
4. No Supabase: confirmar URL do projeto e chave anon (Settings → API / API Keys).
5. No cPanel: criar `documentos-api-config.php` a partir do sample, colar o JWT Secret, permissões na pasta de ficheiros, ajustar limites PHP se precisar.
6. No cPanel: criar **`.navel-permissions.json`** dentro de `documentos-store/` (a partir de `.navel-permissions.json.example`). **Sem este ficheiro, a API aplica política _fail-closed_ — só o admin acede.**
7. Testar: utilizador normal (carregar/descarregar); admin `comercial@navel.pt` (criar pasta, apagar, substituir ficheiros).
8. Com build recente: **pesquisa global** (Ctrl+K na área reservada), **metadata no upload** em pastas AT profundas, **pré-visualização** PDF/imagem — requerem `documentos-api.php` actualizado no servidor (incl. `GET download&inline=1` e índice de `search`).

---

## Funcionalidades do portal (SPA + API)

Quando `VITE_DOCUMENTOS_API` está activo, o cliente em `src/lib/documentosCpanelApi.js` expõe:

| Método / uso | Endpoint PHP | Notas |
|--------------|--------------|--------|
| `cpanelSearch` | `GET ?action=search` + `q`, filtros opcionais (`documentType`, `taxonomyNodeId`, …) | Resultados a partir do `.navel-index.json`; permissões por pasta. |
| `cpanelList` | `GET ?action=list&path=` | Devolve `metadata` por ficheiro (incl. `documentType`). |
| `cpanelUploadWithProgress` + `extraFields` | `POST` multipart `action=upload` | Campos extra: `documentType`, `taxonomyNodeId`, `versionLabel`, `notes`, … |
| `cpanelDownloadBlob` | `GET ?action=download&path=` | Com `inline=1` só para **PDF** e **image/** — cabeçalho `Content-Disposition: inline` (pré-visualização no browser). |
| `cpanelSetMetadata` | `POST` JSON `action=set_metadata` | Opcional; correcção de metadata sem novo upload. |

Componentes UI: `PortalCommandPalette.jsx` (Ctrl+K), `DocumentPreviewModal.jsx` (PDF/imagem). Detalhe de roadmap: [`docs/ROADMAP-SHAREPOINT.md`](./ROADMAP-SHAREPOINT.md).

---

## Segurança — `.navel-permissions.json`

- **Sem ficheiro** na pasta de documentos: a API usa regras por omissão (equivalente a listar/descarregar/carregar para utilizadores autenticados nas pastas-mãe), alinhado a instalações antigas.
- **Ficheiro inválido, vazio ou `{}`**: acesso **negado** a utilizadores não-admin até corrigir o JSON (fail-closed).
- Copie [`.navel-permissions.json.example`](../public/documentos-store/.navel-permissions.json.example) para `.navel-permissions.json` e ajuste listas de emails por pasta (`*` = qualquer utilizador aprovado).
- Em `documentos-api-config.php`, defina **`taxonomy_nodes_url`** com URL absoluta (o servidor **não** deduz o host a partir do pedido HTTP). Use **`debug` => true** só em diagnóstico — em produção os erros 500 não expõem mensagens internas.

---

## Parte A — No seu computador (antes de publicar)

### A1. Ficheiro `.env`

Na pasta do projeto (`navel-site`), abra **`.env`**. Se não existir, copie **`.env.example`** para `.env`.

### A2. Activar documentos no disco

Adicione (ou descomente):

```env
VITE_DOCUMENTOS_API=/documentos-api.php
```

- Use **`/documentos-api.php`** se o site estiver na **raiz** do domínio (ex.: `https://navel.pt/documentos-api.php`).
- Se o site estiver numa **subpasta** (ex.: `https://navel.pt/loja/`), use o caminho correcto, por exemplo:

```env
VITE_DOCUMENTOS_API=/loja/documentos-api.php
```

Mantenha também **`VITE_SUPABASE_URL`** e **`VITE_SUPABASE_ANON_KEY`** — são necessários para entrar na área reservada.

### A3. Build e publicação

```bash
npm run build
```

Publicar de uma de duas formas:

- **Automatizado (preferido):** `npm run deploy:all -- --yes` (envia site + PHP via FTPS; cache incremental).
- **Manual:** gerar `navel-publicar.zip` com `npm run make-zip` e enviar no File Manager.

**Importante:** `VITE_DOCUMENTOS_API` é lida **no momento do build**. Se mudar o `.env`, tem de **voltar a fazer o build** e **voltar a subir** os ficheiros gerados.

---

## Parte B — No Supabase (dados para validar token)

1. Entre em [supabase.com](https://supabase.com) e abra o **mesmo projecto** que o site usa (o das chaves do `.env`).
2. **Settings** → **API**.
3. Copie o **JWT Secret** (segredo com que o projecto assina o `access_token` do utilizador).
4. **Não** use aqui a chave **anon** nem a **service_role** — só o **JWT Secret**.

Este valor vai para `documentos-api-config.php` no servidor (passo C2).

---

## Parte C — No cPanel (servidor)

### C1. Ficheiros que devem existir após o deploy

Na pasta web (normalmente **`public_html`**, ou onde estiver o `index.html` do site):

- `documentos-api.php`
- `documentos-api-config.sample.php`
- Pasta **`documentos-store`** com **`.htaccess`** (bloqueia acesso HTTP directo aos ficheiros pela URL)

O ficheiro **`documentos-api-config.php`** **não** vem no repositório com segredos: **cria-o no servidor** (passo seguinte).

### C2. Criar `documentos-api-config.php`

1. No **File Manager** (ou FTP), na **mesma pasta** que `documentos-api.php`.
2. Duplique **`documentos-api-config.sample.php`** e renomeie a cópia para **`documentos-api-config.php`**.
3. Edite `documentos-api-config.php`:
   - **`jwt_secret`**: cole o valor copiado na **Parte B**.
   - **`admin_email`**: deve ser o email de administrador do site (por defeito `comercial@navel.pt`).
   - **`documentos_root`** (opcional): veja **C3**.

### C3. Onde os ficheiros ficam gravados

**Opção 1 — Simples (para começar)**  
Não defina `documentos_root` (ou deixe o valor por defeito do sample). Os ficheiros ficam em **`documentos-store/`** ao lado do PHP, protegidos pelo `.htaccess`.

**Opção 2 — Muito espaço / fora do site**  
Defina `documentos_root` com um caminho **absoluto** no servidor, por exemplo:

`/home/SEU_UTILIZADOR/navel-documentos`

Substitua `SEU_UTILIZADOR` pelo utilizador do cPanel (o alojador indica o caminho absoluto se tiver dúvida). Crie a pasta e dê permissões para o PHP **ler, escrever e criar pastas** (muitas vezes `755` na pasta; se falhar upload, teste `775` ou peça ao suporte).

### C4. Limites de tamanho por ficheiro (PHP)

No cPanel: **Select PHP Version** / **MultiPHP INI Editor** (ou equivalente).

Aumente **`upload_max_filesize`** e **`post_max_size`** (ex.: `256M` ou `512M`) conforme o tamanho máximo de ficheiro que pretende permitir e o que o alojamento aceita.

---

## Parte D — Testar no site

### D1. Utilizador normal (aprovado)

- Entrar na **área reservada**.
- Abrir pastas, **descarregar** e **carregar** ficheiros.
- **Não** deve conseguir apagar (só o admin, no servidor).

### D2. Administrador (`comercial@navel.pt`)

- **Criar pastas** (incluindo as raiz “Comercial” e “Assistência Técnica” se ainda não existirem — o site tenta criá-las na primeira visita do admin à raiz).
- **Apagar** ficheiros e pastas.
- **Substituir** ficheiro: carregar outro com o **mesmo nome** (só admin).

### D3. Erros frequentes

| Situação | O que verificar |
|----------|------------------|
| Erro **missing_config** ou **503** na área reservada | Existe `documentos-api-config.php` na mesma pasta que `documentos-api.php`? O `jwt_secret` está preenchido? |
| Upload falha | Permissões da pasta `documentos_root` / `documentos-store`; `upload_max_filesize` / `post_max_size` no PHP. |
| “Não autorizado” / token | Sessão expirada: volte a fazer **login**. JWT Secret errado (projecto diferente do `.env` do build). |

---

## O que **não** muda

- **Supabase Auth** e tabela **`profiles`** (aprovação de utilizadores).
- O bucket **`documentos`** no Storage do Supabase **deixa de ser usado** pela área reservada quando `VITE_DOCUMENTOS_API` está definido; pode ficar vazio ou ignorado.

---

## Desenvolvimento local

O **`npm run dev`** (Vite) **não executa** PHP. Para testar a API PHP use, por exemplo, `php -S localhost:8080` na pasta **`dist`** após o build, ou teste **directamente no cPanel** após publicar.

---

## Novas capacidades do portal

As capacidades abaixo ficam documentadas para o portal de documentos da área reservada:

- **Metadados**: título, etiquetas, origem e notas internas por ficheiro/pasta.
- **Filtros**: por tipo, pasta, autor, etiquetas e data de atualização.
- **Pesquisa**: pesquisa global por nome e metadados (e conteúdo indexado quando disponível).
- **Versionamento**: histórico de versões por ficheiro, com reposição de versão anterior.
- **Auditoria**: registo de operações (quem, quando, ação e alvo).
- **Permissões por pasta**: regras de leitura, upload, edição e administração por pasta.

### Setup (portal avançado)

1. Confirme que o portal está a usar a API PHP (`VITE_DOCUMENTOS_API`) e que os utilizadores autenticam no Supabase.
2. Defina o modelo de metadados (campos obrigatórios/opcionais e formato de etiquetas) antes de abrir o portal aos utilizadores.
3. Defina papéis e permissões por pasta (por exemplo: leitura, upload, gestão).
4. Ative retenção de histórico e política de versões (quantas versões manter por ficheiro).
5. Garanta que os logs de auditoria ficam acessíveis para suporte e conformidade.
6. Teste com contas de perfil diferente (utilizador normal e admin), cobrindo filtros, pesquisa, versões e permissões.

### Notas de migração

- **Da estrutura atual para portal avançado**: inventarie pastas/ficheiros existentes e normalize nomes antes de importar metadados.
- **Metadados**: para conteúdo antigo, use valores por defeito (ex.: origem = `legacy`) e complete gradualmente.
- **Versionamento**: a primeira importação de cada ficheiro deve ficar como versão base (`v1`).
- **Auditoria**: registe os eventos de migração com um ator técnico (ex.: `migration-script`) para rastreabilidade.
- **Permissões**: aplique política mínima (least privilege) e promova permissões só após validação por equipa.
- **Rollback**: mantenha cópia de segurança da árvore original até validar pesquisa, filtros e acessos pós-migração.

---

## Integração com AT_Manut (taxonomia)

Para a Área Reservada mostrar, dentro de `Assistência Técnica`, a mesma árvore de categorias/subcategorias do AT_Manut, foi adicionado um endpoint read-only no backend do próprio AT_Manut que reaproveita o `config.php` e o `db.php` já existentes. **Zero edição de ficheiros no cPanel** — basta fazer upload de 2 ficheiros por FTP/Gestor de Ficheiros.

### Ficheiros envolvidos

- `AT_Manut/servidor-cpanel/api/taxonomy-nodes.php` — endpoint read-only que lê as tabelas `categorias` e `subcategorias` via `get_pdo()`. Requer header `Authorization: Bearer <ATM_TAXONOMY_TOKEN>`.
- `AT_Manut/servidor-cpanel/api/config.php` — define `ATM_TAXONOMY_TOKEN` (valor por omissão já alinhado com o navel-site).

### Instalação (upload único)

1. No cPanel → Administrador de Ficheiros → `public_html/api/`.
2. Upload de `taxonomy-nodes.php` (de `AT_Manut/servidor-cpanel/api/`).
3. Upload do `config.php` actualizado (mesma pasta, substituir).
4. Testar em `https://www.navel.pt/api/taxonomy-nodes.php` (sem header): deve devolver `{"ok":false,"error":"unauthorized"}` — indica que está a exigir token.
5. Na Área Reservada (utilizador aprovado) abrir `Assistência Técnica`. As pastas das categorias/subcategorias do AT_Manut ficam criadas automaticamente na primeira visita.

### Token partilhado

- Valor por omissão hard-coded nos dois lados: `a8f3c19d-4b25-47e6-9f8a-3c2e1d0b7a95`.
- Para mudar: alterar `ATM_TAXONOMY_TOKEN` em `AT_Manut/servidor-cpanel/api/config.php` **e** `taxonomy_auth_token` em `navel-site/public/documentos-api-config.php` (ou editar a linha do fallback em `documentos-api.php`). Alternativa: variável de ambiente `ATM_TAXONOMY_TOKEN` no cPanel (Advanced → Environment Variables).

### Fase C — token de integração AT_Manut (`at_integration_bearer`)

- Gere um segredo forte e coloca em `documentos-api-config.php`: `at_integration_bearer` e opcionalmente `at_integration_actor_email` (auditoria).
- O backend do AT_Manut envia `Authorization: Bearer <at_integration_bearer>` apenas em **pedidos servidor → servidor** (nunca no JavaScript público).
- Enquanto este Bearer estiver activo, a API limita esse contexto ao ramo **`Assistencia Tecnica/...`** (inclui `search`, `download`, `machine_links`, upload com `linkMachineIds` opcional). Operações OneDrive, eliminação, `reindex`, taxonomia, etc. respondem `403 forbidden_for_at_integration`.
- Detalhe: [`docs/INTEGRACAO-BIBLIOTECA-AT-MANUT.md`](./INTEGRACAO-BIBLIOTECA-AT-MANUT.md) §10.

### Auto-discovery

O `documentos-api.php` tenta, por esta ordem, se `taxonomy_nodes_url` não estiver definido:

1. `https://<host>/api/taxonomy-nodes.php` (endpoint oficial).
2. `https://<host>/manut/api/taxonomy/nodes` (legacy).
3. `https://<host>/api/taxonomy/nodes` (legacy).

### Notas de segurança

- O endpoint **não expõe** dados sensíveis: devolve apenas `id`, `code`, `name`, `slug`, `path`, `parentId`, `parentPath`, `updatedAt`.
- Sem token o endpoint responde `401 unauthorized`.
- A `documentos-api.php` faz cache local em `.navel-taxonomy-cache.json` para resiliência caso o endpoint falhe.

---

## Ficheiros de referência no repositório

- `public/documentos-api.php` — API.
- `public/documentos-api-config.sample.php` — modelo de configuração.
- `public/documentos-store/.htaccess` — bloqueio de acesso directo.
- `.env.example` — exemplo da variável `VITE_DOCUMENTOS_API`.
- `.gitignore` — `public/documentos-api-config.php` e `public/documentos-store/.navel-permissions.json` não devem ser commitados (contêm segredo / emails).
