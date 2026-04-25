# Integração Biblioteca Única — Área Reservada + AT_Manut

Objetivo: usar a mesma biblioteca documental para:
- `navel.pt/area-reservada` (portal de documentos NAVEL),
- `navel.pt/manut` (AT_Manut),
com estrutura técnica alinhada às categorias/subcategorias/máquinas do AT_Manut.

---

## 1) Regra fechada de tipo de documento

No sistema, `documentType` deve aceitar **apenas**:

1. `MANUAL_UTILIZADOR`
2. `MANUAL_TECNICO`
3. `PLANO_MANUTENCAO`
4. `OUTROS`

UI (rótulos):
- Manual de utilizador
- Manual Técnico
- Plano de manutenção
- Outros

---

## 2) Arquitetura alvo (pragmática)

- **Auth:** Supabase (já existente)
- **Storage físico:** cPanel (já existente, `documentos-store`)
- **API de documentos:** `public/documentos-api.php` (versãoada)
- **Taxonomia técnica:** fonte de verdade no AT_Manut
- **Biblioteca única:** consumida pelas duas apps por API
- **Alojamento:** `navel-site` e AT_Manut partilham a **mesma conta cPanel** e o domínio **www.navel.pt** — site na raiz de `public_html/`, PWA AT_Manut em `public_html/manut/`, API MySQL do AT_Manut em `public_html/api/`. Ver `DEPLOY.md` e, no repo AT_Manut, `docs/DEPLOY_CHECKLIST.md`.

### Princípio chave
AT_Manut define a árvore técnica (categoria/subcategoria/máquina).  
A Área Reservada consome essa árvore para a pasta-mãe `Assistência Técnica`.

---

## 3) Contratos API (v1 inicial)

Base sugerida: `/api/integration/v1`

### 3.1 Taxonomia (AT_Manut -> Biblioteca)

`GET /taxonomy/nodes`

Retorna nós com:
- `id`
- `code`
- `name`
- `parentId`
- `path`
- `updatedAt`

Uso: construir/atualizar árvore em `Assistência Técnica`.

### 3.2 Documentos

`POST /documents`

Cria documento lógico com:
- `title`
- `documentType` (enum fechado)
- `language`
- `version`
- `fileUrl` (ou referência ao caminho interno)

`GET /documents/{id}`

Retorna metadados + vínculos de máquina.

### 3.3 Vinculação máquina-documento

`POST /documents/{id}/machine-links`

Body:
- lista de `machineId`
- `source`: `MANUAL` ou `AUTO`
- `confidence` opcional

Permite associar 1 documento a várias máquinas e vice-versa.

### 3.4 Pesquisa

`GET /documents/search?q=...&documentType=...&taxonomyNodeId=...&machineId=...`

Retorna resultados filtrados para ambas as apps.

---

## 4) Modelo de dados recomendado

### `documents`
- `id` (uuid)
- `title`
- `document_type` (enum 4 valores)
- `file_path`
- `file_name`
- `mime_type`
- `file_size`
- `status` (`draft`, `published`, `archived`)
- `visibility_scope` (`reserved_area`, `at_manut`, `both`)
- `created_by`, `created_at`, `updated_by`, `updated_at`
- `deleted_at` (soft-delete)

### `document_versions`
- `id`
- `document_id`
- `version_label`
- `file_path`
- `checksum_sha256`
- `change_note`
- `uploaded_by`, `uploaded_at`
- `is_current`

### `machine_documents` (N:N)
- `id`
- `machine_id`
- `document_id`
- `relation_type` (`primary`, `related`, `maintenance_required`)
- `notes`

### `taxonomy_nodes`
- `id`
- `code`
- `name`
- `parent_id`
- `path`
- `active`

---

## 5) Permissões (evolução segura)

### Fase inicial (já alinhada com operação)
- Qualquer autenticado:
  - listar
  - descarregar
  - upload
  - criar pastas
- Apenas admin:
  - apagar ficheiros/pastas

### Fase seguinte
- Permissões por pasta/ramo (`Comercial`, `Assistência Técnica`, subárvores)
- Perfis `editor` sem delete
- `admin` com delete e governança

---

## 6) Roadmap por fases

### Fase A — Fundação (rápida)
- Fixar enum `documentType` (4 valores)
- Expor endpoint de taxonomia AT_Manut
- Criar endpoint de busca unificada

### Fase B — Árvore única na Área Reservada
- Renderizar árvore de `Assistência Técnica` via taxonomia AT_Manut
- Permitir expansão contínua de categorias/subcategorias
- Manter criação de pastas livres quando necessário (ramo custom)

### Fase C — Picker no AT_Manut
- Na máquina (nº série), adicionar:
  - “Anexar da Biblioteca NAVEL”
- Seleção por pesquisa/filtro na biblioteca
- Guardar vínculo (`machine_documents`)

### Fase D — Hardening
- Auditoria completa de ações
- Versionamento consolidado
- permissões por pasta

---

## 7) Critérios de aceitação

1. Documento criado em `Assistência Técnica` aparece em AT_Manut (via busca/vínculo).
2. Documento vinculado a máquina no AT_Manut fica acessível em contexto da máquina.
3. `documentType` só aceita os 4 valores definidos.
4. Utilizador normal não consegue eliminar.
5. Admin consegue eliminar e auditar.

