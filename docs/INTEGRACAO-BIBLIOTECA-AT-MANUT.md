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

## 9) Próximo passo técnico imediato

1. Definir endpoint de taxonomia no AT_Manut (`/api/taxonomy/nodes`).
2. Adicionar no `documentos-api.php`:
   - endpoint de busca por `documentType` + taxonomia
   - endpoint de vínculo `machine-links`
3. Ajustar UI da Área Reservada para navegação por taxonomia em `Assistência Técnica`.

