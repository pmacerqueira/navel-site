import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import {
  isCpanelDocumentosMode,
  cpanelList,
  cpanelUploadWithProgress,
  cpanelTaxonomyNodes,
  cpanelSyncTaxonomyTree,
  cpanelDownloadBlob,
  cpanelEnsureMarker,
  cpanelDeleteFile,
  cpanelDeleteTree,
  cpanelOnedriveStatus,
  cpanelOnedriveConnectUrl,
  cpanelOnedriveSyncPreview,
  cpanelOnedriveSyncTick,
  cpanelOnedriveResetLocal,
  cpanelOnedrivePushFull,
  cpanelOnedrivePurgeOrphans,
  cpanelOnedriveDebugMount,
  cpanelOnedriveForceReconcile,
  cpanelAuditLog,
  cpanelRecentDocuments,
  cpanelSetMetadata,
} from '../lib/documentosCpanelApi'
import {
  ASSISTENCIA_TECNICA_ROOT,
  COMERCIAL_ROOT,
  DOCUMENTOS_ROOT_FOLDERS,
  DOCUMENT_TYPES,
  normalizeTaxonomyPath,
  normalizeFolderDedupeKey,
  pathMatchesMountFolder,
  relativePathUnderAssistenciaRoot,
} from '../lib/documentosSchema'
import PortalCommandPalette from '../components/PortalCommandPalette'
import DocumentPreviewModal from '../components/DocumentPreviewModal'
import {
  IconAdd,
  IconArrowDownload,
  IconArrowLeft,
  IconArrowSync,
  IconArrowUpload,
  IconCamera,
  IconChevronDown,
  IconCloud,
  IconCloudArrowDown,
  IconCloudArrowUp,
  IconFileType,
  IconFolder,
  IconFolderOpen,
  IconMoreHorizontal,
  IconSearch,
  IconWrenchScrewdriver,
} from '../components/FluentIcons'

const ONEDRIVE_MOUNT_FOLDERS = {
  comercial: COMERCIAL_ROOT,
  at: ASSISTENCIA_TECNICA_ROOT,
}

const BUCKET = 'documentos'
const useCpanelDocs = isCpanelDocumentosMode()
const FOLDER_MARKER = '.navel-folder'

function atManutEquipamentosUrl(subcategoriaId) {
  const base = (import.meta.env.VITE_AT_MANUT_BASE?.trim() || '').replace(/\/$/, '')
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const root = base || `${origin}/manut`
  const q = subcategoriaId ? `?focusSubcategoria=${encodeURIComponent(String(subcategoriaId))}` : ''
  return `${root}/equipamentos${q}`
}

function isFile(item) {
  return item.metadata?.mimetype != null || (item.metadata?.size != null && item.metadata?.size > 0)
}

function sanitizeSegment(name) {
  return normalizeTaxonomyPath(String(name || ''))
    .replace(/\.\./g, '')
    .replace(/[<>:"|?*]/g, '')
    .replace(/[\\/]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 120)
}

function joinStoragePath(base, name) {
  const s = sanitizeSegment(name)
  if (!s) return null
  return base ? `${base}/${s}` : s
}

function formatBytes(value) {
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0) return '—'
  if (value === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const exp = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1)
  const size = value / 1024 ** exp
  return `${size >= 10 || exp === 0 ? Math.round(size) : size.toFixed(1)} ${units[exp]}`
}

function formatDate(value, locale) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat(locale || undefined, { dateStyle: 'short', timeStyle: 'short' }).format(d)
}

function detectFileType(itemName = '', mimetype = '') {
  const lower = itemName.toLowerCase()
  if (mimetype.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/.test(lower)) return 'image'
  if (mimetype === 'application/pdf' || lower.endsWith('.pdf')) return 'pdf'
  if (/\.(docx?|xlsx?|pptx?|txt|csv|zip|rar)$/.test(lower)) return 'document'
  return 'other'
}

// Cache global de thumbnails (objectURLs) partilhado entre renders
const thumbCache = new Map()
const thumbInflight = new Map()

const FileThumbnail = memo(function FileThumbnail({ fullPath, fileType, fileName, token }) {
  const [url, setUrl] = useState(() => thumbCache.get(fullPath) || null)
  const [errored, setErrored] = useState(false)

  useEffect(() => {
    if (fileType !== 'image' || !token || !useCpanelDocs) return undefined
    if (thumbCache.has(fullPath)) {
      setUrl(thumbCache.get(fullPath))
      return undefined
    }
    let cancelled = false
    const existing = thumbInflight.get(fullPath)
    const task = existing
      || cpanelDownloadBlob(token, fullPath)
        .then((blob) => {
          if (!blob.type.startsWith('image/')) throw new Error('not_image')
          const obj = URL.createObjectURL(blob)
          thumbCache.set(fullPath, obj)
          return obj
        })
        .finally(() => {
          thumbInflight.delete(fullPath)
        })
    if (!existing) thumbInflight.set(fullPath, task)
    task.then((obj) => {
      if (!cancelled) setUrl(obj)
    }).catch(() => {
      if (!cancelled) setErrored(true)
    })
    return () => { cancelled = true }
  }, [fullPath, fileType, token])

  if (fileType === 'image' && url && !errored) {
    return (
      <span className="doc-file-thumb doc-file-thumb--image" aria-hidden>
        <img src={url} alt="" loading="lazy" />
      </span>
    )
  }
  return (
    <span className={`doc-file-thumb doc-file-thumb--${fileType}`} aria-hidden>
      {fileType === 'image' && !errored ? (
        <span className="doc-file-thumb__skeleton" />
      ) : (
        <span className="doc-file-thumb__icon"><IconFileType type={fileType} /></span>
      )}
      <span className="doc-file-thumb__ext">{(fileName.split('.').pop() || '').slice(0, 4).toLowerCase()}</span>
    </span>
  )
})

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function compressImageIfNeeded(file) {
  const isImage = (file.type || '').startsWith('image/')
  const maxBytes = 4 * 1024 * 1024
  if (!isImage || file.size <= maxBytes) return file

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('image_read_failed'))
    reader.readAsDataURL(file)
  })
  const image = await new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image_decode_failed'))
    img.src = dataUrl
  })
  const maxDim = 2200
  const ratio = Math.min(1, maxDim / image.width, maxDim / image.height)
  const w = Math.max(1, Math.round(image.width * ratio))
  const h = Math.max(1, Math.round(image.height * ratio))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.drawImage(image, 0, 0, w, h)
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82))
  if (!blob) return file
  if (blob.size >= file.size) return file
  return new File([blob], file.name.replace(/\.(png|webp|heic|heif)$/i, '.jpg'), { type: 'image/jpeg' })
}

async function listAllObjectPaths(supabaseClient, prefix) {
  const out = []
  const walk = async (p) => {
    const { data, error } = await supabaseClient.storage.from(BUCKET).list(p, { limit: 1000 })
    if (error) throw error
    for (const item of data || []) {
      if (!item.name || item.name === '.' || item.name === '..') continue
      const full = p ? `${p}/${item.name}` : item.name
      if (isFile(item)) out.push(full)
      else await walk(full)
    }
  }
  await walk(prefix)
  return out
}

async function removePathsInChunks(supabaseClient, paths) {
  const chunk = 80
  for (let i = 0; i < paths.length; i += chunk) {
    const slice = paths.slice(i, i + chunk)
    const { error } = await supabaseClient.storage.from(BUCKET).remove(slice)
    if (error) throw error
  }
}

