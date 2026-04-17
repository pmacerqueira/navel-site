# OneDrive ⇆ Sharepoint NAVEL (multi-mount)

**Deploy e erros a evitar:** `docs/DEPLOY-AREA-RESERVADA-E-ONEDRIVE.md` (build→zip, assets, PHP).

O Sharepoint NAVEL integra-se com o **OneDrive for Business** do utilizador administrador através da Microsoft Graph API. Existem dois mounts independentes, um por cada pasta-mãe:

| Mount | Pasta portal | Pasta OneDrive (default) | Direcção (default) | Política de conflitos |
| --- | --- | --- | --- | --- |
| `comercial` | `Comercial` | `Documentos/NAVEL/CATALOGOS NAVEL` | **bidirectional** | last-modified-wins |
| `at` | `Assistência Técnica` | `Documentos/NAVEL/ASSISTENCIA TECNICA` | **bidirectional** | last-modified-wins |

Ambos partilham a **mesma app registration Entra ID** (reutilizada do `navel-propostas`) e o **mesmo refresh token** — basta ligar uma vez.

A direcção de cada mount é configurável em `documentos-api-config.php` via `onedrive_comercial_direction` / `onedrive_at_direction`. Valores válidos: `'pull'`, `'push'`, `'bidirectional'` (default).

---

## 1. Comportamento por mount

### 🔵 Comercial (direction = **pull**)

O admin trabalha no OneDrive (Word/Excel/etc.); o portal é um **espelho de leitura avançado**.

- **Pull periódico (cron)** via Graph *delta query*: qualquer alteração no OneDrive aparece no portal.
- **Uploads do portal** são *também* enviados para OneDrive (ficheiro guardado localmente + PUT na Graph).
- **Criação de pastas** no portal cria pasta no OneDrive.
- ❌ **Eliminações no portal estão bloqueadas** (HTTP 403 `deletion_disabled_onedrive`). Para apagar, apaga no OneDrive.

### 🟢 Assistência Técnica (direction = **push**)

O Sharepoint é a **fonte de verdade**. Toda a operação no portal é propagada em tempo real para o OneDrive, que fica como mirror de trabalho local do admin.

- **Uploads** vão para disco local **e** para OneDrive (Graph PUT ou upload session para &gt;4 MB).
- **Criação de pastas** é replicada no OneDrive.
- ✅ **Eliminações no portal** são permitidas (admin) e propagadas — apagam o item também no OneDrive.
- **Push-full (seed)**: admin tem acção `Sincronizar tudo para o OneDrive` que faz walk recursivo do conteúdo local e envia o que estiver em falta ou alterado (baseado em mtime + size).
- O cron continua a correr o push-full periodicamente como *healthcheck*.

> **Nota**: a taxonomia AT_Manut gera as pastas de categorias dentro de `Assistência Técnica` automaticamente. Estas passam a ser replicadas no OneDrive assim que o admin ligar o OneDrive e correr o primeiro sync.

### 🔄 Bidireccional (DEFAULT em ambos os mounts)

Em cada corrida do cron (ou em `Sincronizar agora`), o mount executa **pull delta seguido de push full**. Stats agregadas ficam guardadas em `mounts.<id>.lastSyncStats`.

#### Política de conflitos: **last-modified-wins (LWW)**

Quando o mesmo ficheiro é modificado em ambos os lados entre sincronizações:

1. **Pull (OneDrive → portal)**: antes de descarregar a versão nova, o `ondrv_sync_delta_for_mount` compara `filemtime(local)` com `lastModifiedDateTime` remoto (`ondrv_iso_to_ts`). Se o local for **mais recente que o remoto + 2 s** (margem para jitter), o download é pulado e regista `conflict_kept_local` no log. O push que corre a seguir envia a versão local para o OneDrive.
2. **Push (portal → OneDrive)**: antes de enviar, `ondrv_push_file_if_stale` compara o `lastModifiedDateTime` remoto conhecido (do items map) com o `filemtime` local. Se o remoto for mais recente, o upload é pulado e regista `conflict_kept_remote` no log.
3. **Sincronização de mtime**: depois de um download, o script chama `ondrv_touch_to_remote()` para alinhar o mtime do ficheiro local com `lastModifiedDateTime` remoto. Isto evita que o push seguinte ache sempre que o local é "mais recente" só porque foi recém-descarregado.
4. **Deletes em conflito**: se chega um delete por delta mas o local foi modificado depois do `lastModifiedDateTime` conhecido, o ficheiro local é preservado e será re-criado no OneDrive no próximo push (registado como `conflict_kept_local_delete`).

