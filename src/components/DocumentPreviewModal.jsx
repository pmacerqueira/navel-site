import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const NARROW_FOR_PREVIEW_MQ = '(max-width: 720px)'

/**
 * Pré-visualização em modal: PDF e imagens via objectURL; outros tipos mostram aviso.
 * Em viewports estreitos, link para abrir o blob noutro separador (Safari iOS e iframe PDF).
 */
export default function DocumentPreviewModal({ open, title, blobUrl, fileType, onClose }) {
  const { t } = useTranslation()
  const [isNarrowViewport, setIsNarrowViewport] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(NARROW_FOR_PREVIEW_MQ)
    const sync = () => setIsNarrowViewport(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Não revogar blobUrl aqui: em React 18 Strict Mode o cleanup corre antes do
  // repaint e invalida o object URL (iframe fica vazio). A revogação fica no onClose do pai.

  if (!open) return null

  return (
    <div className="doc-preview-modal" role="dialog" aria-modal="true" aria-label={title || t('auth.portalPreview')}>
      <button type="button" className="doc-preview-modal__backdrop" onClick={onClose} aria-label={t('auth.portalPreviewClose')} />
      <div className="doc-preview-modal__panel">
        <header className="doc-preview-modal__header">
          <span className="doc-preview-modal__title">{title}</span>
          <div className="doc-preview-modal__header-actions">
            {fileType === 'pdf' && blobUrl ? (
              <a
                href={blobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn--outline btn--sm doc-portal__btn-on-light"
              >
                {t('auth.portalPreviewOpenNewTab')}
              </a>
            ) : null}
            {fileType === 'image' && blobUrl && isNarrowViewport ? (
              <a
                href={blobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn--outline btn--sm doc-portal__btn-on-light"
              >
                {t('auth.portalPreviewOpenNewTab')}
              </a>
            ) : null}
            <button type="button" className="btn btn--outline btn--sm doc-portal__btn-on-light" onClick={onClose}>
              {t('auth.portalPreviewClose')}
            </button>
          </div>
        </header>
        <div className="doc-preview-modal__body">
          {fileType === 'pdf' && blobUrl && (
            <iframe title={title} src={blobUrl} className="doc-preview-modal__iframe" />
          )}
          {fileType === 'image' && blobUrl && (
            <img src={blobUrl} alt="" className="doc-preview-modal__img" />
          )}
          {fileType !== 'pdf' && fileType !== 'image' && (
            <p className="doc-preview-modal__unsupported">{t('auth.portalPreviewUnsupported')}</p>
          )}
        </div>
      </div>
    </div>
  )
}