---

## 8) Riscos e mitigação

- **Divergência de taxonomia**  
  Mitigação: fonte única em AT_Manut + sync idempotente por `code`.

- **Regressão de permissões**  
  Mitigação: manter delete admin-only por padrão + feature flags.

- **Duplicação de documentos**  
  Mitigação: vínculo por referência (não copiar ficheiro ao associar).

---

## 9) Estado actual dos passos iniciais

1. ~~Taxonomia no AT_Manut~~ — `taxonomy-nodes.php` + `ATM_TAXONOMY_TOKEN` (ver `docs/CPANEL-DOCUMENTOS.md`).
2. ~~`documentos-api.php`~~ — pesquisa (`action=search`), vínculos (`machine_links`), índice `.navel-index.json`.
3. ~~Área reservada~~ — árvore e metadata em `Assistencia Tecnica/...`.

---

## 10) Fase C — Token serviço AT_Manut + proxy PHP (sem CORS no cliente)

O browser do dashboard **não** deve conter segredos. O fluxo correcto:

1. Utilizador autenticado no AT_Manut (sessão PHP / cookie próprio).
2. O **servidor** AT (`api/data.php` ou handler dedicado) valida a sessão e, se autorizado, chama `https://navel.pt/documentos-api.php` com  
   `Authorization: Bearer <at_integration_bearer>`.
3. O valor `at_integration_bearer` é uma **string opaca** (não é JWT Supabase) definida em `documentos-api-config.php` e espelhada na config do AT (ex. constante num `config.php` **fora do repositório**). Geração sugerida: `openssl rand -hex 32`.

**Âmbito no cPanel:** com esse token, a API só permite operações **subordinadas ao ramo `Assistencia Tecnica/`** (listagem, download, pesquisa, upload, `set_metadata`, vínculos `machine_links`). Está **proibido**: OneDrive, apagar ficheiros/pastas, `ensure_marker`, taxonomia/sync, `reindex`.

**Consistência com OneDrive:** ficheiros criados ou vinculados em `Assistencia Tecnica/...` seguem as mesmas regras que uploads da Área Reservada: o mount AT continua bidireccional; não é necessário acção extra no AT para “disparar” o OneDrive — o espelho aplica-se ao caminho no disco.

**Mesmo site:** `https://navel.pt/manut/...` e `https://navel.pt/documentos-api.php` partilham origem `https://navel.pt`; mesmo assim o token **só** no servidor evita extração via JavaScript.

### Exemplo mínimo de proxy (AT_Manut, ilustrativo)

```php
<?php
// Depois de validar $_SESSION do AT (ou equivalente).

const NAVEL_DOC_API = 'https://navel.pt/documentos-api.php';
// require 'config.local.php'; // define NAVEL_AT_INTEGRATION_BEARER

function navel_doc_proxy_json(string $method, array $opts): array {
    $url = NAVEL_DOC_API;
    if ($method === 'GET' && !empty($opts['query'])) {
        $url .= '?' . http_build_query($opts['query']);
    }
    $ch = curl_init($url);
    $headers = ['Accept: application/json', 'Authorization: Bearer ' . NAVEL_AT_INTEGRATION_BEARER];
    if ($method === 'POST') {
        $headers[] = 'Content-Type: application/json';
    }
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_CUSTOMREQUEST => $method,
    ]);
    if ($method === 'POST' && isset($opts['json'])) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($opts['json'], JSON_UNESCAPED_UNICODE));
    }
    $raw = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $data = json_decode((string) $raw, true);
    return ['http' => $code, 'data' => is_array($data) ? $data : null];
}

// Documentos ligados a uma máquina (usa índice + .navel-machine-links.json)
// navel_doc_proxy_json('GET', [ 'query' => [ 'action' => 'search', 'machineId' => $idMaquina ] ]);

// Vincular um ficheiro existente a uma ou mais máquinas
// navel_doc_proxy_json('POST', [ 'json' => [ 'action' => 'machine_links', 'path' => $relPath, 'machineIds' => [$id], 'source' => 'MANUAL' ] ]);

// Upload multipart: mesmo Bearer no header; campo opcional `linkMachineIds` = JSON array no formulário para gravar vínculos no mesmo pedido.
// Em produção (AT_Manut): o script `navel-documentos-upload.php` exige também POST `maquinaId` — o servidor confirma que `path` é exactamente a pasta AT desse equipamento (impede escrita noutra subpasta mesmo com JWT válido).
```

No repositório **navel-site**, o cliente já expõe `cpanelMachineLinksGet` / `cpanelMachineLinksSet` em `src/lib/documentosCpanelApi.js` para a Área Reservada (JWT utilizador). O AT_Manut deve usar apenas o proxy servidor com `at_integration_bearer`.

**UI AT_Manut:** implementar separador “Biblioteca” em `MaquinaDetalhe.jsx` (ou equivalente) no repositório do AT: listar resultados de `search?machineId=...`, modal de pesquisa global (`search?q=...`), upload para a subpasta da máquina + `linkMachineIds` opcional no `multipart`.