function MenuDropdown({ trigger, children, align = 'right', label }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  return (
    <div className={`doc-menu${open ? ' doc-menu--open' : ''}`} ref={ref}>
      <button
        type="button"
        className="doc-menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
      >
        {trigger}
      </button>
      {open && (
        <div
          className={`doc-menu__panel doc-menu__panel--${align}`}
          role="menu"
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  )
}

export default function AreaReservada() {
  const { t } = useTranslation()
  const locale = useMemo(() => {
    const htmlLang = typeof document !== 'undefined' ? document.documentElement.lang : ''
    return htmlLang || undefined
  }, [])
  const { user, signOut, isAdmin } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPath, setCurrentPath] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadFeedback, setUploadFeedback] = useState(null)
  const [bucketMissing, setBucketMissing] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [selectedFiles, setSelectedFiles] = useState([])
  const [uploadStatuses, setUploadStatuses] = useState([])
  const [uploadMeta, setUploadMeta] = useState({ title: '', tags: '', note: '' })
  const [uploadDocumentType, setUploadDocumentType] = useState('')
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [preview, setPreview] = useState({ open: false, title: '', blobUrl: null, fileType: '' })
  const [versionHistory, setVersionHistory] = useState({})
  const [auditLog, setAuditLog] = useState([])
  const [recentDocuments, setRecentDocuments] = useState([])
  const [fileSort, setFileSort] = useState({ key: 'date', dir: 'desc' })
  const [selectedForDelete, setSelectedForDelete] = useState([])
  const [metaModal, setMetaModal] = useState(null)
  const [metaSaving, setMetaSaving] = useState(false)
  const [taxonomyNodes, setTaxonomyNodes] = useState([])
  const [openHistoryPath, setOpenHistoryPath] = useState(null)
  const [onedriveStatus, setOnedriveStatus] = useState(null)
  const [onedriveBusy, setOnedriveBusy] = useState(false)
  const [onedriveFeedback, setOnedriveFeedback] = useState(null)
  const [onedriveSyncProgress, setOnedriveSyncProgress] = useState(null)
  const ensuringRootsRef = useRef(false)
  const rootEnsuredOnceRef = useRef(false)
  const itemsRef = useRef([])
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const dragDepthRef = useRef(0)
  const [dragActive, setDragActive] = useState(false)
  const [accessToken, setAccessToken] = useState(null)

  useEffect(() => {
    if (useCpanelDocs) return
    try {
      const versionsRaw = window.localStorage.getItem('portalFileVersions')
      const auditRaw = window.localStorage.getItem('portalAuditLog')
      if (versionsRaw) setVersionHistory(JSON.parse(versionsRaw))
      if (auditRaw) setAuditLog(JSON.parse(auditRaw))
    } catch {
      /* noop */
    }
  }, [])

  useEffect(() => {
    if (!useCpanelDocs || !accessToken) return undefined
    let cancelled = false
    cpanelRecentDocuments(accessToken, 10)
      .then((rows) => {
        if (!cancelled) setRecentDocuments(rows)
      })
      .catch(() => {
        if (!cancelled) setRecentDocuments([])
      })
    return () => {
      cancelled = true
    }
  }, [accessToken, currentPath])

  useEffect(() => {
    if (!useCpanelDocs || !isAdmin || !accessToken) return undefined
    let cancelled = false
    cpanelAuditLog(accessToken, { limit: 250 })
      .then((rows) => {
        if (cancelled) return
        setAuditLog(
          rows.map((r) => ({
            at: r.timestamp,
            user: r.userEmail,
            action: r.action,
            target: r.path,
          })),
        )
      })
      .catch(() => {
        if (!cancelled) setAuditLog([])
      })
    return () => {
      cancelled = true
    }
  }, [useCpanelDocs, isAdmin, accessToken, currentPath])

  useEffect(() => {
    if (!supabase) return undefined
    let cancelled = false
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setAccessToken(data?.session?.access_token || null)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_ev, session) => {
      if (!cancelled) setAccessToken(session?.access_token || null)
    })
    return () => { cancelled = true; sub?.subscription?.unsubscribe?.() }
  }, [])

  const writeVersionHistory = useCallback((updater) => {
    setVersionHistory((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      try {
        window.localStorage.setItem('portalFileVersions', JSON.stringify(next))
      } catch {
        /* noop */
      }
      return next
    })
  }, [])

  const writeAuditLog = useCallback((entry) => {
    setAuditLog((prev) => {
      const next = [
        { at: new Date().toISOString(), user: user?.email || 'unknown', ...entry },
        ...prev,
      ].slice(0, 80)
      try {
        window.localStorage.setItem('portalAuditLog', JSON.stringify(next))
      } catch {
        /* noop */
      }
      return next
    })
  }, [user?.email])

  const rootLabelMap = useMemo(() => {
    const m = {}
    for (const { slug, labelKey } of DOCUMENTOS_ROOT_FOLDERS) {
      m[slug] = t(labelKey)
    }
    return m
  }, [t])

  // Detecta em qual mount OneDrive cai o caminho corrente (para apagar, pull, debug).
  // Comercial = pull (OneDrive → Sharepoint). AT = push (Sharepoint → OneDrive).
  const activeMount = useMemo(() => {
    if (!currentPath) return null
    for (const [id, folder] of Object.entries(ONEDRIVE_MOUNT_FOLDERS)) {
      if (pathMatchesMountFolder(currentPath, folder)) {
        return { id, folder }
      }
    }
    return null
  }, [currentPath])

  /** Mounts OneDrive configurados no servidor (Comercial + Assistência Técnica), ordem fixa. */
  const onedriveMountEntries = useMemo(() => {
    const mounts = onedriveStatus?.mounts
    if (!mounts) return []
    const order = ['comercial', 'at']
    return order
      .map((id) => {
        const st = mounts[id]
        if (!st) return null
        const folder = ONEDRIVE_MOUNT_FOLDERS[id]
        return folder ? { id, folder, status: st } : null
      })
      .filter(Boolean)
  }, [onedriveStatus])

  const activeMountStatus = useMemo(() => {
    if (!activeMount) return null
    return onedriveStatus?.mounts?.[activeMount.id] || null
  }, [activeMount, onedriveStatus])

  const isInsidePullMount = activeMountStatus?.direction === 'pull'

  /** Sem direccao AT ou push/bidireccional: nao correr sync_taxonomy_tree (servidor). */
  const atSkipsTaxonomySync = useMemo(() => {
    const d = onedriveStatus?.mounts?.at?.direction
    return !d || d === 'push' || d === 'bidirectional'
  }, [onedriveStatus])

  /**
   * Fundir sempre pastas da taxonomia AT_Manut com as pastas físicas (OneDrive/servidor).
   * Antes, em push/bidireccional, a UI escondia os nós da taxonomia e só mostrava o espelho
   * OneDrive — parecia que o portal “ignorava” o AT após corrigir nomes no AT_Manut.
   * O PHP continua a não criar pastas em disco (sync_taxonomy_tree) quando o mount AT é
   * push/bidireccional; só a listagem funde virtuais + físicas (dedupe por nome normalizado).
   */
  const atHidesTaxonomyVirtualFolders = false

  // Usamos um boolean derivado de onedriveStatus para evitar recriar loadTaxonomy
  // sempre que o objecto status é substituído por uma nova referência.
  const onedriveReady = Boolean(onedriveStatus)
  const loadTaxonomy = useCallback(async () => {
    if (!useCpanelDocs || !supabase) return
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      if (!token) return
      // Defensivo: sem status OneDrive, nao disparamos sync_taxonomy_tree (evita colisoes).
      if (!onedriveReady) return
      if (!atSkipsTaxonomySync) {
        await cpanelSyncTaxonomyTree(token).catch(() => null)
      }
      const items = await cpanelTaxonomyNodes(token)
      setTaxonomyNodes(Array.isArray(items) ? items : [])
    } catch {
      setTaxonomyNodes([])
    }
  }, [supabase, onedriveReady, atSkipsTaxonomySync])

  const loadItems = useCallback(async (path = '') => {
    if (!supabase) {
      setLoading(false)
      setError(t('auth.supabaseNotConfigured'))
      return
    }
    setLoading(true)
    setError(null)
    setBucketMissing(false)
    if (useCpanelDocs) {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData?.session?.access_token
        if (!token) {
          setError(t('auth.supabaseNotConfigured'))
          setItems([])
          setLoading(false)
          return
        }
        const mapped = await cpanelList(token, path)
        const list = mapped.filter((f) => f.name && !f.name.startsWith('.'))
        setItems(list)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        setError(msg)
        setItems([])
      }
      setLoading(false)
      return
    }
    const { data, error: err } = await supabase.storage.from(BUCKET).list(path, { limit: 500 })
    setLoading(false)
    if (err) {
      const isBucketNotFound = err.message?.includes('Bucket not found') || err.message?.includes('not found')
      setBucketMissing(isBucketNotFound)
      setError(isBucketNotFound ? t('auth.bucketNotFound') : err.message)
      setItems([])
      return
    }
    const list = (data || []).filter((f) => f.name && !f.name.startsWith('.'))
    setItems(list)
    // useCpanelDocs e constante por build (VITE_DOCUMENTOS_API)
  }, [t])

  const ensureRootFolders = useCallback(async () => {
    if (!supabase || currentPath !== '' || ensuringRootsRef.current) return
    // Ler items via ref para não recriar o callback a cada mudança de items
    // (senão o useEffect que o observa dispara em loop sempre que loadItems setta items).
    const currentItems = itemsRef.current
    const folderNames = new Set(
      currentItems.filter((i) => !isFile(i)).map((i) => i.name)
    )
    const missing = DOCUMENTOS_ROOT_FOLDERS.filter(({ slug }) => !folderNames.has(slug))
    if (missing.length === 0) return
    ensuringRootsRef.current = true
    try {
      if (useCpanelDocs) {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData?.session?.access_token
        if (!token) return
        for (const { slug } of missing) {
          await cpanelEnsureMarker(token, `${slug}/${FOLDER_MARKER}`)
        }
      } else {
        const blob = new Uint8Array([32])
        for (const { slug } of missing) {
          const markerPath = `${slug}/${FOLDER_MARKER}`
          await supabase.storage.from(BUCKET).upload(markerPath, blob, { upsert: false, contentType: 'application/octet-stream' })
        }
      }
      await loadItems('')
    } catch {
      /* ignorar — admin pode criar manualmente */
    } finally {
      ensuringRootsRef.current = false
    }
  }, [supabase, currentPath, loadItems, useCpanelDocs])

  const loadOnedriveStatus = useCallback(async () => {
    if (!useCpanelDocs || !supabase) return
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      if (!token) return
      const status = await cpanelOnedriveStatus(token)
      setOnedriveStatus(status)
    } catch {
      setOnedriveStatus(null)
    }
  }, [useCpanelDocs, supabase])

  const handleOnedriveConnect = useCallback(async () => {
    if (!supabase) return
    try {
      setOnedriveBusy(true)
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      if (!token) {
        setOnedriveFeedback({ type: 'error', msg: t('auth.supabaseNotConfigured') })
        return
      }
      const url = await cpanelOnedriveConnectUrl(token)
      if (url) {
        window.location.href = url
      }
    } catch (err) {
      setOnedriveFeedback({ type: 'error', msg: err instanceof Error ? err.message : String(err) })
    } finally {
      setOnedriveBusy(false)
    }
  }, [t])

  const handleOnedriveSync = useCallback(async (mountId = '') => {
    if (!supabase) return
    try {
      setOnedriveBusy(true)
      setOnedriveFeedback(null)
      setOnedriveSyncProgress(null)
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      if (!token) return

      let previewEstimate = { filesMissing: 0, foldersMissing: 0, localFiles: 0 }
      try {
        const prev = await cpanelOnedriveSyncPreview(token, mountId || 'at')
        previewEstimate = prev?.estimate || previewEstimate
      } catch {
        /* continua mesmo sem preview */
      }

      const initialTotal =
        (previewEstimate.filesMissing || 0) +
        (previewEstimate.foldersMissing || 0) +
        (previewEstimate.localFiles || 0)

      let iteration = 0
      let done = false
      let lastOk = true
      let lastTick = null
      while (!done) {
        iteration += 1
        const tick = await cpanelOnedriveSyncTick(token, mountId || 'at', 120)
        lastTick = tick
        lastOk = Boolean(tick?.ok)
        const est = tick?.estimate || {}
        const stats = tick?.result?.stats || {}
        const phase = tick?.result?.pull && tick?.result?.push ? 'bidirectional' : 'sync'
        setOnedriveSyncProgress({
          iteration,
          filesMissing: est.filesMissing ?? 0,
          foldersMissing: est.foldersMissing ?? 0,
          localFiles: est.localFiles ?? 0,
          phase,
          filesDownloadedStep: stats.filesDownloaded || 0,
          filesUploadedStep: stats.filesUploaded || 0,
          initialTotal: initialTotal || 1,
        })
        done = Boolean(tick?.done)
        if (!lastOk) break
        if (iteration > 400) {
          setOnedriveFeedback({ type: 'warning', msg: t('auth.onedriveSyncTooManyIterations') })
          break
        }
      }

      if (lastOk && done) {
        setOnedriveFeedback({
          type: 'success',
          msg: t('auth.onedriveSyncCompleteOk'),
        })
      } else if (lastOk && !done) {
        setOnedriveFeedback({
          type: 'info',
          msg: t('auth.onedriveSyncPartialStop'),
        })
      } else {
        const err = String(lastTick?.result?.error || 'sync_failed')
        setOnedriveFeedback({ type: 'error', msg: err })
      }
      await loadOnedriveStatus()
      await loadItems(currentPath)
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err)
      if (raw === 'SYNC_REQUEST_TIMEOUT') {
        setOnedriveFeedback({
          type: 'warning',
          msg: t('auth.onedriveSyncTimeout'),
        })
      } else {
        setOnedriveFeedback({ type: 'error', msg: raw })
      }
      await loadOnedriveStatus()
      await loadItems(currentPath)
    } finally {
      setOnedriveSyncProgress(null)
      setOnedriveBusy(false)
    }
  }, [t, loadOnedriveStatus, loadItems, currentPath])

  const handleOnedriveResetLocal = useCallback(async (mountId = 'comercial') => {
    if (!supabase) return
    const folderLabel = mountId === 'at' ? 'Assistência Técnica' : 'Comercial'
    if (typeof window !== 'undefined' && !window.confirm(t('auth.onedriveResetConfirm', { folder: folderLabel }))) return
    try {
      setOnedriveBusy(true)
      setOnedriveFeedback(null)
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      if (!token) return
      const res = await cpanelOnedriveResetLocal(token, mountId)
      if (res?.ok) {
        const s = res.sync?.stats || {}
        setOnedriveFeedback({
          type: 'success',
          msg: t('auth.onedriveResetOk', {
            folders: s.foldersCreated || 0,
            files: s.filesDownloaded || 0,
          }),
        })
      } else {
        setOnedriveFeedback({ type: 'error', msg: res?.error || 'reset_failed' })
      }
      await loadOnedriveStatus()
      await loadItems(currentPath)
    } catch (err) {
      setOnedriveFeedback({ type: 'error', msg: err instanceof Error ? err.message : String(err) })
    } finally {
      setOnedriveBusy(false)
    }
  }, [t, loadOnedriveStatus, loadItems, currentPath])

  const handleOnedrivePurgeOrphans = useCallback(async (mountId = 'at') => {
    if (!supabase) return
    try {
      setOnedriveBusy(true)
      setOnedriveFeedback(null)
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      if (!token) return
      const dry = await cpanelOnedrivePurgeOrphans(token, mountId, true)
      const n = Number(dry?.candidates || 0)
      if (n === 0) {
        setOnedriveFeedback({ type: 'success', msg: t('auth.onedrivePurgeNone') })
        return
      }
      const msgConfirm = t('auth.onedrivePurgeConfirm', { count: n })
      if (typeof window !== 'undefined' && !window.confirm(msgConfirm)) return
      const res = await cpanelOnedrivePurgeOrphans(token, mountId, false)
      if (res?.ok) {
        setOnedriveFeedback({ type: 'success', msg: t('auth.onedrivePurgeOk', { removed: res.removed || 0 }) })
      } else {
        setOnedriveFeedback({ type: 'error', msg: res?.error || 'purge_failed' })
      }
      await loadItems(currentPath)
    } catch (err) {
      setOnedriveFeedback({ type: 'error', msg: err instanceof Error ? err.message : String(err) })
    } finally {
      setOnedriveBusy(false)
    }
  }, [t, loadItems, currentPath])

  const relPathInsideActiveMount = useMemo(() => {
    if (!activeMount) return ''
    const root = activeMount.folder || ''
    if (!root || !currentPath) return ''
    if (currentPath === root) return ''
    const prefix = root + '/'
    if (currentPath.toLowerCase().startsWith(prefix.toLowerCase())) {
      return currentPath.slice(prefix.length)
    }
    return ''
  }, [activeMount, currentPath])

  const handleOnedriveDebug = useCallback(async (mountId = 'at') => {
    if (!supabase) return
    try {
      setOnedriveBusy(true)
      setOnedriveFeedback(null)
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      if (!token) return
      const data = await cpanelOnedriveDebugMount(token, mountId, relPathInsideActiveMount)
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.info('[OneDrive debug]', data)
      }
      const loc = relPathInsideActiveMount || '/'
      const summary = `[${loc}] Local: ${data?.counts?.local ?? '?'} · Graph: ${data?.counts?.graph ?? '?'} · Só local: ${(data?.localOnly || []).join(', ') || '—'}`
      setOnedriveFeedback({ type: 'info', msg: summary })
    } catch (err) {
      setOnedriveFeedback({ type: 'error', msg: err instanceof Error ? err.message : String(err) })
    } finally {
      setOnedriveBusy(false)
    }
  }, [supabase, relPathInsideActiveMount])

  const handleOnedriveForceReconcile = useCallback(async (mountId = 'at') => {
    if (!supabase) return
    try {
      setOnedriveBusy(true)
      setOnedriveFeedback(null)
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      if (!token) return
      const dry = await cpanelOnedriveForceReconcile(token, mountId, true, relPathInsideActiveMount)
      const names = (dry?.candidates || []).map(c => c.name)
      if (!names.length) {
        setOnedriveFeedback({ type: 'success', msg: t('auth.onedriveReconcileNone') })
        return
      }
      const msg = t('auth.onedriveReconcileConfirm', { list: names.join(', '), count: names.length })
      if (typeof window !== 'undefined' && !window.confirm(msg)) return
      const res = await cpanelOnedriveForceReconcile(token, mountId, false, relPathInsideActiveMount)
      if (res?.ok) {
        setOnedriveFeedback({ type: 'success', msg: t('auth.onedriveReconcileOk', { removed: res.removed || 0 }) })
      } else {
        setOnedriveFeedback({ type: 'error', msg: res?.error || 'reconcile_failed' })
      }
      await loadItems(currentPath)
    } catch (err) {
      setOnedriveFeedback({ type: 'error', msg: err instanceof Error ? err.message : String(err) })
    } finally {
      setOnedriveBusy(false)
    }
  }, [t, loadItems, currentPath, supabase, relPathInsideActiveMount])

  const handleOnedrivePushFull = useCallback(async (mountId = 'at') => {
    if (!supabase) return
    if (typeof window !== 'undefined' && !window.confirm(t('auth.onedrivePushFullConfirm'))) return
    try {
      setOnedriveBusy(true)
      setOnedriveFeedback(null)
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      if (!token) return
      const res = await cpanelOnedrivePushFull(token, mountId)
      if (res?.ok) {
        const s = res.result?.stats || {}
        setOnedriveFeedback({
          type: 'success',
          msg: t('auth.onedrivePushFullOk', {
            folders: s.foldersCreated || 0,
            files: s.filesUploaded || 0,
          }),
        })
      } else {
        setOnedriveFeedback({ type: 'error', msg: res?.error || 'push_full_failed' })
      }
      await loadOnedriveStatus()
      await loadItems(currentPath)
    } catch (err) {
      setOnedriveFeedback({ type: 'error', msg: err instanceof Error ? err.message : String(err) })
    } finally {
      setOnedriveBusy(false)
    }
  }, [t, loadOnedriveStatus, loadItems, currentPath])

  useEffect(() => {
    loadItems(currentPath)
  }, [currentPath, loadItems])

  useEffect(() => {
    if (!useCpanelDocs) return
    void loadOnedriveStatus()
  }, [useCpanelDocs, loadOnedriveStatus])

  useEffect(() => {
    if (!useCpanelDocs) return
    void loadTaxonomy()
  }, [useCpanelDocs, loadTaxonomy])

  // Quando a aba volta a ficar visivel, refresh do status OneDrive + items.
  // Isto lida com o caso em que o utilizador clicou "Sincronizar agora" e
  // mudou para outra aba: o servidor continua a sincronizar em background,
  // mas o browser suspende a aba e a resposta fica pendurada. Ao voltar,
  // recarregamos o estado para apanhar o resultado real.
  useEffect(() => {
    if (typeof document === 'undefined') return
    if (!useCpanelDocs) return
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      setOnedriveBusy(false)
      void loadOnedriveStatus()
      void loadItems(currentPath)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [loadOnedriveStatus, loadItems, currentPath])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const flag = params.get('onedrive')
    if (!flag) return
    if (flag === 'connected') {
      setOnedriveFeedback({ type: 'success', msg: t('auth.onedriveConnected') })
    } else if (flag === 'error') {
      setOnedriveFeedback({ type: 'error', msg: t('auth.onedriveConnectError', { reason: params.get('reason') || '' }) })
    }
    params.delete('onedrive')
    params.delete('reason')
    const next = window.location.pathname + (params.toString() ? `?${params}` : '')
    window.history.replaceState({}, '', next)
  }, [t])

  // Mantém um snapshot estável de items para o ensureRootFolders (via ref),
  // evitando o loop de render.
  useEffect(() => {
    itemsRef.current = items
  }, [items])

  // Garante as pastas raiz UMA VEZ por sessão, depois do primeiro list concluído.
  // Se o servidor não conseguir persistir (permissões, admin), não reentra em loop.
  useEffect(() => {
    if (rootEnsuredOnceRef.current) return
    if (loading || error) return
    if (currentPath !== '') return
    rootEnsuredOnceRef.current = true
    void ensureRootFolders()
    // deliberadamente sem dep em ensureRootFolders — ref guarda-se uma única vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, error, currentPath])

  const handleCreateBucket = async () => {
    if (useCpanelDocs || !supabase || !isAdmin) return
    setUploading(true)
    setError(null)
    const { error: err } = await supabase.storage.createBucket(BUCKET, { public: false })
    setUploading(false)
    if (err) {
      setError(err.message)
      return
    }
    setBucketMissing(false)
    setError(null)
    loadItems('')
  }

  const folders = useMemo(
    () => items.filter((i) => !isFile(i)),
    [items]
  )
  const taxonomyChildFolders = useMemo(() => {
    const rel = relativePathUnderAssistenciaRoot(currentPath)
    if (rel === null || taxonomyNodes.length === 0) return []
    if (atHidesTaxonomyVirtualFolders) return []
    const relNorm = normalizeTaxonomyPath(rel).replace(/\\/g, '/')
    const stripAssistenciaPrefix = (value) => {
      const v = normalizeTaxonomyPath(String(value || '')).replace(/\\/g, '/')
      if (!v) return ''
      const parts = v.split('/').filter(Boolean)
      if (parts.length === 0) return ''
      if (normalizeFolderDedupeKey(parts[0]) === normalizeFolderDedupeKey(ASSISTENCIA_TECNICA_ROOT)) {
        return parts.slice(1).join('/')
      }
      return v
    }
    const parentPathFromNode = (node) => {
      const direct = stripAssistenciaPrefix(node?.parentPath || '')
      if (direct) return normalizeTaxonomyPath(direct).replace(/\\/g, '/')
      const fullPath = stripAssistenciaPrefix(node?.path || '')
      if (!fullPath) return ''
      const idx = fullPath.lastIndexOf('/')
      const parent = idx >= 0 ? fullPath.slice(0, idx) : ''
      return normalizeTaxonomyPath(parent).replace(/\\/g, '/')
    }
    return taxonomyNodes
      .filter((n) => normalizeFolderDedupeKey(parentPathFromNode(n)) === normalizeFolderDedupeKey(relNorm))
      .map((n) => ({
        name: normalizeTaxonomyPath(String(n.slug || n.code || n.id || '')),
        displayName: normalizeTaxonomyPath(String(n.name || n.slug || '')),
      }))
      .filter((n) => n.name)
  }, [currentPath, taxonomyNodes, atHidesTaxonomyVirtualFolders])
  const files = useMemo(
    () => items.filter((i) => isFile(i) && i.name !== FOLDER_MARKER),
    [items]
  )
  const normalizedSearch = searchTerm.trim().toLowerCase()
  const visibleFolders = useMemo(() => {
    const map = new Map()
    for (const f of folders) {
      const key = normalizeFolderDedupeKey(f.name)
      if (!key) continue
      if (!map.has(key)) map.set(key, { physical: f, virtual: null })
    }
    if (taxonomyChildFolders.length === 0) {
      return Array.from(map.values()).map(({ physical }) => physical).filter(Boolean)
    }
    for (const node of taxonomyChildFolders) {
      const key = normalizeFolderDedupeKey(node.name)
      if (!key) continue
      const cur = map.get(key) || { physical: null, virtual: null }
      cur.virtual = node
      map.set(key, cur)
    }
    return Array.from(map.values()).map(({ physical, virtual }) => {
      if (physical) return physical
      return { name: virtual.name, metadata: {} }
    })
  }, [folders, taxonomyChildFolders])
  const filteredFolders = useMemo(() => (
    visibleFolders.filter((i) => i.name.toLowerCase().includes(normalizedSearch))
  ), [visibleFolders, normalizedSearch])
  const enrichedFiles = useMemo(() => (
    files
      .map((f) => {
        const mimetype = f.metadata?.mimetype || ''
        const fullPath = currentPath ? `${currentPath}/${f.name}` : f.name
        const serverVers = Array.isArray(f.serverVersions) ? f.serverVersions : []
        const history = useCpanelDocs
          ? [...serverVers]
            .map((v) => ({
              at: v.archivedAt,
              by: v.archivedBy,
              metadata: { title: `v${v.version}` },
              archivePath: v.path,
            }))
            .sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')))
          : (versionHistory[fullPath] || [])
        const docType = f.metadata?.documentType || ''
        const versionCount = useCpanelDocs
          ? Math.max(1, Number(f.currentVersion) || 1)
          : Math.max(1, history.length || 1)
        return {
          ...f,
          fullPath,
          fileType: detectFileType(f.name, mimetype),
          sizeLabel: formatBytes(f.metadata?.size),
          dateLabel: formatDate(f.updated_at || f.created_at || f.last_accessed_at, locale),
          history,
          versionCount,
          documentType: docType,
        }
      })
      .filter((f) => f.name.toLowerCase().includes(normalizedSearch))
      .filter((f) => typeFilter === 'all' || f.fileType === typeFilter)
  ), [files, currentPath, versionHistory, normalizedSearch, typeFilter, locale])

  const sortedEnrichedFiles = useMemo(() => {
    const arr = [...enrichedFiles]
    const mult = fileSort.dir === 'asc' ? 1 : -1
    const { key } = fileSort
    arr.sort((a, b) => {
      if (key === 'name') return mult * a.name.localeCompare(b.name, 'pt', { sensitivity: 'base' })
      if (key === 'size') return mult * ((a.metadata?.size || 0) - (b.metadata?.size || 0))
      if (key === 'type') return mult * String(a.fileType || '').localeCompare(String(b.fileType || ''))
      const da = Date.parse(a.updated_at || a.created_at || '') || 0
      const db = Date.parse(b.updated_at || b.created_at || '') || 0
      return mult * (da - db)
    })
    return arr
  }, [enrichedFiles, fileSort])

  useEffect(() => {
    setSelectedForDelete([])
  }, [currentPath])

  const folderDisplayName = useMemo(() => {
    const taxMap = new Map()
    for (const n of taxonomyChildFolders) {
      const k = normalizeFolderDedupeKey(String(n.name || ''))
      if (k) taxMap.set(k, n.displayName || n.name)
    }
    return (slug) => {
      const keyDedupe = normalizeFolderDedupeKey(String(slug || ''))
      if (keyDedupe && taxMap.has(keyDedupe)) return taxMap.get(keyDedupe)
      const key = normalizeTaxonomyPath(String(slug || ''))
      return rootLabelMap[key] || rootLabelMap[slug] || slug
    }
  }, [taxonomyChildFolders, rootLabelMap])

  const resolvedTaxonomyNodeId = useMemo(() => {
    if (!taxonomyNodes.length) return ''
    const target = normalizeTaxonomyPath(currentPath).replace(/\\/g, '/').trim()
    const targetKey = normalizeFolderDedupeKey(target)
    for (const n of taxonomyNodes) {
      const p = normalizeTaxonomyPath(n.path || '').replace(/\\/g, '/').trim()
      if (p && normalizeFolderDedupeKey(p) === targetKey) return String(n.id || '')
    }
    return ''
  }, [currentPath, taxonomyNodes])

  /** Fase B: pastas Assistência Técnica ≥3 segmentos (ex.: AT/Categoria/Subcategoria). */
  const insideTaxonomyUploadZone = useMemo(() => {
    const rel = relativePathUnderAssistenciaRoot(currentPath)
    if (rel === null || rel === '') return false
    const parts = rel.split('/').filter(Boolean)
    return parts.length >= 2
  }, [currentPath])

  useEffect(() => {
    if (!useCpanelDocs || !accessToken) return undefined
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        setCommandPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [useCpanelDocs, accessToken])

  const navigateToFolder = (name) => {
    const next = joinStoragePath(currentPath, name)
    if (next) setCurrentPath(next)
  }

  const breadcrumbParts = currentPath ? currentPath.split('/').filter(Boolean) : []

  const goBreadcrumb = (index) => {
    if (index < 0) {
      setCurrentPath('')
      return
    }
    setCurrentPath(breadcrumbParts.slice(0, index + 1).join('/'))
  }

  const uploadStatusLabel = (status) => {
    switch (status) {
      case 'uploading':
        return t('auth.portalUploadStatusUploading')
      case 'retrying':
        return t('auth.portalUploadStatusRetrying')
      case 'done':
        return t('auth.portalUploadStatusDone')
      case 'error':
        return t('auth.portalUploadStatusError')
      default:
        return t('auth.portalUploadStatusPending')
    }
  }

  const handleDownload = async (fileName) => {
    if (!supabase) return
    const safe = sanitizeSegment(fileName)
    if (!safe) return
    const fullPath = currentPath ? `${currentPath}/${safe}` : safe
    if (useCpanelDocs) {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      if (!token) return
      try {
        const blob = await cpanelDownloadBlob(token, fullPath)
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = safe
        a.rel = 'noopener'
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
        writeAuditLog({ action: 'download', target: fullPath })
      } catch {
        /* feedback opcional */
      }
      return
    }
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(fullPath, 120)
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank')
      writeAuditLog({ action: 'download', target: fullPath })
    }
  }

  const closePreview = () => {
    setPreview((p) => {
      if (p.blobUrl) {
        try {
          URL.revokeObjectURL(p.blobUrl)
        } catch {
          /* ignore */
        }
      }
      return { open: false, title: '', blobUrl: null, fileType: '' }
    })
  }

  const handlePreview = async (fileName) => {
    if (!useCpanelDocs || !supabase) return
    const safe = sanitizeSegment(fileName)
    if (!safe) return
    const fullPath = currentPath ? `${currentPath}/${safe}` : safe
    const ft = detectFileType(safe, '')
    if (ft !== 'pdf' && ft !== 'image') {
      setUploadFeedback({ type: 'error', msg: t('auth.portalPreviewUnsupported') })
      setTimeout(() => setUploadFeedback(null), 4000)
      return
    }
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token
    if (!token) return
    try {
      let blob = await cpanelDownloadBlob(token, fullPath, { inline: true })
      if (ft === 'pdf' && (!blob.type || blob.type === 'application/octet-stream')) {
        blob = new Blob([await blob.arrayBuffer()], { type: 'application/pdf' })
      }
      const url = URL.createObjectURL(blob)
      setPreview((prev) => {
        if (prev.blobUrl) {
          try {
            URL.revokeObjectURL(prev.blobUrl)
          } catch {
            /* ignore */
          }
        }
        return { open: true, title: safe, blobUrl: url, fileType: ft }
      })
      writeAuditLog({ action: 'preview', target: fullPath })
    } catch (err) {
      setUploadFeedback({ type: 'error', msg: err instanceof Error ? err.message : String(err) })
      setTimeout(() => setUploadFeedback(null), 4000)
    }
  }

  const ingestFiles = useCallback((fileList) => {
    const arr = Array.from(fileList || []).filter((f) => f && f.size >= 0)
    if (arr.length === 0) return
    setSelectedFiles((prev) => {
      const next = [...prev, ...arr]
      const total = next.length
      queueMicrotask(() => {
        if (total > 1) {
          setUploadMeta((m) => ({ ...m, title: '' }))
        } else if (total === 1) {
          setUploadMeta((m) => {
            if (m.title) return m
            const stem = (next[0]?.name || '').replace(/\.[^.]+$/, '')
            return { ...m, title: stem }
          })
        }
      })
      return next
    })
  }, [])

  const removeSelectedFile = useCallback((index) => {
    setSelectedFiles((prev) => {
      const next = prev.filter((_, i) => i !== index)
      const total = next.length
      queueMicrotask(() => {
        if (total === 0) {
          setUploadStatuses([])
          setUploadMeta({ title: '', tags: '', note: '' })
          setUploadDocumentType('')
          if (fileInputRef.current) fileInputRef.current.value = ''
          if (cameraInputRef.current) cameraInputRef.current.value = ''
        } else if (total > 1) {
          setUploadMeta((m) => ({ ...m, title: '' }))
        } else {
          setUploadMeta((m) => {
            if (m.title) return m
            return { ...m, title: (next[0]?.name || '').replace(/\.[^.]+$/, '') }
          })
        }
      })
      return next
    })
  }, [])

  const handleFileSelect = (e) => {
    ingestFiles(e.target.files)
  }

  const handleDragEnter = useCallback((e) => {
    if (uploading || !e.dataTransfer?.types?.includes?.('Files')) return
    e.preventDefault()
    dragDepthRef.current += 1
    setDragActive(true)
  }, [uploading])

  const handleDragOver = useCallback((e) => {
    if (uploading) return
    if (!e.dataTransfer?.types?.includes?.('Files')) return
    e.preventDefault()
    try { e.dataTransfer.dropEffect = 'copy' } catch { /* noop */ }
  }, [uploading])

  const handleDragLeave = useCallback((e) => {
    if (uploading) return
    e.preventDefault()
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
    if (dragDepthRef.current === 0) setDragActive(false)
  }, [uploading])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    dragDepthRef.current = 0
    setDragActive(false)
    if (uploading) return
    const files = e.dataTransfer?.files
    if (files && files.length > 0) ingestFiles(files)
  }, [uploading, ingestFiles])

  const clearUploadDraft = () => {
    setSelectedFiles([])
    setUploadStatuses([])
    setUploadMeta({ title: '', tags: '', note: '' })
    setUploadDocumentType('')
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  const handleUpload = async () => {
    if (!selectedFiles.length || !supabase) return
    if (useCpanelDocs && insideTaxonomyUploadZone && !uploadDocumentType) {
      setUploadFeedback({ type: 'error', msg: t('auth.portalDocumentTypeRequired') })
      return
    }
    setUploading(true)
    setUploadFeedback(null)
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token
    if (useCpanelDocs && !token) {
      setUploadFeedback({ type: 'error', msg: t('auth.supabaseNotConfigured') })
      setUploading(false)
      return
    }
    let uploaded = 0
    const draftStatuses = selectedFiles.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      name: file.name,
      progress: 0,
      status: 'pending',
      tries: 0,
    }))
    setUploadStatuses(draftStatuses)

    const updateStatus = (idx, patch) => {
      setUploadStatuses((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)))
    }

    for (let index = 0; index < selectedFiles.length; index += 1) {
      const originalFile = selectedFiles[index]
      const file = await compressImageIfNeeded(originalFile)
      const safeName = sanitizeSegment(file.name)
      if (!safeName) continue
      const base = currentPath ? `${currentPath}/` : ''
      const uploadPath = `${base}${safeName}`
      updateStatus(index, { status: 'uploading', progress: 0, tries: 1 })

      let success = false
      let lastError = null
      const maxAttempts = 3
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        updateStatus(index, { status: attempt > 1 ? 'retrying' : 'uploading', tries: attempt })
        try {
          if (useCpanelDocs) {
            const extra = {}
            if (insideTaxonomyUploadZone) {
              extra.documentType = uploadDocumentType
              if (resolvedTaxonomyNodeId) extra.taxonomyNodeId = resolvedTaxonomyNodeId
            }
            const vl =
              selectedFiles.length === 1 && uploadMeta.title.trim() !== ''
                ? uploadMeta.title.trim()
                : (originalFile.name || '').replace(/\.[^.]+$/, '').trim() || originalFile.name
            if (vl) extra.versionLabel = vl
            const noteParts = [uploadMeta.note, uploadMeta.tags].filter(Boolean)
            if (noteParts.length) extra.notes = noteParts.join(' · ')
            await cpanelUploadWithProgress(token, currentPath, file, (pct) => updateStatus(index, { progress: pct }), extra)
          } else {
            const { error: err } = await supabase.storage.from(BUCKET).upload(uploadPath, file, {
              upsert: isAdmin,
              contentType: file.type || undefined,
            })
            if (err) throw err
            updateStatus(index, { progress: 100 })
          }
          success = true
          break
        } catch (err) {
          lastError = err
          const message = err instanceof Error ? err.message : String(err)
          const status = Number(err?.status || 0)
          const retryable = message === 'network_error' || status >= 500 || status === 0 || /timeout|network/i.test(message)
          if (!retryable || attempt === maxAttempts) break
          await sleep(600 * attempt)
        }
      }
      if (!success) {
        updateStatus(index, { status: 'error', error: lastError instanceof Error ? lastError.message : String(lastError) })
        setUploadFeedback({ type: 'error', msg: lastError instanceof Error ? lastError.message : String(lastError) })
        setUploading(false)
        return
      }

      updateStatus(index, { status: 'done', progress: 100 })
      uploaded += 1
      if (!useCpanelDocs) {
        writeVersionHistory((prev) => {
          const current = prev[uploadPath] || []
          return {
            ...prev,
            [uploadPath]: [
              ...current,
              {
                at: new Date().toISOString(),
                by: user?.email || 'unknown',
                metadata: { ...uploadMeta, size: file.size, type: file.type || 'application/octet-stream' },
              },
            ],
          }
        })
        writeAuditLog({
          action: 'upload',
          target: uploadPath,
          metadata: {
            ...uploadMeta,
            originalSize: originalFile.size,
            uploadedSize: file.size,
            compressed: file.size < originalFile.size,
          },
        })
      }
    }
    setUploading(false)
    clearUploadDraft()
    if (uploaded === 0) {
      setUploadFeedback({ type: 'error', msg: t('auth.uploadInvalidName') })
      return
    }
    setUploadFeedback({ type: 'success', msg: t('auth.uploadSuccessCount', { count: uploaded }) })
    loadItems(currentPath)
    setTimeout(() => setUploadFeedback(null), 4000)
  }

  const handleCreateFolder = async () => {
    if (!supabase) return
    const name = sanitizeSegment(newFolderName)
    if (!name) {
      setUploadFeedback({ type: 'error', msg: t('auth.portalFolderNameInvalid') })
      return
    }
    const base = joinStoragePath(currentPath, name)
    if (!base) return
    const markerPath = `${base}/${FOLDER_MARKER}`
    setUploading(true)
    setUploadFeedback(null)
    if (useCpanelDocs) {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      if (!token) {
        setUploading(false)
        setUploadFeedback({ type: 'error', msg: t('auth.supabaseNotConfigured') })
        return
      }
      try {
        await cpanelEnsureMarker(token, markerPath)
      } catch (err) {
        setUploading(false)
        setUploadFeedback({ type: 'error', msg: err instanceof Error ? err.message : String(err) })
        return
      }
      setUploading(false)
      setNewFolderName('')
      setShowNewFolder(false)
      setUploadFeedback({ type: 'success', msg: t('auth.portalFolderCreated') })
      loadItems(currentPath)
      setTimeout(() => setUploadFeedback(null), 3000)
      return
    }
    const { error: err } = await supabase.storage.from(BUCKET).upload(markerPath, new Uint8Array([32]), {
      upsert: false,
      contentType: 'application/octet-stream',
    })
    setUploading(false)
    if (err) {
      setUploadFeedback({ type: 'error', msg: err.message })
      return
    }
    setNewFolderName('')
    setShowNewFolder(false)
    writeAuditLog({ action: 'create_folder', target: base })
    setUploadFeedback({ type: 'success', msg: t('auth.portalFolderCreated') })
    loadItems(currentPath)
    setTimeout(() => setUploadFeedback(null), 3000)
  }

  const handleDeleteFile = async (fileName) => {
    if (!supabase || !isAdmin) return
    const safe = sanitizeSegment(fileName)
    if (!safe) return
    const fullPath = currentPath ? `${currentPath}/${safe}` : safe
    if (!window.confirm(t('auth.portalDeleteConfirm', { name: safe }))) return
    setUploading(true)
    try {
      if (useCpanelDocs) {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData?.session?.access_token
        if (!token) throw new Error(t('auth.supabaseNotConfigured'))
        await cpanelDeleteFile(token, fullPath)
      } else {
        const { error: err } = await supabase.storage.from(BUCKET).remove([fullPath])
        if (err) throw err
      }
      setUploadFeedback({ type: 'success', msg: t('auth.portalDeleted') })
      if (!useCpanelDocs) writeAuditLog({ action: 'delete_file', target: fullPath })
      loadItems(currentPath)
    } catch (err) {
      setUploadFeedback({ type: 'error', msg: err?.message || String(err) })
    } finally {
      setUploading(false)
      setTimeout(() => setUploadFeedback(null), 4000)
    }
  }

  const handleDeleteFolder = async (folderName) => {
    if (!supabase || !isAdmin) return
    const base = joinStoragePath(currentPath, folderName)
    if (!base) return
    if (!window.confirm(t('auth.portalDeleteFolderConfirm', { name: folderDisplayName(folderName) }))) return
    setUploading(true)
    setUploadFeedback(null)
    try {
      if (useCpanelDocs) {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData?.session?.access_token
        if (!token) throw new Error(t('auth.supabaseNotConfigured'))
        await cpanelDeleteTree(token, base)
      } else {
        const paths = await listAllObjectPaths(supabase, base)
        const marker = `${base}/${FOLDER_MARKER}`
        const unique = new Set(paths)
        if (!unique.has(marker)) unique.add(marker)
        await removePathsInChunks(supabase, [...unique])
      }
      setUploadFeedback({ type: 'success', msg: t('auth.portalDeleted') })
      if (!useCpanelDocs) writeAuditLog({ action: 'delete_folder', target: base })
      loadItems(currentPath)
    } catch (err) {
      setUploadFeedback({ type: 'error', msg: err?.message || String(err) })
    } finally {
      setUploading(false)
      setTimeout(() => setUploadFeedback(null), 4000)
    }
  }

  const handleBatchDelete = async () => {
    if (!supabase || !isAdmin || !useCpanelDocs || isInsidePullMount) return
    const paths = [...selectedForDelete]
    if (!paths.length) return
    if (!window.confirm(t('auth.portalBatchDeleteConfirm', { count: paths.length }))) return
    setUploading(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      if (!token) throw new Error(t('auth.supabaseNotConfigured'))
      for (const fullPath of paths) {
        await cpanelDeleteFile(token, fullPath)
      }
      setSelectedForDelete([])
      setUploadFeedback({ type: 'success', msg: t('auth.portalBatchDeleteOk', { count: paths.length }) })
      loadItems(currentPath)
    } catch (err) {
      setUploadFeedback({ type: 'error', msg: err?.message || String(err) })
    } finally {
      setUploading(false)
      setTimeout(() => setUploadFeedback(null), 4000)
    }
  }

  const handleSaveMetadata = async () => {
    if (!metaModal || !supabase || !useCpanelDocs) return
    setMetaSaving(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      if (!token) throw new Error(t('auth.supabaseNotConfigured'))
      await cpanelSetMetadata(token, metaModal.fullPath, {
        documentType: metaModal.documentType,
        versionLabel: metaModal.versionLabel,
        notes: metaModal.notes,
      })
      setMetaModal(null)
      setUploadFeedback({ type: 'success', msg: t('auth.portalMetadataSaved') })
      loadItems(currentPath)
    } catch (err) {
      setUploadFeedback({ type: 'error', msg: err?.message || String(err) })
    } finally {
      setMetaSaving(false)
      setTimeout(() => setUploadFeedback(null), 4000)
    }
  }

  const refreshServerAudit = useCallback(async () => {
    if (!useCpanelDocs || !isAdmin || !accessToken) return
    try {
      const rows = await cpanelAuditLog(accessToken, { limit: 250 })
      setAuditLog(
        rows.map((r) => ({
          at: r.timestamp,
          user: r.userEmail,
          action: r.action,
          target: r.path,
        })),
      )
    } catch {
      /* noop */
    }
  }, [useCpanelDocs, isAdmin, accessToken])

  return (
    <div className="area-reservada-page area-reservada-page--portal">
      <section className="section section--portal">
        <div className="container container--portal-wide">
          <div className="doc-portal">
            <div className="doc-portal__shell">
              <div className="doc-portal__shell-top">
                <div className="doc-portal__brand">
                  <p className="doc-portal__eyebrow">{t('auth.portalEyebrow')}</p>
                  <h1 className="doc-portal__title">{t('auth.areaTitle')}</h1>
                </div>
                <MenuDropdown
                  align="right"
                  label={user?.email ?? ''}
                  trigger={
                    <span className="doc-portal__user-chip">
                      <span className="doc-portal__user-avatar" aria-hidden>
                        {(user?.email || '?').slice(0, 1).toUpperCase()}
                      </span>
                      <span className="doc-portal__user-email">{user?.email ?? ''}</span>
                      <span className="doc-portal__user-caret" aria-hidden><IconChevronDown size={12} /></span>
                    </span>
                  }
                >
                  {isAdmin && (
                    <Link to="/admin" className="doc-menu__item" role="menuitem">
                      {t('auth.adminPanel')}
                    </Link>
                  )}
                  <button type="button" className="doc-menu__item" role="menuitem" onClick={() => void signOut()}>
                    {t('auth.signOut')}
                  </button>
                </MenuDropdown>
              </div>
              <div className="doc-portal__shell-crumb-row">
                <nav className="doc-portal__breadcrumb" aria-label={t('auth.portalBreadcrumbLabel')}>
                  <button type="button" className="doc-portal__crumb doc-portal__crumb--link" onClick={() => goBreadcrumb(-1)}>
                    {t('auth.portalBreadcrumbRoot')}
                  </button>
                  {breadcrumbParts.map((part, i) => (
                    <span key={part + i} className="doc-portal__crumb-wrap">
                      <span className="doc-portal__crumb-sep" aria-hidden>/</span>
                      <button type="button" className="doc-portal__crumb doc-portal__crumb--link" onClick={() => goBreadcrumb(i)}>
                        {rootLabelMap[part] || part}
                      </button>
                    </span>
                  ))}
                </nav>
                {useCpanelDocs && resolvedTaxonomyNodeId && relativePathUnderAssistenciaRoot(currentPath) != null ? (
                  <a
                    href={atManutEquipamentosUrl(resolvedTaxonomyNodeId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="doc-portal__link-external doc-portal__link-external--crumb"
                  >
                    {t('auth.portalOpenAtManut')}
                  </a>
                ) : null}
              </div>
              <div className="doc-portal__command-bar">
                <div className="doc-portal__command-bar-start">
                  {currentPath ? (
                    <button type="button" className="doc-portal__back-link" onClick={() => goBreadcrumb(breadcrumbParts.length - 2)}>
                      <span className="doc-portal__back-link-icon" aria-hidden><IconArrowLeft size={16} /></span> {t('auth.back')}
                    </button>
                  ) : (
                    <span className="doc-portal__command-spacer" aria-hidden />
                  )}
                </div>
                <div className="doc-portal__command-bar-mid">
                  {useCpanelDocs && accessToken && (
                    <button
                      type="button"
                      className="btn btn--outline btn--sm doc-portal__cmd-trigger"
                      onClick={() => setCommandPaletteOpen(true)}
                      title={t('auth.portalCommandSearchHint')}
                    >
                      {t('auth.portalCommandSearchTitle')} <kbd className="doc-portal__kbd">Ctrl+K</kbd>
                    </button>
                  )}
                  <div className="doc-portal__search">
                    <span className="doc-portal__search-icon" aria-hidden><IconSearch size={16} /></span>
                    <input
                      type="search"
                      className="doc-portal__search-input"
                      placeholder={t('auth.portalSearchPlaceholder')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="doc-portal__command-bar-end">
                  <select
                    className="doc-portal__select"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                  >
                    <option value="all">{t('auth.portalFilterAll')}</option>
                    <option value="pdf">{t('auth.portalFilterPdf')}</option>
                    <option value="image">{t('auth.portalFilterImage')}</option>
                    <option value="document">{t('auth.portalFilterDocument')}</option>
                    <option value="other">{t('auth.portalFilterOther')}</option>
                  </select>
                  {useCpanelDocs && (
                    <>
                      <select
                        className="doc-portal__select"
                        aria-label={t('auth.portalSortLabel')}
                        value={fileSort.key}
                        onChange={(e) => setFileSort((s) => ({ ...s, key: e.target.value }))}
                      >
                        <option value="date">{t('auth.portalSortDate')}</option>
                        <option value="name">{t('auth.portalSortName')}</option>
                        <option value="size">{t('auth.portalSortSize')}</option>
                        <option value="type">{t('auth.portalSortType')}</option>
                      </select>
                      <select
                        className="doc-portal__select"
                        aria-label={t('auth.portalSortDirLabel')}
                        value={fileSort.dir}
                        onChange={(e) => setFileSort((s) => ({ ...s, dir: e.target.value }))}
                      >
                        <option value="desc">{t('auth.portalSortDesc')}</option>
                        <option value="asc">{t('auth.portalSortAsc')}</option>
                      </select>
                    </>
                  )}
                  <MenuDropdown
                    align="right"
                    label={t('auth.portalNewMenuLabel')}
                    trigger={
                      <span className="doc-portal__new-btn">
                        <span aria-hidden><IconAdd size={14} /></span> {t('auth.portalNewMenu')}
                        <span className="doc-portal__user-caret" aria-hidden><IconChevronDown size={12} /></span>
                      </span>
                    }
                  >
                    <button type="button" className="doc-menu__item" role="menuitem" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                      <span className="doc-menu__icon" aria-hidden><IconArrowUpload size={18} /></span> {t('auth.portalUploadSelect')}
                    </button>
                    <button type="button" className="doc-menu__item" role="menuitem" onClick={() => cameraInputRef.current?.click()} disabled={uploading}>
                      <span className="doc-menu__icon" aria-hidden><IconCamera size={18} /></span> {t('auth.portalCapturePhoto')}
                    </button>
                    <button type="button" className="doc-menu__item" role="menuitem" onClick={() => setShowNewFolder(true)} disabled={uploading}>
                      <span className="doc-menu__icon" aria-hidden><IconFolder size={18} /></span> {t('auth.portalNewFolder')}
                    </button>
                  </MenuDropdown>
                </div>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              disabled={uploading}
              hidden
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              disabled={uploading}
              hidden
            />

            {showNewFolder && (
              <div className="doc-portal__inline-form">
                <input
                  type="text"
                  className="doc-portal__input"
                  placeholder={t('auth.portalFolderNamePlaceholder')}
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  disabled={uploading}
                  autoFocus
                />
                <button type="button" className="btn btn--primary btn--sm" onClick={() => void handleCreateFolder()} disabled={uploading}>
                  {t('auth.portalCreateFolder')}
                </button>
                <button type="button" className="btn btn--outline btn--sm doc-portal__btn-on-light" onClick={() => { setShowNewFolder(false); setNewFolderName('') }} disabled={uploading}>
                  {t('auth.portalCancel')}
                </button>
              </div>
            )}

            {selectedFiles.length > 0 && (
              <div className="doc-portal__upload-metadata">
                <p className="doc-portal__upload-meta-title">{t('auth.portalUploadMetadataTitle')}</p>
                <p className="doc-portal__upload-meta-inline">
                  {t('auth.portalUploadSelectedCount', { count: selectedFiles.length })}
                </p>
                <p className="doc-portal__upload-queue-heading">
                  {t(selectedFiles.length === 1 ? 'auth.portalUploadQueueOne' : 'auth.portalUploadQueueHeading')}
                </p>
                <ul className="doc-portal__upload-queue" role="list">
                  {selectedFiles.map((file, idx) => (
                    <li
                      key={`${file.name}-${file.size}-${file.lastModified}`}
                      className="doc-portal__upload-queue-item"
                    >
                      <span className="doc-portal__upload-queue-name" title={file.name}>
                        {file.name}
                      </span>
                      <span className="doc-portal__upload-queue-size">{formatBytes(file.size)}</span>
                      <button
                        type="button"
                        className="doc-portal__upload-queue-remove"
                        onClick={() => removeSelectedFile(idx)}
                        disabled={uploading}
                        aria-label={t('auth.portalUploadRemoveFile')}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
                {selectedFiles.length > 1 ? (
                  <p className="doc-portal__upload-batch-hint">{t('auth.portalUploadBatchHint')}</p>
                ) : null}
                {useCpanelDocs && insideTaxonomyUploadZone && (
                  <div className="doc-portal__upload-taxonomy-hint">
                    <label className="doc-portal__upload-doctype-label" htmlFor="upload-document-type">
                      {t('auth.portalDocumentTypeLabel')}
                    </label>
                    <select
                      id="upload-document-type"
                      className="doc-portal__select doc-portal__select--block"
                      value={uploadDocumentType}
                      onChange={(e) => setUploadDocumentType(e.target.value)}
                      disabled={uploading}
                      required
                    >
                      <option value="">{t('auth.portalDocumentTypePlaceholder')}</option>
                      {DOCUMENT_TYPES.map((dt) => (
                        <option key={dt} value={dt}>
                          {t(`auth.documentType.${dt}`)}
                        </option>
                      ))}
                    </select>
                    {resolvedTaxonomyNodeId ? (
                      <span className="doc-portal__taxonomy-id-hint" title="taxonomyNodeId">
                        ID: {resolvedTaxonomyNodeId}
                      </span>
                    ) : null}
                  </div>
                )}
                <div className="doc-portal__inline-form doc-portal__upload-form">
                  {selectedFiles.length === 1 ? (
                    <input
                      type="text"
                      className="doc-portal__input"
                      placeholder={t('auth.portalUploadMetaTitlePlaceholder')}
                      value={uploadMeta.title}
                      onChange={(e) => setUploadMeta((prev) => ({ ...prev, title: e.target.value }))}
                      disabled={uploading}
                    />
                  ) : null}
                  <input
                    type="text"
                    className="doc-portal__input"
                    placeholder={t('auth.portalUploadMetaTagsPlaceholder')}
                    value={uploadMeta.tags}
                    onChange={(e) => setUploadMeta((prev) => ({ ...prev, tags: e.target.value }))}
                    disabled={uploading}
                  />
                  <input
                    type="text"
                    className="doc-portal__input"
                    placeholder={t('auth.portalUploadMetaNotePlaceholder')}
                    value={uploadMeta.note}
                    onChange={(e) => setUploadMeta((prev) => ({ ...prev, note: e.target.value }))}
                    disabled={uploading}
                  />
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    onClick={() => void handleUpload()}
                    disabled={uploading || (useCpanelDocs && insideTaxonomyUploadZone && !uploadDocumentType)}
                  >
                    {uploading ? t('auth.loading') : t('auth.portalUpload')}
                  </button>
                  <button type="button" className="btn btn--outline btn--sm doc-portal__btn-on-light" onClick={clearUploadDraft} disabled={uploading}>
                    {t('auth.portalCancel')}
                  </button>
                </div>
                {uploadStatuses.length > 0 && (
                  <ul className="doc-portal__upload-status-list" aria-live="polite">
                    {uploadStatuses.map((row) => (
                      <li key={row.id} className="doc-portal__upload-status-item">
                        <span className="doc-portal__upload-status-name">{row.name}</span>
                        <span className="doc-portal__upload-status-label">
                          {uploadStatusLabel(row.status)}
                          {row.tries > 1 ? ` (${t('auth.portalUploadAttempt', { count: row.tries })})` : ''}
                        </span>
                        <progress max="100" value={row.progress || 0} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {uploadFeedback && (
              <p className={uploadFeedback.type === 'success' ? 'doc-portal__banner doc-portal__banner--ok' : 'doc-portal__banner doc-portal__banner--err'} role="status">
                {uploadFeedback.msg}
              </p>
            )}

            <div
              className={`doc-portal__panels${dragActive ? ' doc-portal__panels--drag' : ''}`}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {dragActive && (
                <div className="doc-portal__drop-overlay" aria-hidden>
                  <div className="doc-portal__drop-overlay-inner">
                    <span className="doc-portal__drop-overlay-icon" aria-hidden><IconArrowDownload size={40} /></span>
                    <strong>{t('auth.portalDropzoneTitle')}</strong>
                    <span className="doc-portal__drop-overlay-sub">
                      {t('auth.portalDropzoneSub', { folder: breadcrumbParts[breadcrumbParts.length - 1] || t('auth.portalRootLabel') })}
                    </span>
                  </div>
                </div>
              )}

              {error && (
                <div className="doc-portal__panel doc-portal__error" role="alert">
                  {error}
                  <p className="doc-portal__error-hint">
                    {useCpanelDocs ? t('auth.documentsCpanelHint') : t('auth.bucketHint')}
                  </p>
                  {bucketMissing && isAdmin && !useCpanelDocs && (
                    <button type="button" className="btn btn--primary btn--sm" onClick={() => void handleCreateBucket()} disabled={uploading}>
                      {uploading ? t('auth.loading') : t('auth.createBucket')}
                    </button>
                  )}
                </div>
              )}

              {loading && (
                <div className="doc-portal__loading" role="status" aria-live="polite">
                  <span className="visually-hidden">{t('auth.loading')}</span>
                  <ul className="doc-skeleton-grid" aria-hidden>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <li key={`sk-f-${i}`} className="doc-skeleton-card" />
                    ))}
                  </ul>
                  <ul className="doc-skeleton-list" aria-hidden>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <li key={`sk-r-${i}`} className="doc-skeleton-row" />
                    ))}
                  </ul>
                </div>
              )}

              {!loading && !error && (
                <>
                  {useCpanelDocs && onedriveStatus?.configured && onedriveMountEntries.length > 0 && (
                    <div className="doc-portal__onedrive-mounts">
                      {!onedriveStatus.connected ? (
                        <div className="doc-portal__status-bar doc-portal__status-bar--warn doc-portal__status-bar--compact" role="status" aria-live="polite">
                          <span className="doc-portal__status-icon" aria-hidden><IconCloud size={22} /></span>
                          <div className="doc-portal__status-text">
                            <strong className="doc-portal__status-title">{t('auth.onedriveNotConnected')}</strong>
                            <span className="doc-portal__status-sub">{t('auth.onedriveIntroHint')}</span>
                          </div>
                          <div className="doc-portal__status-actions">
                            {isAdmin && (
                              <button type="button" className="btn btn--primary btn--sm doc-portal__connect-btn" onClick={() => void handleOnedriveConnect()} disabled={onedriveBusy}>
                                {onedriveBusy ? t('auth.loading') : t('auth.onedriveConnect')}
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="doc-portal__onedrive-account" title={onedriveStatus.userPrincipalName || onedriveStatus.displayName || ''}>
                            {t('auth.onedriveConnectedBadge', { user: onedriveStatus.userPrincipalName || onedriveStatus.displayName || '' })}
                          </p>
                          <div className="doc-portal__sync-strip" role="list">
                            {onedriveMountEntries.map(({ id, status: ms }) => {
                              const directionLabel =
                                ms.direction === 'pull'
                                  ? t('auth.onedrivePanelTitlePull')
                                  : ms.direction === 'push'
                                    ? t('auth.onedrivePanelTitlePush')
                                    : t('auth.onedrivePanelTitleBidi')
                              const mountLabel = id === 'comercial' ? t('auth.portalFolderComercial') : t('auth.portalFolderAssistencia')
                              const syncLine = ms.lastSyncAt
                                ? t('auth.onedriveLastSync', { at: formatDate(new Date(ms.lastSyncAt * 1000).toISOString(), locale) })
                                : t('auth.onedriveNeverSynced')
                              const summaryTitle = `${mountLabel} · ${directionLabel}`
                              return (
                                <div key={id} className="doc-portal__sync-tile" role="listitem">
                                  <div className="doc-portal__sync-tile-main" title={`${summaryTitle}\n${syncLine}`}>
                                    <span className="doc-portal__sync-tile-icon" aria-hidden>
                                      {ms.direction === 'pull' ? <IconCloudArrowDown size={20} /> : ms.direction === 'push' ? <IconCloudArrowUp size={20} /> : <IconArrowSync size={20} />}
                                    </span>
                                    <div className="doc-portal__sync-tile-text">
                                      <span className="doc-portal__sync-tile-label">{mountLabel}</span>
                                      <span className="doc-portal__sync-tile-sub">{syncLine}</span>
                                    </div>
                                  </div>
                                  {isAdmin ? (
                                    <div className="doc-portal__sync-tile-actions">
                                      <button
                                        type="button"
                                        className="doc-portal__icon-btn doc-portal__icon-btn--sync"
                                        onClick={() => void handleOnedriveSync(id)}
                                        disabled={onedriveBusy}
                                        title={`${t('auth.onedriveSyncNow')} — ${summaryTitle}`}
                                      >
                                        <span className="visually-hidden">
                                          {onedriveBusy ? t('auth.loading') : `${t('auth.onedriveSyncNow')}: ${summaryTitle}`}
                                        </span>
                                        <span aria-hidden><IconArrowSync size={20} /></span>
                                      </button>
                                      <MenuDropdown
                                        align="right"
                                        label={t('auth.onedriveMoreLabel')}
                                        trigger={<span className="doc-portal__icon-btn doc-portal__icon-btn--more" aria-hidden><IconMoreHorizontal size={20} /></span>}
                                      >
                                        <button type="button" className="doc-menu__item" role="menuitem" onClick={() => void handleOnedriveConnect()} disabled={onedriveBusy}>
                                          {t('auth.onedriveReconnect')}
                                        </button>
                                        {ms.direction !== 'push' && (
                                          <button type="button" className="doc-menu__item doc-menu__item--danger" role="menuitem" onClick={() => void handleOnedriveResetLocal(id)} disabled={onedriveBusy}>
                                            {t('auth.onedriveResetLocal')}
                                          </button>
                                        )}
                                      </MenuDropdown>
                                    </div>
                                  ) : null}
                                </div>
                              )
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  {useCpanelDocs && onedriveStatus?.configured && onedriveSyncProgress && (
                    <div className="doc-portal__sync-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(
                      100 -
                        Math.min(
                          100,
                          ((onedriveSyncProgress.filesMissing + onedriveSyncProgress.foldersMissing) /
                            Math.max(1, onedriveSyncProgress.initialTotal)) *
                            100,
                        ),
                    )}
                    >
                      <div className="doc-portal__sync-progress-head">
                        <strong>{t('auth.onedriveSyncProgressTitle')}</strong>
                        <span className="doc-portal__sync-progress-meta">
                          {t('auth.onedriveSyncProgressIteration', { n: onedriveSyncProgress.iteration })}
                        </span>
                      </div>
                      <div className="doc-portal__sync-progress-track">
                        <div
                          className="doc-portal__sync-progress-fill"
                          style={{
                            width: `${Math.min(
                              100,
                              100 -
                                ((onedriveSyncProgress.filesMissing + onedriveSyncProgress.foldersMissing) /
                                  Math.max(1, onedriveSyncProgress.initialTotal)) *
                                  100,
                            )}%`,
                          }}
                        />
                      </div>
                      <p className="doc-portal__sync-progress-detail">
                        {t('auth.onedriveSyncProgressDetail', {
                          filesMissing: onedriveSyncProgress.filesMissing,
                          foldersMissing: onedriveSyncProgress.foldersMissing,
                          localFiles: onedriveSyncProgress.localFiles,
                          down: onedriveSyncProgress.filesDownloadedStep,
                          up: onedriveSyncProgress.filesUploadedStep,
                        })}
                      </p>
                    </div>
                  )}
                  {useCpanelDocs && onedriveStatus?.configured && onedriveFeedback && (
                    <p
                      className={
                        onedriveFeedback.type === 'success'
                          ? 'doc-portal__banner doc-portal__banner--ok'
                          : onedriveFeedback.type === 'info'
                            ? 'doc-portal__banner'
                            : onedriveFeedback.type === 'warning'
                              ? 'doc-portal__banner doc-portal__banner--warn'
                              : 'doc-portal__banner doc-portal__banner--err'
                      }
                      role="status"
                    >
                      {onedriveFeedback.msg}
                    </p>
                  )}

                  {useCpanelDocs && recentDocuments.length > 0 && (
                    <section className="doc-portal__section" aria-labelledby="portal-recent-heading">
                      <h2 id="portal-recent-heading" className="doc-portal__section-title">
                        {t('auth.portalRecentHeading')}
                      </h2>
                      <ul className="doc-portal__recent-list">
                        {recentDocuments.map((row) => (
                          <li key={row.path}>
                            <button
                              type="button"
                              className="doc-portal__recent-link"
                              onClick={() => {
                                const dir = String(row.path || '').split('/').slice(0, -1).join('/')
                                if (dir) setCurrentPath(dir)
                              }}
                            >
                              <span className="doc-portal__recent-name">{row.name || row.path}</span>
                              <span className="doc-portal__recent-sub">{formatDate(row.updatedAt, locale)}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  <section className="doc-portal__section" aria-labelledby="portal-folders-heading">
                    <h2 id="portal-folders-heading" className="doc-portal__section-title">
                      {t('auth.portalFoldersHeading')}
                    </h2>
                    {filteredFolders.length === 0 ? (
                      normalizedSearch ? (
                        <div className="doc-empty" role="status">
                          <span className="doc-empty__icon" aria-hidden><IconSearch size={40} /></span>
                          <h3 className="doc-empty__title">{t('auth.portalNoResults')}</h3>
                          <p className="doc-empty__desc">{t('auth.portalNoResultsDesc', { q: searchTerm })}</p>
                          <button type="button" className="btn btn--outline btn--sm doc-portal__btn-on-light" onClick={() => setSearchTerm('')}>
                            {t('auth.portalClearSearch')}
                          </button>
                        </div>
                      ) : (
                        <div className="doc-empty">
                          <span className="doc-empty__icon" aria-hidden><IconFolder size={40} /></span>
                          <h3 className="doc-empty__title">{t('auth.portalEmptyFoldersTitle')}</h3>
                          <p className="doc-empty__desc">{t('auth.portalEmptyFoldersDesc')}</p>
                          <button type="button" className="btn btn--outline btn--sm doc-portal__btn-on-light" onClick={() => setShowNewFolder(true)} disabled={uploading}>
                            {t('auth.portalNewFolder')}
                          </button>
                        </div>
                      )
                    ) : (
                      <ul className="doc-portal__folder-grid">
                        {filteredFolders.map((folder) => {
                          const isComercialRoot = currentPath === '' && folder.name === COMERCIAL_ROOT
                          const isAtRoot = currentPath === '' && folder.name === ASSISTENCIA_TECNICA_ROOT
                          const isMountRoot = isComercialRoot || isAtRoot
                          const comercialDir = onedriveStatus?.mounts?.comercial?.direction
                          const atDir = onedriveStatus?.mounts?.at?.direction
                          const rootDirection = isComercialRoot ? comercialDir : isAtRoot ? atDir : null
                          const hideDeleteHere = isInsidePullMount || isMountRoot
                          const badge = rootDirection === 'pull'
                            ? t('auth.onedriveBadgePull')
                            : rootDirection === 'push'
                              ? t('auth.onedriveBadgePush')
                              : rootDirection === 'bidirectional'
                                ? t('auth.onedriveBadgeBidi')
                                : ''
                          return (
                            <li key={folder.name} className="doc-folder-card">
                              <button type="button" className="doc-folder-card__main" onClick={() => navigateToFolder(folder.name)} title={t('auth.portalOpenFolder')}>
                                <span className="doc-folder-card__icon" aria-hidden>
                                  {isComercialRoot ? <IconCloud size={28} /> : isAtRoot ? <IconWrenchScrewdriver size={28} /> : <IconFolder size={28} />}
                                </span>
                                <span className="doc-folder-card__title-line">
                                  <span className="doc-folder-card__name">{folderDisplayName(folder.name)}</span>
                                  {badge ? (
                                    <span className="doc-folder-card__badge" aria-hidden>{badge}</span>
                                  ) : null}
                                </span>
                                <span className="doc-folder-card__hint">{t('auth.portalOpenFolder')}</span>
                              </button>
                              {isAdmin && !hideDeleteHere && (
                                <button
                                  type="button"
                                  className="doc-folder-card__delete btn btn--outline btn--sm"
                                  onClick={() => void handleDeleteFolder(folder.name)}
                                  disabled={uploading}
                                >
                                  {t('auth.portalDelete')}
                                </button>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </section>

                  <section className="doc-portal__section" aria-labelledby="portal-files-heading">
                    <div className="doc-portal__section-head">
                      <h2 id="portal-files-heading" className="doc-portal__section-title">
                        {t('auth.portalFilesHeading')}
                      </h2>
                      {useCpanelDocs && isAdmin && !isInsidePullMount && sortedEnrichedFiles.length > 0 && (
                        <div className="doc-portal__batch-bar">
                          <button
                            type="button"
                            className="btn btn--outline btn--sm doc-portal__btn-on-light"
                            onClick={() => {
                              const all = sortedEnrichedFiles.map((x) => x.fullPath)
                              setSelectedForDelete((prev) => (prev.length === all.length ? [] : all))
                            }}
                          >
                            {t('auth.portalSelectToggleAll')}
                          </button>
                          {selectedForDelete.length > 0 && (
                            <button
                              type="button"
                              className="btn btn--outline btn--sm doc-file-row__danger"
                              onClick={() => void handleBatchDelete()}
                              disabled={uploading}
                            >
                              {t('auth.portalBatchDelete', { count: selectedForDelete.length })}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    {sortedEnrichedFiles.length === 0 ? (
                      (normalizedSearch || typeFilter !== 'all') ? (
                        <div className="doc-empty" role="status">
                          <span className="doc-empty__icon" aria-hidden><IconSearch size={40} /></span>
                          <h3 className="doc-empty__title">{t('auth.portalNoResults')}</h3>
                          <p className="doc-empty__desc">{t('auth.portalNoResultsFilesDesc')}</p>
                          <div className="doc-empty__actions">
                            {normalizedSearch && (
                              <button type="button" className="btn btn--outline btn--sm doc-portal__btn-on-light" onClick={() => setSearchTerm('')}>
                                {t('auth.portalClearSearch')}
                              </button>
                            )}
                            {typeFilter !== 'all' && (
                              <button type="button" className="btn btn--outline btn--sm doc-portal__btn-on-light" onClick={() => setTypeFilter('all')}>
                                {t('auth.portalClearFilter')}
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="doc-empty">
                          <span className="doc-empty__icon" aria-hidden><IconFolderOpen size={40} /></span>
                          <h3 className="doc-empty__title">{t('auth.portalEmptyFilesTitle')}</h3>
                          <p className="doc-empty__desc">{t('auth.portalEmptyFilesDesc')}</p>
                          <div className="doc-empty__actions">
                            <button type="button" className="btn btn--primary btn--sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                              <span className="doc-portal__btn-fluent-icon" aria-hidden><IconArrowUpload size={18} /></span> {t('auth.portalUploadSelect')}
                            </button>
                            <button type="button" className="btn btn--outline btn--sm doc-portal__btn-on-light" onClick={() => cameraInputRef.current?.click()} disabled={uploading}>
                              <span className="doc-portal__btn-fluent-icon" aria-hidden><IconCamera size={18} /></span> {t('auth.portalCapturePhoto')}
                            </button>
                          </div>
                        </div>
                      )
                    ) : (
                      <ul className="doc-portal__file-list">
                        {sortedEnrichedFiles.map((f) => (
                          <li key={f.fullPath} className="doc-file-row">
                            {useCpanelDocs && isAdmin && !isInsidePullMount && (
                              <label className="doc-file-row__check">
                                <input
                                  type="checkbox"
                                  checked={selectedForDelete.includes(f.fullPath)}
                                  onChange={() => {
                                    setSelectedForDelete((prev) => (
                                      prev.includes(f.fullPath) ? prev.filter((p) => p !== f.fullPath) : [...prev, f.fullPath]
                                    ))
                                  }}
                                  aria-label={t('auth.portalSelectFile', { name: f.name })}
                                />
                              </label>
                            )}
                            <FileThumbnail fullPath={f.fullPath} fileType={f.fileType} fileName={f.name} token={accessToken} />
                            <div className="doc-file-row__meta">
                              <span className="doc-file-row__name">{f.name}</span>
                              {f.documentType ? (
                                <span className="doc-file-row__chip">{t(`auth.documentType.${f.documentType}`, { defaultValue: f.documentType })}</span>
                              ) : null}
                              <span className="doc-file-row__sub">{f.sizeLabel} · {f.dateLabel}</span>
                            </div>
                            <div className="doc-file-row__actions doc-file-row__actions--modern">
                              <span className="doc-file-row__version">{t('auth.portalVersionBadge', { count: f.versionCount })}</span>
                              <button type="button" className="btn btn--primary btn--sm doc-file-row__download" onClick={() => void handleDownload(f.name)}>
                                {t('auth.download')}
                              </button>
                              <MenuDropdown
                                align="right"
                                label={t('auth.portalFileMenuLabel', { name: f.name })}
                                trigger={<span className="doc-file-row__more" aria-hidden><IconMoreHorizontal size={18} /></span>}
                              >
                                {useCpanelDocs && (f.fileType === 'pdf' || f.fileType === 'image') ? (
                                  <button type="button" className="doc-menu__item" role="menuitem" onClick={() => void handlePreview(f.name)}>
                                    {t('auth.portalPreview')}
                                  </button>
                                ) : null}
                                {useCpanelDocs && !isInsidePullMount ? (
                                  <button
                                    type="button"
                                    className="doc-menu__item"
                                    role="menuitem"
                                    onClick={() => setMetaModal({
                                      fullPath: f.fullPath,
                                      name: f.name,
                                      documentType: f.documentType || 'OUTROS',
                                      versionLabel: f.metadata?.versionLabel || '',
                                      notes: f.metadata?.notes || '',
                                    })}
                                  >
                                    {t('auth.portalEditMetadata')}
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  className="doc-menu__item"
                                  role="menuitem"
                                  onClick={() => setOpenHistoryPath((prev) => (prev === f.fullPath ? null : f.fullPath))}
                                >
                                  {t('auth.portalHistoryAction')}
                                </button>
                                {isAdmin && !isInsidePullMount ? (
                                  <button type="button" className="doc-menu__item doc-menu__item--danger" role="menuitem" onClick={() => void handleDeleteFile(f.name)} disabled={uploading}>
                                    {t('auth.portalDelete')}
                                  </button>
                                ) : null}
                              </MenuDropdown>
                            </div>
                            {openHistoryPath === f.fullPath && (
                              <div className="doc-file-row__history">
                                {useCpanelDocs && (
                                  <p className="doc-file-row__history-current">
                                    {t('auth.portalHistoryCurrent', { n: f.versionCount, date: f.dateLabel })}
                                  </p>
                                )}
                                {f.history.length === 0 ? (
                                  <p className="doc-file-row__history-empty">{t('auth.portalHistoryEmpty')}</p>
                                ) : (
                                  <ul className="doc-file-row__history-list">
                                    {f.history.map((h, idx) => (
                                      <li key={`${h.at}-${idx}`}>
                                        {formatDate(h.at, locale)} · {h.by || '—'} · {h.metadata?.title || f.name}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  {isAdmin && (
                    <section className="doc-portal__section" aria-labelledby="portal-audit-heading">
                      <div className="doc-portal__section-head">
                        <h2 id="portal-audit-heading" className="doc-portal__section-title">
                          {t('auth.portalAuditHeading')}
                        </h2>
                        {useCpanelDocs && accessToken && (
                          <button type="button" className="btn btn--outline btn--sm doc-portal__btn-on-light" onClick={() => void refreshServerAudit()}>
                            {t('auth.portalAuditRefresh')}
                          </button>
                        )}
                      </div>
                      {auditLog.length === 0 ? (
                        <p className="doc-portal__empty">{t('auth.portalAuditEmpty')}</p>
                      ) : (
                        <ul className="doc-portal__file-list">
                          {auditLog.slice(0, 12).map((entry, idx) => (
                            <li key={`${entry.at}-${idx}`} className="doc-file-row">
                              <div className="doc-file-row__meta">
                                <span className="doc-file-row__name">{entry.action}</span>
                                <span className="doc-file-row__sub">{entry.target}</span>
                              </div>
                              <span className="doc-file-row__sub">{formatDate(entry.at, locale)} · {entry.user}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {useCpanelDocs && accessToken && (
        <PortalCommandPalette
          open={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
          accessToken={accessToken}
          onNavigateToFolder={(folder) => setCurrentPath(folder)}
        />
      )}

      <DocumentPreviewModal
        open={preview.open}
        title={preview.title}
        blobUrl={preview.blobUrl}
        fileType={preview.fileType}
        onClose={closePreview}
      />

      {metaModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="meta-modal-title" onClick={() => !metaSaving && setMetaModal(null)}>
          <div className="modal doc-portal__meta-modal" onClick={(e) => e.stopPropagation()}>
            <h3 id="meta-modal-title" className="doc-portal__meta-modal-title">{t('auth.portalEditMetadata')}</h3>
            <p className="text-muted doc-portal__meta-file">{metaModal.name}</p>
            <label className="doc-portal__meta-label">
              {t('auth.portalMetadataType')}
              <select
                className="doc-portal__input"
                value={metaModal.documentType}
                onChange={(e) => setMetaModal((m) => (m ? { ...m, documentType: e.target.value } : m))}
                disabled={metaSaving}
              >
                {DOCUMENT_TYPES.map((dt) => (
                  <option key={dt} value={dt}>{t(`auth.documentType.${dt}`, { defaultValue: dt })}</option>
                ))}
              </select>
            </label>
            <label className="doc-portal__meta-label">
              {t('auth.portalMetadataVersionLabel')}
              <input
                className="doc-portal__input"
                value={metaModal.versionLabel}
                onChange={(e) => setMetaModal((m) => (m ? { ...m, versionLabel: e.target.value } : m))}
                disabled={metaSaving}
              />
            </label>
            <label className="doc-portal__meta-label">
              {t('auth.portalMetadataNotes')}
              <textarea
                className="doc-portal__input doc-portal__meta-textarea"
                rows={3}
                value={metaModal.notes}
                onChange={(e) => setMetaModal((m) => (m ? { ...m, notes: e.target.value } : m))}
                disabled={metaSaving}
              />
            </label>
            <div className="doc-portal__meta-actions">
              <button type="button" className="btn btn--primary btn--sm" onClick={() => void handleSaveMetadata()} disabled={metaSaving}>
                {metaSaving ? '…' : t('auth.portalMetadataSave')}
              </button>
              <button type="button" className="btn btn--outline btn--sm doc-portal__btn-on-light" onClick={() => setMetaModal(null)} disabled={metaSaving}>
                {t('auth.portalCancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
