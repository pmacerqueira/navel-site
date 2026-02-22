import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BROCHURES } from '../constants'
import { assetUrl } from '../utils/assetUrl'
import CatalogCardActions from '../components/CatalogCardActions'

function CatalogCard({ brochure, catalogId }) {
  const { t } = useTranslation()
  const [imgError, setImgError] = useState(false)
  const [fallbackError, setFallbackError] = useState(false)
  const showFallback = imgError

  const isExternal = brochure.url.startsWith('http')

  return (
    <article className="catalog-card">
      <a
        href={brochure.url}
        target="_blank"
        rel="noopener noreferrer"
        className="catalog-card__link"
        aria-label={`${t(brochure.titleKey)} — ${t('catalogs.viewDownload')} (${t('a11y.opensNewWindow')})`}
      >
        <div className="catalog-card__thumb">
          {!showFallback ? (
            <img
              src={assetUrl(brochure.src)}
              alt=""
              className="catalog-card__img"
              loading="lazy"
              decoding="async"
              onError={() => setImgError(true)}
            />
          ) : brochure.fallbackLogo && !fallbackError ? (
            <img
              src={assetUrl(brochure.fallbackLogo)}
              alt=""
              className="catalog-card__img catalog-card__img--logo"
              onError={() => setFallbackError(true)}
            />
          ) : (
            <div
              className="catalog-card__placeholder"
              style={{ '--brand-color': brochure.brandColor || 'var(--color-primary)' }}
            >
              {brochure.fallbackBrand}
            </div>
          )}
        </div>
        <div className="catalog-card__body">
          <span className="catalog-card__brand">{t(brochure.brandKey)}</span>
          <h3 className="catalog-card__title">{t(brochure.titleKey)}</h3>
          <span className="catalog-card__link-text">{t('catalogs.viewDownload')} →</span>
        </div>
      </a>
      <CatalogCardActions brochure={brochure} catalogId={catalogId} />
    </article>
  )
}

export default function Catalogos() {
  const { t } = useTranslation()

  return (
    <>
      <section className="section page-hero">
        <div className="container">
          <h1>{t('catalogs.title')}</h1>
          <p className="text-muted page-hero__lead">{t('catalogs.lead')}</p>
        </div>
      </section>

      <section className="section catalogs-section">
        <div className="container">
          <h2 className="catalogs-section__title">{t('catalogs.downloadsTitle')}</h2>
          <p className="catalogs-section__lead text-muted">{t('catalogs.downloadsLead')}</p>
          <div className="catalogs-grid">
            {BROCHURES.map((brochure, i) => (
              <CatalogCard key={i} brochure={brochure} catalogId={brochure.titleKey} />
            ))}
          </div>
          <div className="catalogs-cta">
            <Link to="/contacto" className="btn btn--primary">
              {t('catalogs.cta')}
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
