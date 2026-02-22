import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BROCHURES } from '../constants'

function BrochureItem({ brochure }) {
  const { t } = useTranslation()
  const [imgError, setImgError] = useState(false)
  const [fallbackError, setFallbackError] = useState(false)

  const showFallback = imgError

  return (
    <a
      href={brochure.url}
      target="_blank"
      rel="noopener noreferrer"
      className="brochure-row"
      aria-label={`${t(brochure.titleKey)} — ${t('news.viewDownload')} (${t('a11y.opensNewWindow')})`}
    >
      <div className="brochure-row__thumb">
        {!showFallback ? (
          <img
            src={brochure.src}
            alt=""
            className="brochure-row__img"
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
          />
        ) : brochure.fallbackLogo && !fallbackError ? (
          <img
            src={brochure.fallbackLogo}
            alt=""
            className="brochure-row__img brochure-row__img--logo"
            onError={() => setFallbackError(true)}
          />
        ) : (
          <div className="brochure-row__placeholder" style={{ '--brand-color': brochure.brandColor || 'var(--color-primary)' }}>
            {brochure.fallbackBrand}
          </div>
        )}
      </div>
      <div className="brochure-row__body">
        <span className="brochure-row__brand">{t(brochure.brandKey)}</span>
        <h3 className="brochure-row__title">{t(brochure.titleKey)}</h3>
        <span className="brochure-row__link">{t('news.viewDownload')} →</span>
      </div>
    </a>
  )
}

export default function Novidades() {
  const { t } = useTranslation()

  return (
    <>
      <section className="section page-hero">
        <div className="container">
          <h1>{t('news.title')}</h1>
          <p className="text-muted page-hero__lead">{t('news.lead')}</p>
        </div>
      </section>

      <section className="section brochures-section">
        <div className="container container--narrow">
          <h2 className="brochures-section__title">{t('news.downloadsTitle')}</h2>
          <p className="brochures-section__lead text-muted">{t('news.downloadsLead')}</p>
          <ul className="brochures-list">
            {BROCHURES.map((brochure, i) => (
              <li key={i}>
                <BrochureItem brochure={brochure} />
              </li>
            ))}
          </ul>
          <div className="brochures-cta">
            <Link to="/contacto" className="btn btn--primary">
              {t('news.cta')}
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
