/**
 * Ações sociais por cartão de catálogo: like, comentar, partilhar.
 * Estilo inspirado em publicações (X, Facebook).
 */
import { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { EMAIL_COMERCIAL } from '../constants'

const STORAGE_KEY = 'navel-catalog-likes'

function getStoredLikes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

function setStoredLikes(set) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]))
  } catch {}
}

function getShareUrl(url) {
  if (!url) return ''
  if (url.startsWith('http')) return url
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
  const path = url.startsWith('/') ? url : '/' + url
  return `${window.location.origin}${base}${path}`
}

export default function CatalogCardActions({ brochure, catalogId }) {
  const { t } = useTranslation()
  const [likes, setLikes] = useState(getStoredLikes)
  const [shareOpen, setShareOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const isLiked = likes.has(catalogId)
  const toggleLike = useCallback(() => {
    const next = new Set(likes)
    if (next.has(catalogId)) next.delete(catalogId)
    else next.add(catalogId)
    setLikes(next)
    setStoredLikes(next)
  }, [likes, catalogId])

  const shareUrl = getShareUrl(brochure.url)
  const shareTitle = t(brochure.titleKey)
  const shareBrand = brochure.brandKey ? t(brochure.brandKey) : ''
  const shareText = shareBrand ? `${shareBrand} — ${shareTitle}` : shareTitle

  const handleShare = useCallback(async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        })
        setShareOpen(false)
      } catch (err) {
        if (err.name !== 'AbortError') setShareOpen(true)
      }
      return
    }
    setShareOpen((v) => !v)
  }, [shareTitle, shareText, shareUrl])

  const shareViaWhatsApp = useCallback(() => {
    const text = encodeURIComponent(`${shareText} ${shareUrl}`)
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer')
    setShareOpen(false)
  }, [shareText, shareUrl])

  const shareViaEmail = useCallback(() => {
    const subject = encodeURIComponent(shareTitle)
    const body = encodeURIComponent(`${shareText}\n\n${shareUrl}`)
    window.location.href = `mailto:?subject=${subject}&body=${body}`
    setShareOpen(false)
  }, [shareTitle, shareText, shareUrl])

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      setShareOpen(false)
    } catch {}
  }, [shareUrl])

  const commentMailto = `mailto:${EMAIL_COMERCIAL}?subject=${encodeURIComponent(t('catalogs.commentSubject', { title: shareTitle }))}`

  /* Em mobile: evitar scroll do body quando dropdown está aberto */
  useEffect(() => {
    if (!shareOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [shareOpen])

  return (
    <div className="catalog-card__actions" role="group" aria-label={t('catalogs.actionsLabel')}>
      <button
        type="button"
        className={`catalog-card__action catalog-card__action--like ${isLiked ? 'catalog-card__action--active' : ''}`}
        onClick={(e) => { e.stopPropagation(); toggleLike() }}
        aria-pressed={isLiked}
        aria-label={isLiked ? t('catalogs.unlike') : t('catalogs.like')}
        title={isLiked ? t('catalogs.unlike') : t('catalogs.like')}
      >
        <svg className="catalog-card__action-icon" viewBox="0 0 24 24" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </button>

      <a
        href={commentMailto}
        className="catalog-card__action catalog-card__action--comment"
        aria-label={t('catalogs.comment')}
        title={t('catalogs.comment')}
        onClick={(e) => e.stopPropagation()}
      >
        <svg className="catalog-card__action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </a>

      <div className="catalog-card__share-wrap">
        <button
          type="button"
          className="catalog-card__action catalog-card__action--share"
          onClick={(e) => { e.stopPropagation(); handleShare() }}
          aria-expanded={shareOpen}
          aria-haspopup="true"
          aria-label={t('catalogs.share')}
          title={t('catalogs.share')}
        >
          <svg className="catalog-card__action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
          </svg>
        </button>
        {shareOpen && (
          <>
            <div className="catalog-card__share-backdrop" onClick={() => setShareOpen(false)} aria-hidden="true" />
            <div className="catalog-card__share-dropdown" role="menu">
              {typeof navigator !== 'undefined' && navigator.share && (
                <button type="button" className="catalog-card__share-option" role="menuitem" onClick={handleShare}>
                  {t('catalogs.shareNative')}
                </button>
              )}
              <button type="button" className="catalog-card__share-option" role="menuitem" onClick={shareViaWhatsApp}>
                WhatsApp
              </button>
              <button type="button" className="catalog-card__share-option" role="menuitem" onClick={shareViaEmail}>
                {t('catalogs.shareEmail')}
              </button>
              <button type="button" className="catalog-card__share-option" role="menuitem" onClick={copyLink}>
                {copied ? t('catalogs.linkCopied') : t('catalogs.copyLink')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
