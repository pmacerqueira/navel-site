# Checklist canónica — Área reservada, documentos PHP e OneDrive

Este documento existe para **evitar repetir erros operacionais** (build vs zip, deploy parcial, PHP desactualizado, sync à meias, i18n partido).  
**Regra:** antes de dizer “está publicado”, percorrer a secção **Obrigatório**.

---

## Obrigatório — ordem correcta (local)

1. **`npm run build`**  
   - Compila o frontend (Vite) para `dist/`.  
   - Corre `prebuild` → `merge-locales` (privacidade/RGPD).  
   - **`VITE_*` é lido no build** — mudar `.env` sem rebuild = site antigo.

2. **`npm run make-zip`** (ou `OPTIMIZAR.bat`, que inclui passos extra)  
   - O ZIP **`navel-publicar.zip` é gerado a partir de `dist/`** — não do `public/` nem da raiz.  
   - **Erro clássico:** editar `public/documentos-api.php` / `onedrive-lib.php`, **não** correr `build`, e extrair um ZIP **sem** os PHP novos copiados para `dist/`.  
   - O Vite copia `public/` para `dist/` durante o **build**. Se não houver build, o ZIP não leva os PHP actuais.

3. Confirmar que `dist/` contém:
   - `documentos-api.php`, `onedrive-lib.php`, `onedrive-cron.php`, `onedrive-callback.php` (quando existirem em `public/`).

---

## Obrigatório — deploy no cPanel (sem cache “fantasma”)

1. **Apagar a pasta `public_html/assets/`** (ou renomear para backup) **antes** de extrair o novo ZIP.  
   - Os ficheiros JS/CSS têm **hash no nome** (`AreaReservada-xxxxx.js`).  
   - Se ficarem ficheiros velhos, o browser pode continuar a carregar **UI antiga** sem os botões/fluxos novos.

2. Extrair **`navel-publicar.zip`** para a raiz do site (`public_html`).

3. **PHP no servidor:** `documentos-api.php`, `onedrive-lib.php`, `onedrive-cron.php` devem ser **os mesmos** que estão em `dist/` após o build (vêm de `public/`).

4. **`documentos-api-config.php`:**  
   - Deve começar por **`<?php`** (sem isso = erro de parse).  
   - `jwt_secret` = **JWT Secret** do Supabase (Settings → API), **não** a anon key.  
   - Validação de sessão: a API usa o fluxo Supabase adequado ao token (não misturar com HS256 “legacy” errado).

5. **OPcache:** se alterar PHP e o comportamento não mudar, no cPanel **reiniciar PHP** ou pedir ao suporte; às vezes o bytecode antigo fica em cache.

---

## OneDrive / Graph — causas de “0 ficheiros” ou pastas erradas

| Problema | Causa provável | Prevenção |
|----------|----------------|-----------|
| **0 ficheiros** descarregados mas pastas criadas | Delta do Graph **nem sempre** traz `@microsoft.graph.downloadUrl` | O servidor usa fallback **`/content`** + repesca de ficheiros em falta no `itemsMap`. |
| Sync **parar** a meio | **Budget de tempo** por pedido + proxy (~5 min browser) | **Cron** (`onedrive-cron.php`) corre **`run_until_done`** até ~14 min/mount. **UI** usa `onedrive_sync_tick` em ciclo (barra de progresso). **`onedrive_trigger_sync`** também faz loop no servidor até `done`. |
| **Botão “A carregar…”** eterno | `fetch` sem timeout | Cliente: timeout por pedido; servidor: não bloquear indefinidamente. |
| **Pastas duplicadas** (acentos vs ASCII) | UI misturava **taxonomia AT_Manut** com pastas OneDrive | Com mount AT em `push`/`bidirectional`, **não** fundir pastas virtuais da taxonomia; OneDrive é fonte de estrutura. |
| **Apagou no OneDrive e volta a aparecer** | **Push** reenvia | **Tombstones** (`\.navel-onedrive-tombstones.json`) bloqueiam re-upload temporário; `sync_taxonomy_tree` bloqueado quando mount AT activo. |
| **Reiniciar mirror** mensagem errada | i18n | Usar chaves com `{{folder}}` (react-i18next usa **duplas chaves** `{{ }}`). |

### Interpolação i18n

- Em `pt.json` / `en.json` / `es.json`: placeholders **`{{nome}}`**, não `{nome}`.

### API útil (documentos-api.php)

| Action | Uso |
|--------|-----|
| `GET onedrive_sync_preview` | Estimativa: ficheiros em falta no disco, pastas, ficheiros locais. |
| `POST onedrive_sync_tick` | Um passo de sync (polling + progresso). |
| `POST onedrive_trigger_sync` | Sync completo no **servidor** (loop até `done`, ~14 min/mount). |

### Cron

- URL: `https://navel.pt/onedrive-cron.php?token=SEU_TOKEN`  
- **Não** depender só de cliques manuais: o cron deve correr (ex. 15 em 15 min).  
- O script usa **lock** (`.navel-onedrive-sync.lock`); sobreposição → `skipped: already_running`.

### Logs

- `documentos-store/.navel-onedrive-sync.log` — histórico legível.  
- Erros de rede/Graph: procurar `delta_page_failed`, `download_failed`, `refetch_failed`.

---

## Testes rápidos (pós-deploy)

1. [ ] Área reservada: abre sem fazer logout ao **F5** (não forçar `signOut` em reload).  
2. [ ] Admin: **Sincronizar** mostra **preview** + **barra de progresso** (vários passos até concluir).  
3. [ ] Pasta com PDFs no OneDrive: ficheiros aparecem no disco **e** na listagem após sync.  
4. [ ] `onedrive_cron_token` no config **=** token na URL do cron.

---

## Para agentes / assistentes IA (continuidade)

- **Não** prometer “zero erros para sempre”; **sim** seguir esta checklist e `docs/INDEX.md`.  
- **Não** dar ao utilizador **só** comandos de consola se pediu fluxo simples; dar **passos de UI** (File Manager, botões).  
- **Sempre** `build` → `make-zip` após alterar `public/*.php` destinados ao servidor.  
- **PowerShell:** usar **`;`** entre comandos, não `&&` (depende da versão).  
- **curl com redirect www:** pedidos autenticados podem **perder** o header — usar URL canónica **`https://navel.pt`** ou `curl -L` com cuidado.

---

## Referências cruzadas

- `docs/CPANEL-DOCUMENTOS.md` — config da API e disco.  
- `docs/ONEDRIVE.md` — detalhe técnico Graph, mounts, políticas.  
- `docs/SUPABASE.md` — Auth e JWT.  
- `docs/TROUBLESHOOTING.md` — índice de sintomas.  
- `DEPLOY.md` — publicação geral do site.
