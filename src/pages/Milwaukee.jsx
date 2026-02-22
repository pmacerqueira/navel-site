import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MILWAUKEE_URL } from '../constants'

export default function Milwaukee() {
  const { t } = useTranslation()

  return (
    <>
      <section className="section milwaukee-hero">
        <div className="container milwaukee-hero__inner">
          <p className="milwaukee-hero__eyebrow">{t('milwaukee.eyebrow')}</p>
          <h1 className="milwaukee-hero__title">{t('milwaukee.title')}</h1>
          <p className="milwaukee-hero__lead text-muted">{t('milwaukee.lead')}</p>
          <div className="milwaukee-hero__actions">
            <a href={MILWAUKEE_URL} className="btn btn--primary" target="_blank" rel="noopener noreferrer" aria-label={`${t('milwaukee.ctaProducts')} (${t('a11y.opensNewWindow')})`}>{t('milwaukee.ctaProducts')}</a>
            <Link to="/contacto" className="btn btn--outline">{t('milwaukee.ctaContact')}</Link>
          </div>
        </div>
        <div className="milwaukee-hero__strip" aria-hidden="true" />
      </section>

      <section className="section milwaukee-content">
        <div className="container container--narrow">
          <h2>{t('milwaukee.whyTitle')}</h2>
          <p className="text-muted">{t('milwaukee.whyText')}</p>
          <ul className="milwaukee-features">
            <li>{t('milwaukee.feature1')}</li>
            <li>{t('milwaukee.feature2')}</li>
            <li>{t('milwaukee.feature3')}</li>
            <li>{t('milwaukee.feature4')}</li>
          </ul>
          <p className="text-muted">{t('milwaukee.catalogText')}</p>
          <Link to="/contacto" className="btn btn--primary">{t('milwaukee.ctaCatalog')}</Link>
        </div>
      </section>

      <section className="section cta-section">
        <div className="container cta-section__inner">
          <h2>{t('milwaukee.ctaTitle')}</h2>
          <p className="text-muted">{t('milwaukee.ctaText')}</p>
          <Link to="/contacto" className="btn btn--primary">{t('milwaukee.ctaButton')}</Link>
        </div>
      </section>
    </>
  )
}
