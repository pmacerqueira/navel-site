import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function Rgpd() {
  const { t } = useTranslation()
  const rights = [
    'rgpd.rightAccess',
    'rgpd.rightRectification',
    'rgpd.rightErasure',
    'rgpd.rightRestriction',
    'rgpd.rightObject',
    'rgpd.rightPortability',
  ]

  return (
    <>
      <section className="section page-hero">
        <div className="container">
          <h1>{t('rgpd.title')}</h1>
          <p className="text-muted page-hero__lead">{t('rgpd.lead')}</p>
        </div>
      </section>

      <section className="section privacy-content">
        <div className="container container--narrow">
          <div className="privacy-content__block">
            <p>{t('rgpd.intro')}</p>
          </div>

          <div className="privacy-content__block">
            <h3>{t('rgpd.rightsTitle')}</h3>
            <p>{t('rgpd.rightsIntro')}</p>
            <ul className="rgpd-rights-list">
              {rights.map((key) => (
                <li key={key}>{t(key)}</li>
              ))}
            </ul>
          </div>

          <div className="privacy-content__block">
            <h3>{t('rgpd.howTitle')}</h3>
            <p>{t('rgpd.howText')}</p>
            <p>{t('rgpd.privacyLinkText')}</p>
            <p>
              <Link to="/privacidade">{t('privacy.title')}</Link>
            </p>
          </div>

          <div className="privacy-content__block">
            <h3>{t('rgpd.ctaTitle')}</h3>
            <p>{t('rgpd.ctaText')}</p>
            <Link to="/contacto" className="btn btn--primary">{t('rgpd.ctaButton')}</Link>
          </div>
        </div>
      </section>
    </>
  )
}
