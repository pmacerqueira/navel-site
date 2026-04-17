# Roadmap — "Sharepoint" NAVEL (Área Reservada ↔ AT_Manut)

Estado do projeto em **2026-04-17** (actualizado com portal: pesquisa, Fase B UI, pré-visualização).

Este documento regista o roadmap em curso para a biblioteca de documentos partilhada entre a **Área Reservada** (`navel-site`, `https://navel.pt/area-reservada`) e o **AT_Manut** (`https://navel.pt/manut/`). Complementa (não substitui) [`INTEGRACAO-BIBLIOTECA-AT-MANUT.md`](./INTEGRACAO-BIBLIOTECA-AT-MANUT.md).

---

## Entregas recentes na Área Reservada (2026-04)

Consolidação pós-Fase G, alinhada a operações reais e a boas práticas Microsoft Graph / bibliotecas modernas.

| Área | O que foi feito |
| --- | --- |
| **Portal — pesquisa global** | `cpanelSearch` → `GET action=search`; UI **Ctrl+K / Cmd+K** + botão na barra; filtro por `documentType`; resultado com **Abrir pasta** (navega para o directório do ficheiro). Componente `PortalCommandPalette.jsx`. |
| **Portal — Fase B (metadata upload)** | Em `Assistencia Tecnica/.../...` (≥3 segmentos no path): **tipo de documento obrigatório**; `taxonomyNodeId` resolvido por igualdade de `path` com `taxonomyNodes`; multipart envia `documentType`, `taxonomyNodeId`, `versionLabel` (título), `notes`; **chips** na listagem quando há `documentType` no `.meta` / índice. `cpanelList` passa metadata completa do servidor. |
| **Portal — pré-visualização** | `GET action=download&inline=1` para **PDF** e **imagens** (`Content-Disposition: inline`); `cpanelDownloadBlob(..., { inline: true })`; modal `DocumentPreviewModal.jsx`. |
| **OneDrive / Graph** | Retries em **429 / 503 / 504** com `Retry-After` e *backoff*; **gzip** em GET/POST; **delta** com `$top` na primeira página; logging `graph_throttle_retry`. Ver [`ONEDRIVE.md`](./ONEDRIVE.md). |
| **Taxonomia AT_Manut** | Normalização **Unicode NFC**, traços tipográficos → hífen, alinhamento **`path` ↔ `slug`**; pastas em disco e UI consistentes; `n_doc_safe_rel_path` reforçado. |
| **UI — performance** | `loadTaxonomy` / `loadOnedriveStatus` em efeitos separados (menos refetch); `folderDisplayName` com **Map** O(1); `FileThumbnail` com `memo`; regras AT taxonomia (`atSkipsTaxonomySync` vs `atHidesTaxonomyVirtualFolders`) clarificadas. |
| **Cliente API** | `cpanelSearch`, `cpanelSetMetadata`, upload com `extraFields`; listagem com metadata; download com `inline`. |
| **Produto** | Remoção da página `Novidades` (rota continua a redireccionar para `/catalogos`). |

**Build / deploy:** **primário** `npm run build` → `npm run deploy:all -- --yes` (FTPS incremental, ver [`DEPLOY-AUTOMATICO-CPANEL.md`](./DEPLOY-AUTOMATICO-CPANEL.md)). **Fallback manual:** `npm run make-zip` → upload de `navel-publicar.zip` no File Manager. Checklist operacional: [`DEPLOY-AREA-RESERVADA-E-ONEDRIVE.md`](./DEPLOY-AREA-RESERVADA-E-ONEDRIVE.md).

---

## Inspiração externa — casos e padrões reutilizáveis

Referências oficiais e padrões de mercado que **não** obrigam a mudar de stack, mas informam o desenho do nosso portal (PHP + Graph + SPA).

