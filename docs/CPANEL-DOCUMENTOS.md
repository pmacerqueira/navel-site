# Documentos da área reservada no cPanel (disco)

Por defeito o site **pode** usar o **Storage Supabase** para ficheiros. Se preferir **armazenamento no servidor** (espaço do alojamento, útil para centenas de MB ou vários GB sem depender da quota do Supabase), use a API PHP em `public/documentos-api.php`.

O **login e a aprovação de utilizadores** continuam no **Supabase** (Auth + tabela `profiles`). Só os **ficheiros** da área reservada passam a ficar no **disco do cPanel** quando activa a opção abaixo.

---

## Checklist rápida

1. No PC: `.env` → `VITE_DOCUMENTOS_API=/documentos-api.php` (ou caminho correcto) → **`npm run build`** → **`npm run make-zip`** (o pacote usa **`dist/`**; sem build, o ZIP pode não incluir PHP/JS actualizados). Ver **`docs/DEPLOY-AREA-RESERVADA-E-ONEDRIVE.md`**.
2. No cPanel: antes de extrair o ZIP, **apagar `public_html/assets/`** para evitar JS/CSS antigos com hash diferente.
3. No Supabase: confirmar URL do projeto e chave anon (Settings → API / API Keys).
4. No cPanel: criar `documentos-api-config.php` a partir do sample, colar o JWT Secret, permissões na pasta de ficheiros, ajustar limites PHP se precisar.
5. Testar: utilizador normal (carregar/descarregar); admin `comercial@navel.pt` (criar pasta, apagar, substituir ficheiros).

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

Gere o **`navel-publicar.zip`** (ou o fluxo que já usa) e envie para o **cPanel** como habitualmente.

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
- `.gitignore` — `public/documentos-api-config.php` não deve ser commitado (contém segredo).

Bom descanso; quando voltar, abra este ficheiro em **`docs/CPANEL-DOCUMENTOS.md`**.
