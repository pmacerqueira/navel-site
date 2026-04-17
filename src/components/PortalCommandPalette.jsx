import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cpanelSearch } from '../lib/documentosCpanelApi'

const SEARCH_DEBOUNCE_MS = 320

export default function PortalCommandPalette({
  open,
  onClose,
  accessToken,
  onNavigateToFolder,
}) {
  const { t } = useTranslation()
  const inputRef = useRef(null)
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open) {
      setQ('')
      setDebouncedQ('')
      setItems([])
      setError(null)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const t = setTimeout(() => setDebouncedQ(q), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [q, open])

  useEffect(() => {
    if (!open || !accessToken) return undefined
    const query = debouncedQ.trim()
    if (!query) {
      setLoading(false)
      setItems([])
      setError(null)
      return undefined
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const data = await cpanelSearch(accessToken, { q: query })
        if (!cancelled) setItems(Array.isArray(data.items) ? data.items : [])
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e))
          setItems([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, accessToken, debouncedQ])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const showHintEmptyQuery = !debouncedQ.trim() && !loading && !error

  return (
    <div className="doc-cmd-palette" role="dialog" aria-modal="true" aria-label={t('auth.portalCommandSearchTitle')}>
      <button type="button" className="doc-cmd-palette__backdrop" onClick={onClose} aria-label={t('auth.portalPreviewClose')} />
      <div className="doc-cmd-palette__panel">
        <div className="doc-cmd-palette__row">
          <span className="doc-cmd-palette__kbd" aria-hidden>Ctrl+K</span>
          <input
            ref={inputRef}
            type="search"
            className="doc-cmd-palette__input"
            placeholder={t('auth.portalSearchServerPlaceholder')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="doc-cmd-palette__results" role="listbox" aria-label={t('auth.portalCommandSearchTitle')}>
          {showHintEmptyQuery && <p className="doc-cmd-palette__hint">{t('auth.portalSearchPromptMin')}</p>}
          {loading && <p className="doc-cmd-palette__hint">{t('auth.loading')}</p>}
          {error && <p className="doc-cmd-palette__err" role="alert">{error}</p>}
          {!loading && !error && !showHintEmptyQuery && items.length === 0 && (
            <p className="doc-cmd-palette__hint">{t('auth.portalSearchNoResults')}</p>
          )}
          {!loading &&
            items.map((it) => {
              const path = String(it.path || '')
              const lastSlash = path.lastIndexOf('/')
              const parentFolder = lastSlash <= 0 ? '' : path.slice(0, lastSlash)
              const isFolder = Boolean(it.isFolder)
              const navigateTarget = isFolder ? path : parentFolder
              const dt = it.metadata?.documentType || ''
              return (
                <div key={path} className="doc-cmd-palette__item" role="option">
                  <div className="doc-cmd-palette__item-main">
                    <span className="doc-cmd-palette__name">{it.name || path}</span>
                    {isFolder ? (
                      <span className="doc-cmd-palette__chip">{t('auth.portalSearchResultFolder')}</span>
                    ) : dt ? (
                      <span className="doc-cmd-palette__chip">{t(`auth.documentType.${dt}`, { defaultValue: dt })}</span>
                    ) : null}
                  </div>
                  <span className="doc-cmd-palette__path">{path}</span>
                  <button
                    type="button"
                    className="btn btn--primary btn--sm doc-cmd-palette__open"
                    onClick={() => {
                      onNavigateToFolder(navigateTarget)
                      onClose()
                    }}
                  >
                    {t('auth.portalSearchOpenFolder')}
                  </button>
                </div>
              )
            })}
        </div>
      </div>
    </div>
  )
}