| Fonte | Ideia aplicável ao NAVEL |
| --- | --- |
| [Microsoft Graph — Best practices](https://learn.microsoft.com/en-us/graph/best-practices-concept) | Permissões mínimas, respeitar throttling, *delta* para alterações — já seguidos em `onedrive-lib.php`; evolução possível: **subscrições** / notificações para reduzir dependência só do cron. |
| [Discover / delta / notify](https://learn.microsoft.com/en-us/onedrive/developer/rest-api/concepts/scan-guidance) | Modelo **descobrir → delta → processar mudanças** — espelha o nosso fluxo; reforça valor de métricas e orçamentos por *tick*. |
| [OneDrive File Picker](https://learn.microsoft.com/en-us/onedrive/developer/controls/file-pickers/) | Para cenários **delegados** (escolher ficheiro já no M365) — candidato futuro no AT_Manut ou backoffice, em paralelo com o nosso disco `documentos-store`. |
| SharePoint **biblioteca moderna** ([customização](https://learn.microsoft.com/en-us/sharepoint/dev/solution-guidance/modern-experience-customizations-customize-lists-and-libraries), [filtros](https://techcommunity.microsoft.com/t5/microsoft-sharepoint-blog/sharepoint-filters-pane-updates-filtering-and-metadata/ba-p/74162)) | **Painel de filtros** por metadados, ordenação por colunas, **painel de detalhes** com pré-visualização — mapeia para: facetas na pesquisa, colunas de tipo/taxonomia, viewer lateral. |
| [PnP Modern Search](https://microsoft-search.github.io/pnp-modern-search/) (referência UX) | Pesquisa com facetas, cartões, verticals — inspiração para **Ctrl+K** e resultados por montagem (Comercial vs AT). |

---

## Plano — 10 melhorias prioritárias (qualidade “nível superior”)

Ordem sugerida: impacto no utilizador + dependências técnicas. Várias prolongam directamente as fases B–D já descritas abaixo.

1. ~~**Pesquisa global no portal**~~ — **Entregue:** `cpanelSearch`, paleta **Ctrl+K**, filtro por `documentType`. *(Extensão futura: `machineId`, facetas por pasta na UI.)*
2. ~~**Fase B — metadata rica no upload**~~ — **Entregue** na árvore AT (≥3 segmentos): multipart com `documentType` + `taxonomyNodeId` + chips; **não** é obrigatório `set_metadata` POST separado porque o upload já grava metadados. *(Opcional: `set_metadata` para correcções pós-upload.)*
3. ~~**Pré-visualização de documentos**~~ — **Entregue:** `inline=1` no download + modal com iframe/img. *(PDF.js local não necessário.)*
4. **Versões alinhadas ao servidor** — UI de histórico a ler versões em `.navel-versions/` + metadados canónicos; descontinuar progressivamente o histórico só em `localStorage` como fonte de verdade.
5. **Painel de auditoria (admin)** — Endpoint de leitura controlada de `.navel-audit.log` (ou agregação JSON) com filtros por data/ação/utilizador; substituir ou complementar o *slice* em `localStorage`.
6. **Listagem fiel para UX** — `cpanelList` a devolver **MIME real** (já calculado no servidor) em vez de `application/octet-stream` genérico — base para ícones, pré-visualização e políticas.
7. **Vista em colunas + filtros** — Tabela responsiva com ordenação por nome/data/tamanho; filtros laterais por tipo e montagem (Comercial / AT), inspirados no *filter pane* moderno.
8. **Selecção múltipla e acções em lote** — Checkbox em ficheiros; eliminar / mover / descarregar ZIP (novo endpoint ou sequência); reduz trabalho repetitivo.
9. **Notificações e feed** — Email em `PLANO_MANUTENCAO` (Fase D) + “Últimos documentos” na entrada da Área Reservada; opcional: webhook ou digest diário.
10. **Acessibilidade e densidade** — Substituir ícones só-emoji por SVG + texto visível; foco e teclado em menus; modo compacto para listas longas. *“Moderno” inclui WCAG AA como alvo.*

**Nota:** Subscrições Microsoft Graph (*change notifications*) para drives são um **passo 11 opcional** (quase tempo-real) — exige endpoint HTTPS público estável e renovação de subscrições; útil quando o cron de 15 min deixar de ser suficiente.

---

## Fase A — Fundações (CONCLUÍDA)

Entregue e validado em produção a 2026-04-16.

- [x] API PHP no cPanel (`public/documentos-api.php`) com armazenamento em `documentos-store/`.
- [x] Autenticação via Supabase (`/auth/v1/user`) + fallback JWT HS256.
- [x] Pastas-mãe fixas (`Comercial`, `Assistencia Tecnica`) + criação livre de subpastas por qualquer utilizador aprovado.
- [x] Upload multi-ficheiro + câmara (mobile), compressão automática de imagens > 4 MB, progresso por ficheiro, retries com back-off.
- [x] Permissões: read/upload para todos os aprovados, delete só para `comercial@navel.pt`.
- [x] Endpoint read-only de taxonomia no AT_Manut (`public_html/api/taxonomy-nodes.php`) que reaproveita `config.php` + `db.php`.
- [x] Token partilhado (`ATM_TAXONOMY_TOKEN`) entre AT_Manut e navel-site.
- [x] Sincronização automática das pastas `Assistencia Tecnica/<Categoria>/<Subcategoria>` espelhando a árvore AT_Manut.
- [x] Cache local `.navel-taxonomy-cache.json` para resiliência offline.
- [x] Índice canónico global `.navel-index.json` com `documentId`, `sha256`, `documentType`, `taxonomyNodeId`, `machineLinks`.
- [x] Enum fixo de `documentType`: `MANUAL_UTILIZADOR`, `MANUAL_TECNICO`, `PLANO_MANUTENCAO`, `OUTROS`.

---

## Fase B — Metadata automática no upload (CONCLUÍDA na UI)

**Objectivo:** quando o utilizador está dentro de `Assistencia Tecnica/<Categoria>/<Subcategoria>`, o upload envia metadata com `documentType` obrigatório e `taxonomyNodeId` quando o path coincide com um nó.

### Entregas

- [x] `AreaReservada.jsx` — zona de upload AT quando o path tem **≥3** segmentos (`Assistencia Tecnica` + categoria + subcategoria ou mais); `taxonomyNodeId` por **igualdade** `node.path` ↔ `currentPath`.
- [x] Select **documentType** (enum de 4 valores) obrigatório nessa zona; título do formulário → `versionLabel` no multipart; notas/tags → `notes` (concatenado).
- [x] Metadados gravados no **mesmo** upload multipart (POST `action=upload`) — **não** é necessário `set_metadata` em sequência para o fluxo normal.
- [x] Chips na listagem com `documentType` quando presente nos metadados do ficheiro.
- [x] Breadcrumbs com labels reais da taxonomia (continuação da Fase A).
- [x] i18n PT/EN/ES (`auth.portal*`, `auth.documentType.*`).

### Critérios de aceitação

- Upload em pasta profunda de AT exige `documentType`; botão **Carregar** desactivado até preencher.
- Listagem mostra chip por ficheiro quando `documentType` está no metadata (após indexação / listagem PHP).

### Próximo refinamento (opcional)

- [ ] `set_metadata` dedicado para corrigir metadata após upload sem re-enviar ficheiro.
- [ ] Breadcrumb com link directo ao node AT_Manut (quando URL estável).

---

## Próxima fase operativa sugerida — **C** (AT_Manut)

Documentação e código do portal estão prontos para avançar para a **Fase C** (ligação documentos ↔ máquinas no AT_Manut), conforme secção seguinte.

---

## Fase C — Associar documentos a máquinas (AT_Manut)

**Objectivo:** dentro do AT_Manut, ao abrir a ficha de uma máquina, o técnico/admin pode **linkar** documentos já existentes na Área Reservada (ou fazer upload novo) e ver a lista de documentos associados.

### Entregas

- [ ] Novo endpoint no AT_Manut: `api/data.php` ganha recurso `documentosBiblioteca` (read-only) que consulta `documentos-api.php/search` com o token técnico adequado — **ver `docs/INTEGRACAO-BIBLIOTECA-AT-MANUT.md` §10 e exemplo de proxy**.
- [ ] Componente React no AT_Manut (`src/pages/MaquinaDetalhe.jsx` ou equivalente) com novo separador "Biblioteca" que:
  - Lista documentos já linkados à máquina (`GET action=search&machineId=...`).
  - Botão "Linkar documento existente" → modal com search na biblioteca (por nome, tipo, taxonomia).
  - Botão "Upload novo documento" → multipart para a subpasta `Assistencia Tecnica/<Categoria>/<Subcategoria>/` com campo opcional `linkMachineIds` (JSON array no mesmo pedido) ou `POST machine_links` a seguir.
- [x] **`documentos-api.php` (navel-site):** token serviço **`at_integration_bearer`** (âmbito só `Assistencia Tecnica/`), permissões fechadas para integração (sem OneDrive/delete/taxonomia/reindex). **CORS no browser não é obrigatório** se o AT usar proxy PHP no mesmo `navel.pt` — o token não sai do servidor.
- [x] **`documentos-api.php`:** campo multipart opcional **`linkMachineIds`** (JSON) para gravar vínculos no mesmo upload; `cpanelMachineLinksGet` / `cpanelMachineLinksSet` em `documentosCpanelApi.js`.
- [x] Desassociar máquina: `POST action=machine_links` com lista `machineIds` actualizada (o índice `.navel-index.json` já segue ao gravar vínculos).

### Critérios de aceitação

- Na ficha de uma máquina ISTOBAL ProLift, o separador Biblioteca mostra os documentos linkados e permite adicionar/remover.
- Um upload feito a partir do AT_Manut aparece imediatamente na Área Reservada dentro da subpasta correcta.
- Um documento pode estar linkado a N máquinas sem duplicação no disco.

---

## Fase D — Pesquisa global cruzada e notificações

**Objectivo:** levar a experiência "Sharepoint" ao nível seguinte: pesquisar em qualquer um dos lados vê tudo, e o utilizador é notificado quando um documento relevante é adicionado.

### Entregas

- [ ] `Ctrl+K` do AT_Manut passa a pesquisar também documentos da Área Reservada (via `documentos-api.php?action=search`) e mostra-os numa secção "Documentos" dos resultados.
- [ ] Inverso: Área Reservada mostra na pesquisa resultados de máquinas AT_Manut (via `api/data.php` com recurso `maquinas`) quando há `machineId` em `machine_links`.
- [ ] Notificação por email (reaproveitar `send-email.php` do AT_Manut) quando um admin faz upload de documento com `documentType = PLANO_MANUTENCAO` (distribuição por lista configurável).
- [ ] Feed "Últimos documentos" na home da Área Reservada (últimos 10 uploads).
- [ ] Audit log (`.navel-audit.log`) exposto num painel admin com filtros (data, utilizador, ação, pasta).

### Critérios de aceitação

- Pesquisar "ProLift" em qualquer das apps devolve: a máquina, documentos linkados, e a subcategoria.
- Upload de um plano de manutenção novo dispara email para a lista de distribuição em <= 30 s.

---

## Fase E — Espelho OneDrive na pasta "Comercial" (CONCLUÍDA)

Entregue e validada em **2026-04-16**. Documentação detalhada: [`ONEDRIVE.md`](./ONEDRIVE.md).

**Objectivo:** a pasta-mãe `Comercial` passa a ser espelho bidireccional de uma pasta OneDrive for Business do administrador (`pmcerqueira@navel.pt` → `Documentos/NAVEL/CATALOGOS NAVEL`).

### Entregas

- [x] `public/onedrive-lib.php` — cliente Microsoft Graph em PHP (OAuth Authorization Code + refresh token, token cache com rotação, upload simples e *upload sessions*, delta query, resolve do item-raíz).
- [x] `public/onedrive-callback.php` — endpoint OAuth (receção de `code`, validação de `state`, persistência em `.navel-onedrive.json`).
- [x] `public/onedrive-cron.php` — accionado pelo cron do cPanel (`*/15 * * * *`), usa `flock` para evitar sobreposições, chama `ondrv_sync_delta()`.
- [x] Actions novas no `documentos-api.php`: `onedrive_status`, `onedrive_connect_url`, `onedrive_trigger_sync`.
- [x] Hooks em `upload` e `ensure_marker` para espelhar escrita ao OneDrive quando o path está em `Comercial/...`.
- [x] `delete` e `delete_tree` devolvem **403 `deletion_disabled_onedrive`** dentro de `Comercial` (para todos, incluindo admin).
- [x] UI (`AreaReservada.jsx`):
  - badge **OneDrive** na card da pasta Comercial no root.
  - painel dedicado dentro de Comercial com estado ligado/não-ligado.
  - botões admin **"Ligar OneDrive"** / **"Sincronizar agora"** / **"Reautenticar OneDrive"**.
  - botões "Eliminar" ocultos dentro de Comercial.
  - leitura da query `?onedrive=connected|error` para mostrar feedback após callback.
- [x] Reutilização do registo Entra ID do `navel-propostas` (apenas adicionada a redirect URI `https://navel.pt/onedrive-callback.php` e a permission `Files.ReadWrite.All`).
- [x] i18n PT/EN/ES das novas strings.

### Critérios de aceitação

- Admin liga o OneDrive uma única vez com 2FA; o refresh token fica guardado em `documentos-store/.navel-onedrive.json` (fora da raíz HTTP por omissão).
- Todos os utilizadores autenticados vêem o conteúdo espelhado e podem adicionar ficheiros/pastas que aparecem em seguida no OneDrive do admin.
- Nenhum utilizador consegue eliminar em Comercial; eliminações em OneDrive são replicadas no próximo delta.
- Cron de 15 em 15 min mantém o espelho actualizado sem intervenção manual.

---

## Fase F — OneDrive multi-mount + push na "Assistência Técnica" (CONCLUÍDA)

Entregue e validada em **2026-04-16**. Documentação detalhada: [`ONEDRIVE.md`](./ONEDRIVE.md).

**Objectivo:** generalizar a integração OneDrive da Fase E para suportar múltiplas pastas-mãe, com direcções de sincronização distintas, preparando também a bidireccional total.

### Entregas

- [x] Refactor de `public/onedrive-lib.php` para arquitectura **multi-mount** — cada mount tem `id`, `localFolder`, `remotePath`, `direction` (`pull` | `push` | `bidirectional`).
- [x] Migração automática do ficheiro `.navel-onedrive.json` (formato antigo → `mounts.comercial` dentro do formato novo).
- [x] Mapa global `.navel-onedrive-items.json` partilhado por todos os mounts (`itemId → { mountId, ... }`).
- [x] Novo mount `at` para `Assistência Técnica` → `Documentos/NAVEL/ASSISTENCIA TECNICA` com `direction = push`.
- [x] `ondrv_sync_mount()` dispatcher (pull delta, push full walk, ou ambos).
- [x] `ondrv_push_full_for_mount()` com walk recursivo, criação de pastas remotas, `ondrv_push_file_if_stale()` (skip se `size + mtime` inalterados).
- [x] Funções real-time por mount: `ondrv_create_folder_for_mount`, `ondrv_upload_file_for_mount`, `ondrv_delete_item_for_mount`.
- [x] Resolução automática do root remoto com **criação on-demand** para mounts push (se o caminho não existir no OneDrive).
- [x] `public/onedrive-cron.php` agora itera todos os mounts e aceita `?mount=<id>` para filtrar.
- [x] `public/documentos-api.php`:
  - helper `n_doc_onedrive_mount_for_rel()` para detectar mount activo a partir do path relativo.
  - `delete` / `delete_tree` bloqueiam em mounts `pull` (Comercial) e propagam para OneDrive em mounts `push`/`bidirectional` (AT).
  - `upload` e `ensure_marker` delegam nas funções mount-aware.
  - novas actions `onedrive_push_full` e `onedrive_trigger_sync` / `onedrive_reset_local` aceitam `mountId`.
- [x] `public/documentos-api-config.sample.php` com `onedrive_comercial_path` (alias de `onedrive_root_path`) + `onedrive_at_path`.
- [x] `src/lib/documentosCpanelApi.js` — suporte a `mountId` e nova função `cpanelOnedrivePushFull`.
- [x] `src/pages/AreaReservada.jsx`:
  - `activeMount` / `activeMountStatus` calculados a partir do path.
  - painel OneDrive adaptativo (ícone ⬇/⬆, título "OneDrive · fonte de verdade" vs "Sharepoint · fonte de verdade").
  - acção **"Sincronizar tudo para o OneDrive"** visível em mounts push/bidirectional.
  - acção **"Reiniciar mirror local"** apenas em mounts pull.
  - cards das pastas-mãe com badges **OneDrive ⬇** / **OneDrive ⬆**.
  - botão eliminar continua oculto em mounts pull (Comercial), mas **disponível** em mounts push (AT).
- [x] i18n PT/EN/ES (`onedrivePanelTitlePull`, `onedrivePanelTitlePush`, `onedriveBadgePull`, `onedriveBadgePush`, `onedrivePushFull`, `onedrivePushFullConfirm`, `onedrivePushFullOk`).
- [x] Legacy wrappers preservados (`ondrv_sync_delta`, `ondrv_create_folder`, `ondrv_upload_file`, `ondrv_status_summary`) — `onedrive-callback.php` continua a funcionar sem alterações.
- [x] Fundações prontas para `direction = bidirectional` (pull delta + push full na mesma corrida); falta apenas definir política de resolução de conflitos.

### Critérios de aceitação

- Admin navega em **Assistência Técnica**, vê o painel "Sharepoint · fonte de verdade · ☁️⬆" e consegue clicar em **Sincronizar tudo para o OneDrive**.
- Qualquer upload/mkdir/delete em `Assistência Técnica/...` é imediatamente replicado em `Documentos/NAVEL/ASSISTENCIA TECNICA/...` no OneDrive do admin.
- Eliminações em Comercial continuam bloqueadas (403); em AT são permitidas para admin e propagam.
- Cron corre ambos os mounts sem sobreposição (`flock`) — log com tag por mount.
- Reautenticação do admin serve **ambos** os mounts com o mesmo refresh token.

---

## Fase G — Sincronização bidireccional com last-modified-wins (CONCLUÍDA)

Entregue e validada em **2026-04-16**. Documentação: [`ONEDRIVE.md`](./ONEDRIVE.md).

**Objectivo:** ambos os mounts (`comercial` e `at`) passam a sincronizar **nos dois sentidos** em cada corrida, com resolução de conflitos determinística baseada na data de modificação mais recente.

### Entregas

- [x] `public/onedrive-lib.php`:
  - Direcções por mount agora são configuráveis via `onedrive_comercial_direction` / `onedrive_at_direction` (default `'bidirectional'`).
  - Helpers `ondrv_iso_to_ts()` e `ondrv_touch_to_remote()` para alinhar `mtime` local com `lastModifiedDateTime` remoto após cada download (evita falsos positivos de "local é mais recente").
  - `ondrv_sync_delta_for_mount`:
    - LWW durante download — se `filemtime(local) > remoteTs + 2`, preserva local e regista `conflict_kept_local`.
    - LWW em deletes — se o delete remoto chegar para um ficheiro modificado localmente depois do `lastModifiedDateTime` conhecido, preserva local (`conflict_kept_local_delete`).
    - Items map passa a registar `localMtimeUtc` em cada entry pull.
  - `ondrv_push_file_if_stale`: skip upload se `remoteTs > localMtime + 2` (`conflict_kept_remote`).
  - `ondrv_sync_mount` para `'bidirectional'` corre pull + push na mesma chamada e guarda `lastSyncStats` combinadas (`foldersCreated`, `filesDownloaded`, `filesUploaded`, `deleted`, `skipped`, `conflictsKeptLocal`, `errors`, `pages`). `lastSyncStatus` = `partial` se qualquer um dos lados falhar.
- [x] `public/documentos-api-config.sample.php` documenta `onedrive_comercial_direction` / `onedrive_at_direction`.
- [x] `src/pages/AreaReservada.jsx`:
  - Badges das cards-mãe reflectem a direcção real (`OneDrive ⬇` / `OneDrive ⬆` / `OneDrive ⇅`).
  - Ícone e título do status bar adaptam-se a `pull`, `push`, `bidirectional` (novo ícone `☁️⇅`, título `onedrivePanelTitleBidi`).
  - Acção "Sincronizar tudo para o OneDrive" visível em `push` e `bidirectional`.
  - Acção "Reiniciar mirror local" visível em `pull` e `bidirectional` (útil para forçar re-pull completo em caso de desalinhamento).
  - Botão eliminar fica visível em `bidirectional` (admin) — eliminação propaga para OneDrive.
- [x] i18n PT/EN/ES: `onedrivePanelTitleBidi`, `onedriveBadgeBidi`.
- [x] Defaults *zero-config*: basta fazer upload do novo `onedrive-lib.php` e o sistema entra em `bidirectional` sem editar `documentos-api-config.php`.

### Critérios de aceitação

- Editar um ficheiro em OneDrive **e** (noutro instante, antes do próximo sync) editar o mesmo ficheiro no portal → após o cron, vence o que foi modificado mais tarde; o log indica `conflict_kept_local` ou `conflict_kept_remote`.
- Apagar um ficheiro no OneDrive enquanto outro user carrega uma versão mais recente no portal → o local é preservado e re-enviado no push seguinte.
- Stats agregadas do modo bidireccional visíveis em `mounts.<id>.lastSyncStats`.
- Mudar `onedrive_at_direction` para `'push'` restaura o comportamento anterior (Sharepoint-fonte-de-verdade puro) sem outras alterações.

---

## Fora de âmbito imediato (notas para futuro)

- Versionamento explícito com UI (actualmente arquivamos versões antigas em `.navel-versions/` mas não há seletor).
- Pré-visualização alargada (Office, vídeo) — hoje: PDF + imagens via `inline` + modal.
- Assinatura digital de documentos.
- Exportar/importar o `.navel-index.json` como backup.
- Eventual migração para S3/Supabase Storage caso o espaço no cPanel fique curto (o índice canónico já permite).

---

## Dependências entre projectos

| Alteração em | Afeta | Como propagar |
|---|---|---|
| `documentType` enum | `navel-site/src/lib/documentosSchema.js` + `navel-site/public/documentos-api.php` (`N_DOC_DOCUMENT_TYPES`) | Editar os dois; a UI lê do `documentosSchema.js`, a API valida por `N_DOC_DOCUMENT_TYPES`. |
| Taxonomia (categorias/subcategorias) | AT_Manut MySQL → automaticamente propaga via `taxonomy-nodes.php` | Nenhuma acção extra: a primeira visita à Área Reservada sincroniza pastas novas. |
| Token partilhado | `ATM_TAXONOMY_TOKEN` no AT_Manut `config.php` + `taxonomy_auth_token` no navel-site `documentos-api-config.php` (ou fallback em `documentos-api.php`) | Mudar nos dois lados (ou usar env var `ATM_TAXONOMY_TOKEN` no cPanel). |

---

## Ficheiros-chave

### navel-site
- `public/documentos-api.php` — API (incl. `search`, `download` com `inline=1`).
- `public/documentos-api-config.sample.php` — template de config.
- `public/onedrive-lib.php` — cliente Graph + sync.
- `public/onedrive-callback.php` — OAuth redirect handler.
- `public/onedrive-cron.php` — job periódico.
- `src/pages/AreaReservada.jsx` — UI portal.
- `src/components/PortalCommandPalette.jsx` — pesquisa global Ctrl+K.
- `src/components/DocumentPreviewModal.jsx` — pré-visualização PDF/imagem.
- `src/lib/documentosCpanelApi.js` — wrapper JS (`cpanelSearch`, upload, list com metadata, download inline).
- `src/lib/documentosSchema.js` — constantes partilhadas (`DOCUMENT_TYPES`, etc.).
- `docs/CPANEL-DOCUMENTOS.md` — setup produção.
- `docs/ONEDRIVE.md` — setup e operação das Fases E (Comercial / pull) e F (AT / push, multi-mount).
- `docs/INTEGRACAO-BIBLIOTECA-AT-MANUT.md` — contrato técnico.

### AT_Manut
- `servidor-cpanel/api/taxonomy-nodes.php` — endpoint read-only.
- `servidor-cpanel/api/config.php` — `ATM_TAXONOMY_TOKEN`.
- `servidor-cpanel/api/data.php` — API principal (a estender na Fase C).
- `servidor-cpanel/INSTRUCOES_CPANEL.md` — setup produção.
