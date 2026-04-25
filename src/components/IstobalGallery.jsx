import { useCallback, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ISTOBAL_GALLERY_SLIDES } from '../data/istobalShowcase'

export default function IstobalGallery() {
  const { t } = useTranslation()
  const uid = useId()
  const labelId = `${uid}-label`
  const statusId = `${uid}-status`
  const [index, setIndex] = useState(0)
  const total = ISTOBAL_GALLERY_SLIDES.length
  const safe = (index + total) % total
  const slide = ISTOBAL_GALLERY_SLIDES[safe]

  const go = useCallback((dir) => {
    setIndex((i) => (i + dir + total) % total)
  }, [total])

  function onCarouselKeyDown(e) {
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      go(-1)
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      go(1)
    }
  }

  return (
    <section
      className="section istobal-gallery"
      aria-roledescription="carousel"
      aria-labelledby={labelId}
    >
      <div className="container">
        <h2 id={labelId} className="istobal-gallery__title">
          {t('istobal.galleryTitle')}
        </h2>
        <p className="text-muted istobal-gallery__source">{t('istobal.gallerySourceNote')}</p>

        <div
          className="istobal-gallery__frame"
          tabIndex={0}
          onKeyDown={onCarouselKeyDown}
        >
          <p id={statusId} className="visually-hidden" aria-live="polite">
            {t('istobal.gallerySlideStatus', { current: safe + 1, total })}
          </p>

          <div className="istobal-gallery__viewport">
            <img
              className="istobal-gallery__img"
              src={slide.src}
              alt={t(slide.captionKey)}
              width={1200}
              height={675}
              loading={safe === 0 ? 'eager' : 'lazy'}
              decoding="async"
            />
          </div>

          <p className="istobal-gallery__caption">{t(slide.captionKey)}</p>

          <div className="istobal-gallery__controls">
            <button
              type="button"
              className="btn btn--outline istobal-gallery__btn"
              onClick={() => go(-1)}
              aria-controls={statusId}
            >
              {t('istobal.galleryPrev')}
            </button>
            <div className="istobal-gallery__dots" role="tablist" aria-label={t('istobal.galleryTitle')}>
              {ISTOBAL_GALLERY_SLIDES.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === safe}
                  aria-label={t('istobal.galleryGoTo', { n: i + 1 })}
                  className={'istobal-gallery__dot' + (i === safe ? ' istobal-gallery__dot--active' : '')}
                  onClick={() => setIndex(i)}
                />
              ))}
            </div>
            <button
              type="button"
              className="btn btn--outline istobal-gallery__btn"
              onClick={() => go(1)}
              aria-controls={statusId}
            >
              {t('istobal.galleryNext')}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
