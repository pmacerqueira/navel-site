/**
 * Documentos alojados no servidor (PHP + disco) em vez do Storage Supabase.
 * Activar com VITE_DOCUMENTOS_API=/documentos-api.php (ou URL absoluta).
 */
function apiBaseUrl() {
  const raw = import.meta.env.VITE_DOCUMENTOS_API?.trim() || ''
  if (!raw) return null
  if (typeof window === 'undefined') return raw
  try {
    return new URL(raw, window.location.origin).href.replace(/\?$/, '')
  } catch {
    return null
  }
}

export function isCpanelDocumentosMode() {
  return Boolean(apiBaseUrl())
}

function buildUrl(params) {
  const base = apiBaseUrl()
  if (!base) throw new Error('no_documentos_api')
  const u = new URL(base)
  for (const [k, v] of Object.entries(params)) {
    u.searchParams.set(k, v)
  }
  return u.toString()
}

/** Pedidos longos (sync OneDrive) sem timeout deixam o UI em "A carregar..." para sempre. */
const LONG_POST_TIMEOUT_MS = 300000
/** Um passo tick (pull+push com budget) ou sync completo no servidor (varios minutos). */
const ONE_DRIVE_TICK_TIMEOUT_MS = 180000

/**
 * @param {string} url
 * @param {RequestInit} init
 * @param {number} [timeoutMs]
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, init, timeoutMs = LONG_POST_TIMEOUT_MS) {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } catch (e) {
    if (e && typeof e === 'object' && e.name === 'AbortError') {
      const err = new Error('SYNC_REQUEST_TIMEOUT')
      err.cause = e
      throw err
    }
    throw e
  } finally {
    clearTimeout(t)
  }
}

/**
 * @returns {Promise<{ name: string, metadata?: { size?: number, mimetype?: string } }[]>}
 */
export async function cpanelList(accessToken, path) {
  const url = buildUrl({ action: 'list', path: path || '' })
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || data.message || res.statusText || 'list_failed')
  }
  const items = Array.isArray(data.items) ? data.items : []
  return items.map((row) => {
    if (row.isFile) {
      return {
        name: row.name,
        metadata: {
          size: typeof row.size === 'number' ? row.size : 0,
          mimetype: 'application/octet-stream',
        },
      }
    }
    return { name: row.name, metadata: {} }
  })
}

