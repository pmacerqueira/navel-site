import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { BRANDS } from '../data/brands'
import ScrollReveal from '../components/ScrollReveal'

function BrandCard({ brand }) {
  const { t } = useTranslation()
  const hasUrl = !!brand.url
  const hasDownload = !!(brand.downloadUrl || brand.brochure)

  return (
    <article className="card brand-card">
      <div className="brand-card__logo">
        {brand.logo ? (
          <img src={brand.logo} alt="" loading="lazy" decoding="async" />
        ) : (
          <span className="brand-card__placeholder">{brand.name}</span>
        )}
      </div>
      <div className="brand-card__body">
        <h3 className="brand-card__name">{brand.name}</h3>
        <div className="brand-card__links">
          {hasUrl && (
            <a
              href={brand.url}
              target="_blank"
              rel="noopener noreferrer"
              className="brand-card__link"
              aria-label={`${brand.name} — ${t('brands.visitSite')} (${t('a11y.opensNewWindow')})`}
            >
              {t('brands.visitSite')} →
            </a>
          )}
          {hasDownload && (
            <a
              href={brand.downloadUrl || brand.url}
              target="_blank"
              rel="noopener noreferrer"
              className="brand-card__link"
              aria-label={`${brand.name} — ${t('brands.downloadCatalog')} (${t('a11y.opensNewWindow')})`}
            >
              {t('brands.downloadCatalog')} →
            </a>
          )}
        </div>
        {brand.brochure && (
          <Link to="/catalogos" className="brand-card__brochure">
            {t('brands.viewBrochures')}
          </Link>
        )}
      </div>
    </article>
  )
}

export default function Marcas() {
  const { t } = useTranslation()
  const brandsToShow = BRANDS.filter((b) => b.url || b.brochure)

  return (
    <>
      <section className="section page-hero">
        <div className="container">
          <h1>{t('brands.title')}</h1>
          <p className="text-muted page-hero__lead">{t('brands.lead')}</p>
        </div>
      </section>

      <section className="section brands-grid-section">
        <div className="container">
          <div className="brands-grid">
            {brandsToShow.map((brand, i) => (
              <ScrollReveal key={brand.id} delay={Math.min(i * 40, 400)}>
                <BrandCard brand={brand} />
              </ScrollReveal>
            ))}
          </div>
          <div className="brands-cta">
            <Link to="/contacto" className="btn btn--primary">
              {t('products.ctaQuote')}
            </Link>
            <Link to="/catalogos" className="btn btn--outline">
              {t('products.ctaCatalog')}
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