Stats combinadas por corrida bidireccional (ver `.navel-onedrive.json`):

```json
{
  "foldersCreated": 2,
  "filesDownloaded": 3,
  "filesUploaded": 7,
  "deleted": 1,
  "skipped": 42,
  "conflictsKeptLocal": 0,
  "errors": 0,
  "pages": 1
}
```

Se o cron detectar erro num dos lados (pull ou push), o `lastSyncStatus` é marcado como `partial` em vez de `ok`.

### Microsoft Graph: throttling e páginas delta

Os pedidos GET/POST principais à Graph usam compressão HTTP quando o servidor a oferece, e em **429** (Too Many Requests), **503** e **504** fazem novas tentativas automáticas, respeitando o header `Retry-After` quando existe; caso contrário aplicam *backoff* exponencial (com teto ~180 s), alinhado às [recomendações de throttling do Microsoft Graph](https://learn.microsoft.com/en-us/graph/throttling). Na **primeira** corrida de *delta* (ainda sem `deltaLink` guardado em `.navel-onedrive.json`), a URL inclui `$top=150` para limitar itens por página. Constantes em `onedrive-lib.php`: `ONDRV_GRAPH_MAX_RETRIES`, `ONDRV_DELTA_PAGE_TOP`. Quando há retries, o log pode mostrar `graph_throttle_retry`.

---

## 2. Registo Entra ID (reutilizado de navel-propostas)

1. <https://entra.microsoft.com> → **Applications → App registrations** → abrir a app usada pelo navel-propostas.
2. **Authentication → Platform Web** → adicionar `https://navel.pt/onedrive-callback.php`.
3. **API permissions → Microsoft Graph → Delegated** → adicionar `Files.ReadWrite.All`. Garantir que estão: `offline_access`, `openid`, `profile`, `User.Read`. Clicar **"Grant admin consent for NAVEL"**.
4. **Certificates & secrets** → reutilizar o mesmo client secret de `navel-propostas/.env` (`MICROSOFT_CLIENT_SECRET`). Se o secret expirar, rodar em ambos os projectos.

---

## 3. Configuração em `documentos-api-config.php`

```php
'microsoft_tenant_id'     => 'f2337638-ba93-4140-91a7-4aab943a8c65',
'microsoft_client_id'     => '7f0a1845-60d0-44ca-ab63-c898d6f5d243',
'microsoft_client_secret' => '... (mesmo secret do navel-propostas) ...',
'microsoft_redirect_uri'  => 'https://navel.pt/onedrive-callback.php',

// Mount Comercial (pull). Alias legacy 'onedrive_root_path' continua a funcionar.
'onedrive_comercial_path' => 'Documentos/NAVEL/CATALOGOS NAVEL',

// Mount AT. Se não existir no OneDrive, é criada na primeira sincronização.
'onedrive_at_path'        => 'Documentos/NAVEL/ASSISTENCIA TECNICA',

// Direcções (OPCIONAIS — default = 'bidirectional').
// Valores válidos: 'pull', 'push', 'bidirectional'.
'onedrive_comercial_direction' => 'bidirectional',
'onedrive_at_direction'        => 'bidirectional',

// Token partilhado com o cron (gera aleatório).
'onedrive_cron_token'     => 'COLOQUE_UM_VALOR_ALEATORIO_LONGO_AQUI',
```

Ficheiros PHP que têm de existir em `public_html/`:

- `onedrive-lib.php` — cliente Graph (multi-mount) *(atualizado)*
- `onedrive-callback.php` — callback OAuth
- `onedrive-cron.php` — sync periódico de todos os mounts *(atualizado)*
- `documentos-api.php` — API principal *(atualizado)*

---

## 4. Primeira ligação

1. Login na Área Reservada como admin (`comercial@navel.pt`).
2. Entra em **Comercial** → painel "OneDrive · fonte de verdade" → **Ligar OneDrive**.
3. Redireccionamento para `login.microsoftonline.com` → fazer login com `pmcerqueira@navel.pt` (+ 2FA).
4. Consentir permissões. O callback guarda o *refresh token* em `documentos-store/.navel-onedrive.json`.
5. De volta ao portal, clicar **Sincronizar agora** → faz mirror completo da pasta Comercial.
6. Navegar para **Assistência Técnica** → painel "Sharepoint · fonte de verdade" → clicar no menu `⋯` → **Sincronizar tudo para o OneDrive** (seed inicial). Daí em diante, uploads/mkdir/delete propagam em tempo real.

---

## 5. Cron (cPanel)

```
*/15 * * * * curl -fsS "https://navel.pt/onedrive-cron.php?token=VALOR_DO_onedrive_cron_token" > /dev/null
```

Por omissão corre **todos os mounts configurados**. Para limitar a um mount:

```
*/15 * * * * curl -fsS "https://navel.pt/onedrive-cron.php?token=TOKEN&mount=at" > /dev/null
```

Comportamento actual (importante):
- Por mount, o cron chama **`ondrv_sync_mount_run_until_done`**: repete sincronização até **`done`** ou **~14 minutos** de parede — adequado a árvores grandes sem depender de cliques manuais contínuos.

Protecções:
- `flock` (ficheiro `.navel-onedrive-sync.lock`) evita sobreposições — corridas concorrentes recebem `ok: true, skipped: already_running`.
- Timeout `set_time_limit(0)` para seeds longos.
- Log append-only em `.navel-onedrive-sync.log` com tag por mount (`sync_ok[at]`, `bidi_ok[at]`, `refetch_done[at]`, ...).

Estado de progresso opcional: `documentos-store/.navel-onedrive-sync-progress.json` (último snapshot por mount).

---

## 6. Estrutura interna

### `documentos-store/.navel-onedrive.json`

```json
{
  "refreshToken": "0.AUwAO...",
  "accessToken": "eyJ0eXAi...",
  "accessTokenExpiresAt": 1734567890,
  "userPrincipalName": "pmcerqueira@navel.pt",
  "displayName": "Pedro Cerqueira",
  "connectedAt": 1734500000,
  "mounts": {
    "comercial": {
      "driveId": "b!XYZ...",
      "rootItemId": "01ABC...",
      "rootOneDrivePath": "Documentos/NAVEL/CATALOGOS NAVEL",
      "deltaLink": "https://graph.microsoft.com/.../delta?token=...",
      "lastSyncAt": 1734567100,
      "lastSyncStatus": "ok",
      "lastSyncStats": { "filesDownloaded": 3, "foldersCreated": 1, "deleted": 0 }
    },
    "at": {
      "driveId": "b!XYZ...",
      "rootItemId": "01DEF...",
      "rootOneDrivePath": "Documentos/NAVEL/ASSISTENCIA TECNICA",
      "lastSyncAt": 1734567105,
      "lastSyncStatus": "ok",
      "lastSyncStats": { "filesUploaded": 7, "foldersCreated": 2 }
    }
  }
}
```

> Migração automática: se o ficheiro ainda está no formato antigo (sem `mounts`), os campos são movidos para `mounts.comercial` na primeira leitura (função `ondrv_migrate_tokens_shape`).

### `documentos-store/.navel-onedrive-items.json`

Mapa `{ itemId → { mountId, kind, absPath, relPath, size, lastModifiedDateTime, localMtimeUtc } }` partilhado por todos os mounts. Usado para:
- *pull*: saber onde cada item OneDrive está mapeado localmente (delete / update / skip).
- *push*: evitar re-uploads desnecessários (compara `size + localMtimeUtc`).

---

## 7. API endpoints (action via `documentos-api.php`)

| Action | Método | Body / Query | Descrição |
| --- | --- | --- | --- |
| `onedrive_status` | GET | — | Status geral + por mount. |
| `onedrive_sync_preview` | GET | `mountId=at\|comercial` | Estimativa: ficheiros em falta no disco, pastas, ficheiros locais (admin). |
| `onedrive_connect_url` | POST | — | Devolve URL de autorização Entra. Admin-only. |
| `onedrive_sync_tick` | POST | `{ mountId, chunkBudgetSeconds? }` | **Um passo** de sync (para UI com barra de progresso). Admin-only. |
| `onedrive_trigger_sync` | POST | `{ mountId? }` | Sync **completo no servidor**: loop até `done` ou tempo máximo (~14 min/mount). Sem `mountId` corre todos. |
| `onedrive_reset_local` | POST | `{ mountId? = 'comercial' }` | Reset local + sync completo iterativo. |
| `onedrive_push_full` | POST | `{ mountId? = 'at' }` | Seed full **apenas para mounts push/bidirectional**. |

UI: o botão **Sincronizar agora** usa **preview + vários `onedrive_sync_tick`** até `done`. O utilizador vê passo e contagens aproximadas.

**Nota:** `onedrive_trigger_sync` mantém-se para operações “num único pedido HTTP” longo (timeout do cliente ~15 min); na prática a UI preferiu ticks mais curtos.

---

## 8. Troubleshooting

| Sintoma | Causa provável | Solução |
| --- | --- | --- |
| `"configured": false` | Faltam credenciais Microsoft | Preencher `microsoft_*`. |
| Callback `invalid_client` | Client secret errado | Reutilizar secret de navel-propostas. |
| Callback `invalid_grant` | Redirect URI não registado | Adicionar no Entra. |
| `root_path_not_found` (Comercial) | Caminho inexistente no OneDrive | Verificar `onedrive_comercial_path`. |
| `root_path_not_found` (AT) | Caminho inexistente e criação falhou | Verificar permissão `Files.ReadWrite.All` e caminho. |
| Cron `409 sync_in_progress` | Execução anterior a correr | Normal; próxima corrida corre quando libertar. |
| AT: ficheiros locais novos não aparecem no OneDrive | Cron desligado e seed manual não accionado | Clicar no menu `⋯` → **Sincronizar tudo para o OneDrive** ou activar cron. |
| Comercial: subpastas apareceram no nível raiz | `parentReference.path` parseado incorrectamente (bug resolvido) | Admin → **Reiniciar mirror local** força full re-sync. |

Logs em `documentos-store/`:
- `.navel-onedrive.json` — tokens + estado (⛔ nunca commitar)
- `.navel-onedrive-items.json` — mapa global itemId → local
- `.navel-onedrive-sync.log` — histórico humano (todas operações taggadas por mount)

---

## 9. Segurança

- Refresh token guardado em `documentos-store/` (bloqueado por `.htaccess`, fora do docroot HTTP na prática).
- OAuth `state` com expiração de 10 min para CSRF.
- Token do cron comparado com `hash_equals` (constant-time).
- Comercial: política explícita de "no-delete from portal".
- AT: todos os users podem carregar; apenas **admin** pode eliminar (bloqueio server-side em `delete`/`delete_tree`).

---

## 10. Operações futuras

- **Bidireccional total**: mudar `direction` de um mount para `bidirectional` na lib. Já fica operacional — delta pull + push full na mesma corrida. Falta definir política de conflitos (preferência: last-modified mais recente vence).
- **Rotação de secret Entra**: actualizar `microsoft_client_secret` aqui **e** no `.env` do navel-propostas.
- **Novo utilizador admin OneDrive**: clicar em **Reautenticar OneDrive** no painel; refresh token é substituído; `deltaLink` é descartado no próximo reset.
- **Novo mount (p.ex. "RH" ou "Qualidade")**: acrescentar em `ondrv_get_mounts()` com `direction` apropriada, adicionar um slug de pasta local em `DOCUMENTOS_ROOT_FOLDERS` e uma chave de config nova.