export function cpanelUploadWithProgress(accessToken, currentPath, file, onProgress) {
  const base = apiBaseUrl()
  if (!base) return Promise.reject(new Error('no_documentos_api'))
  const fd = new FormData()
  fd.append('action', 'upload')
  fd.append('path', currentPath || '')
  fd.append('file', file)
  const u = new URL(base)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', u.toString())
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`)
    xhr.upload.onprogress = (evt) => {
      if (!evt.lengthComputable) return
      const pct = Math.max(0, Math.min(100, Math.round((evt.loaded / evt.total) * 100)))
      if (typeof onProgress === 'function') onProgress(pct)
    }
    xhr.onload = () => {
      let data = {}
      try {
        data = JSON.parse(xhr.responseText || '{}')
      } catch {
        data = {}
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data)
        return
      }
      reject(normalizeHttpError(data, xhr.status, xhr.statusText || 'upload_failed'))
    }
    xhr.onerror = () => reject(new Error('network_error'))
    xhr.send(fd)
  })
}

export async function cpanelDownloadBlob(accessToken, relPath) {
  const url = buildUrl({ action: 'download', path: relPath })
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || err.message || res.statusText || 'download_failed')
  }
  return res.blob()
}

export async function cpanelEnsureMarker(accessToken, markerRelPath) {
  const base = apiBaseUrl()
  if (!base) throw new Error('no_documentos_api')
  const res = await fetch(base, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'ensure_marker', path: markerRelPath }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw normalizeHttpError(data, res.status, res.statusText || 'ensure_failed')
  }
}

export async function cpanelDeleteFile(accessToken, relPath) {
  const base = apiBaseUrl()
  if (!base) throw new Error('no_documentos_api')
  const res = await fetch(base, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'delete', path: relPath }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw normalizeHttpError(data, res.status, res.statusText || 'delete_failed')
  }
}

export async function cpanelDeleteTree(accessToken, relPath) {
  const base = apiBaseUrl()
  if (!base) throw new Error('no_documentos_api')
  const res = await fetch(base, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'delete_tree', path: relPath }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw normalizeHttpError(data, res.status, res.statusText || 'delete_failed')
  }
}

export async function cpanelTaxonomyNodes(accessToken) {
  const url = buildUrl({ action: 'taxonomy_nodes' })
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw normalizeHttpError(data, res.status, res.statusText || 'taxonomy_failed')
  }
  return Array.isArray(data.items) ? data.items : []
}

export async function cpanelSyncTaxonomyTree(accessToken) {
  const url = buildUrl({ action: 'sync_taxonomy_tree' })
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw normalizeHttpError(data, res.status, res.statusText || 'taxonomy_sync_failed')
  }
  return data
}

export async function cpanelOnedriveStatus(accessToken) {
  const url = buildUrl({ action: 'onedrive_status' })
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw normalizeHttpError(data, res.status, res.statusText || 'onedrive_status_failed')
  }
  return data
}

export async function cpanelOnedriveConnectUrl(accessToken) {
  const base = apiBaseUrl()
  if (!base) throw new Error('no_documentos_api')
  const res = await fetch(base, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'onedrive_connect_url' }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw normalizeHttpError(data, res.status, res.statusText || 'onedrive_connect_url_failed')
  }
  return data.url || ''
}

/**
 * Estimativa leve antes de sincronizar (ficheiros em falta no disco, pastas, ficheiros locais).
 */
export async function cpanelOnedriveSyncPreview(accessToken, mountId = 'at') {
  const url = buildUrl({ action: 'onedrive_sync_preview', mountId })
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw normalizeHttpError(data, res.status, res.statusText || 'onedrive_preview_failed')
  }
  return data
}

/**
 * Um passo de sincronizacao (polling). Repetir ate `done === true`.
 */
export async function cpanelOnedriveSyncTick(accessToken, mountId, chunkBudgetSeconds = 90) {
  const base = apiBaseUrl()
  if (!base) throw new Error('no_documentos_api')
  const res = await fetchWithTimeout(
    base,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'onedrive_sync_tick',
        mountId,
        chunkBudgetSeconds,
      }),
    },
    ONE_DRIVE_TICK_TIMEOUT_MS,
  )
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw normalizeHttpError(data, res.status, res.statusText || 'onedrive_tick_failed')
  }
  return data
}

/**
 * Reinicia o espelho local (apenas para mounts 'pull' — tipicamente 'comercial').
 * Apaga ficheiros locais do mount, items map e deltaLink, e força full re-sync.
 */
export async function cpanelOnedriveResetLocal(accessToken, mountId = 'comercial') {
  const base = apiBaseUrl()
  if (!base) throw new Error('no_documentos_api')
  const res = await fetchWithTimeout(base, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'onedrive_reset_local', mountId }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw normalizeHttpError(data, res.status, res.statusText || 'onedrive_reset_failed')
  }
  return data
}

/**
 * Faz push-full (seed) de um mount 'push' ou 'bidirectional' — tipicamente 'at'.
 * Sobe recursivamente o conteúdo local para OneDrive, criando pastas em falta
 * e re-enviando ficheiros alterados.
 */
export async function cpanelOnedrivePushFull(accessToken, mountId = 'at') {
  const base = apiBaseUrl()
  if (!base) throw new Error('no_documentos_api')
  const res = await fetchWithTimeout(base, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'onedrive_push_full', mountId }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw normalizeHttpError(data, res.status, res.statusText || 'onedrive_push_full_failed')
  }
  return data
}

/**
 * Remove pastas/ficheiros locais de um mount que nao existam no items map
 * OneDrive. Protege ficheiros com mtime < 24h (possiveis uploads recentes).
 * @param {string} accessToken
 * @param {string} mountId - 'at' ou 'comercial'
 * @param {boolean} dryRun - se true, apenas lista candidatos sem apagar
 */
export async function cpanelOnedrivePurgeOrphans(accessToken, mountId = 'at', dryRun = false) {
  const base = apiBaseUrl()
  if (!base) throw new Error('no_documentos_api')
  const res = await fetchWithTimeout(
    base,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'onedrive_purge_orphans', mountId, dryRun }),
    },
    LONG_POST_TIMEOUT_MS,
  )
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw normalizeHttpError(data, res.status, res.statusText || 'onedrive_purge_failed')
  }
  return data
}

/**
 * Diagnostico de um mount OneDrive: lista o que ha localmente vs o que
 * o Graph API devolve em /children do root do mount.
 */
export async function cpanelOnedriveDebugMount(accessToken, mountId = 'at', relPath = '') {
  const base = apiBaseUrl()
  if (!base) throw new Error('no_documentos_api')
  const params = new URLSearchParams({ action: 'onedrive_debug_mount', mountId })
  if (relPath) params.set('relPath', relPath)
  const res = await fetch(`${base}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw normalizeHttpError(data, res.status, res.statusText || 'onedrive_debug_failed')
  }
  return data
}

/**
 * Reconcile forcado: apaga TUDO localmente (1o nivel) que nao exista
 * no /children do root do mount no OneDrive. Usa-se para apagar pastas
 * duplicadas/orfas legadas.
 */
export async function cpanelOnedriveForceReconcile(accessToken, mountId = 'at', dryRun = false, relPath = '') {
  const base = apiBaseUrl()
  if (!base) throw new Error('no_documentos_api')
  const body = { action: 'onedrive_force_reconcile', mountId, dryRun }
  if (relPath) body.relPath = relPath
  const res = await fetchWithTimeout(
    base,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
    LONG_POST_TIMEOUT_MS,
  )
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw normalizeHttpError(data, res.status, res.statusText || 'onedrive_force_reconcile_failed')
  }
  return data
}

function normalizeHttpError(data, status, fallback) {
  const err = new Error(data?.error || data?.message || fallback || 'request_failed')
  err.status = status
  err.code = data?.error || ''
  return err
}
