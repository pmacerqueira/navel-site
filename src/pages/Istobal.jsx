import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ISTOBAL_URL } from '../constants'
import IstobalGallery from '../components/IstobalGallery'

export default function Istobal() {
  const { t } = useTranslation()
  const segments = ['segment1', 'segment2', 'segment3', 'segment4', 'segment5'].map((k) =>
    t(`istobal.${k}`)
  )

  return (
    <>
      <section className="section istobal-hero">
        <div className="container istobal-hero__inner">
          <p className="istobal-hero__eyebrow">{t('istobal.eyebrow')}</p>
          <h1 className="istobal-hero__title">{t('istobal.title')}</h1>
          <p className="istobal-hero__lead text-muted">{t('istobal.lead')}</p>
          <div className="istobal-hero__actions">
            <a
              href={ISTOBAL_URL}
              className="btn btn--primary"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${t('istobal.ctaOfficial')} (${t('a11y.opensNewWindow')})`}
            >
              {t('istobal.ctaOfficial')}
            </a>
            <Link to="/contacto" className="btn btn--outline">
              {t('istobal.ctaContact')}
            </Link>
          </div>
        </div>
        <div className="istobal-hero__strip" aria-hidden="true" />
      </section>

      <IstobalGallery />

      <section className="section istobal-content">
        <div className="container container--narrow">
          <h2>{t('istobal.whyTitle')}</h2>
          <p className="text-muted">{t('istobal.whyText')}</p>
          <ul className="istobal-features">
            <li>{t('istobal.feature1')}</li>
            <li>{t('istobal.feature2')}</li>
            <li>{t('istobal.feature3')}</li>
            <li>{t('istobal.feature4')}</li>
          </ul>

          <h2 className="istobal-content__h2">{t('istobal.segmentsTitle')}</h2>
          <ul className="istobal-features">
            {segments.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section istobal-content">
        <div className="container container--narrow">
          <div className="istobal-stats" aria-label={t('istobal.statsAria')}>
            <div className="istobal-stats__grid">
              {[
                { numKey: 'statCountriesNum', labelKey: 'statCountries' },
                { numKey: 'statExportNum', labelKey: 'statExport' },
                { numKey: 'statWashesNum', labelKey: 'statWashes' },
                { numKey: 'statMachinesNum', labelKey: 'statMachines' },
              ].map((item) => (
                <div key={item.labelKey} className="istobal-stats__item">
                  <span className="istobal-stats__num">{t(`istobal.${item.numKey}`)}</span>
                  <p className="istobal-stats__label">{t(`istobal.${item.labelKey}`)}</p>
                </div>
              ))}
            </div>
            <p className="istobal-stats__note text-muted">{t('istobal.statsNote')}</p>
          </div>

          <h2 className="istobal-content__h2">{t('istobal.sustainabilityTitle')}</h2>
          <p className="text-muted">{t('istobal.sustainabilityText')}</p>

          <p className="text-muted istobal-content__catalog">{t('istobal.catalogText')}</p>
          <Link to="/contacto" className="btn btn--primary">
            {t('istobal.ctaCatalog')}
          </Link>
        </div>
      </section>

      <section className="section cta-section cta-section--istobal">
        <div className="container cta-section__inner">
          <h2>{t('istobal.ctaTitle')}</h2>
          <p className="text-muted">{t('istobal.ctaText')}</p>
          <Link to="/contacto" className="btn btn--primary">
            {t('istobal.ctaButton')}
          </Link>
        </div>
      </section>
    </>
  )
}
