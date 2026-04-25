import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { CATEGORY_KEYS, CATEGORY_IDS, BRANDS_BY_CATEGORY, BRAND_URLS } from '../constants'
import ScrollReveal from '../components/ScrollReveal'
import { assetUrl } from '../utils/assetUrl'

function BrandTag({ brand, opensNewWindow }) {
  const url = BRAND_URLS[brand]
  if (url) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="brands-tag brands-tag--link" aria-label={`${brand} (${opensNewWindow})`}>
        {brand}
      </a>
    )
  }
  return <span className="brands-tag">{brand}</span>
}

export default function Produtos() {
  const { t } = useTranslation()

  return (
    <>
      <section className="section page-hero">
        <div className="container">
          <h1>{t('products.title')}</h1>
          <p className="text-muted page-hero__lead">{t('products.lead')}</p>
        </div>
      </section>

      <section className="section products-istobal-highlight" aria-labelledby="products-istobal-title">
        <div className="container">
          <ScrollReveal>
            <div className="card products-istobal-card">
              <div className="products-istobal-card__logo-wrap">
                <img
                  src={assetUrl('/images/brands/istobal.png')}
                  alt=""
                  width={160}
                  height={64}
                  loading="lazy"
                  decoding="async"
                  className="products-istobal-card__logo"
                />
              </div>
              <div className="products-istobal-card__body">
                <h2 id="products-istobal-title" className="products-istobal-card__title">
                  {t('products.istobalHighlightTitle')}
                </h2>
                <p className="text-muted products-istobal-card__text">{t('products.istobalHighlightText')}</p>
                <Link to="/istobal" className="btn btn--primary">
                  {t('products.istobalHighlightCta')}
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="section products-categories">
        <div className="container">
          <h2>{t('products.categoriesTitle')}</h2>
          <p className="text-muted products-brands__lead">{t('products.brandsLead')}</p>
          <div className="categories-with-brands">
            {CATEGORY_KEYS.map((cat, i) => {
              const catId = CATEGORY_IDS[i]
              const brands = BRANDS_BY_CATEGORY[catId] || []
              return (
                <ScrollReveal key={i} delay={i * 50}>
                  <div className="card product-cat-card product-cat-card--with-brands">
                    <h3>{t(cat.name)}</h3>
                    <p className="text-muted product-cat-card__desc">{t(cat.desc)}</p>
                    {brands.length > 0 && (
                      <ul className="product-cat-card__brands">
                        {brands.map((brand, j) => (
                          <li key={j}>
                            <BrandTag brand={brand} opensNewWindow={t('a11y.opensNewWindow')} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </ScrollReveal>
              )
            })}
            {BRANDS_BY_CATEGORY.outras?.length > 0 && (
              <ScrollReveal delay={CATEGORY_KEYS.length * 50}>
                <div className="card product-cat-card product-cat-card--with-brands">
                  <h3>{t('products.otherBrands')}</h3>
                  <ul className="product-cat-card__brands">
                    {BRANDS_BY_CATEGORY.outras.map((brand, j) => (
                      <li key={j}>
                        <BrandTag brand={brand} opensNewWindow={t('a11y.opensNewWindow')} />
                      </li>
                    ))}
                  </ul>
                </div>
              </ScrollReveal>
            )}
          </div>
          <div className="products-cta">
            <Link to="/contacto" className="btn btn--primary">{t('products.ctaQuote')}</Link>
            <Link to="/catalogos" className="btn btn--outline">{t('products.ctaCatalog')}</Link>
          </div>
        </div>
      </section>
    </>
  )
}
