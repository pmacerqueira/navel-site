import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

function Block({ titleKey, bodyKey }) {
  const { t } = useTranslation()
  return (
    <div className="privacy-content__block">
      <h3>{t(titleKey)}</h3>
      <p>{t(bodyKey)}</p>
    </div>
  )
}

export default function Privacidade() {
  const { t } = useTranslation()

  return (
    <>
      <section className="section page-hero">
        <div className="container">
          <h1>{t('privacy.title')}</h1>
          <p className="text-muted page-hero__lead">{t('privacy.lead')}</p>
        </div>
      </section>

      <section className="section privacy-content">
        <div className="container container--narrow">
          <Block titleKey="privacy.introWho" bodyKey="privacy.introWhoText" />
          <Block titleKey="privacy.whyPolicy" bodyKey="privacy.whyPolicyText" />
          <Block titleKey="privacy.scope" bodyKey="privacy.scopeText" />
          <Block titleKey="privacy.definitions" bodyKey="privacy.definitionsText" />
          <Block titleKey="privacy.controller" bodyKey="privacy.controllerText" />
          <Block titleKey="privacy.dataProtectionContact" bodyKey="privacy.dataProtectionContactText" />
          <Block titleKey="privacy.data" bodyKey="privacy.dataText" />
          <Block titleKey="privacy.collection" bodyKey="privacy.collectionText" />
          <Block titleKey="privacy.recipients" bodyKey="privacy.recipientsText" />
          <Block titleKey="privacy.purpose" bodyKey="privacy.purposeText" />
          <Block titleKey="privacy.retention" bodyKey="privacy.retentionText" />
          <Block titleKey="privacy.marketing" bodyKey="privacy.marketingText" />
          <Block titleKey="privacy.rights" bodyKey="privacy.rightsText" />
          <Block titleKey="privacy.complaints" bodyKey="privacy.complaintsText" />
          <Block titleKey="privacy.security" bodyKey="privacy.securityText" />
          <Block titleKey="privacy.transfers" bodyKey="privacy.transfersText" />

          <div className="privacy-content__block">
            <h3>{t('privacy.cookies')}</h3>
            <p>{t('privacy.cookiesIntro')}</p>
            <p>{t('privacy.cookiesText')}</p>
            <h4 className="privacy-content__subtitle">{t('privacy.cookieRegisterTitle')}</h4>
            <p className="text-muted">{t('privacy.cookieRegisterLead')}</p>
            <div className="privacy-content__table-wrapper" role="region" aria-label={t('privacy.cookieRegisterTitle')}>
              <table className="cookie-register">
                <thead>
                  <tr>
                    <th>{t('privacy.cookieRegisterName')}</th>
                    <th>{t('privacy.cookieRegisterType')}</th>
                    <th>{t('privacy.cookieRegisterPurpose')}</th>
                    <th>{t('privacy.cookieRegisterDuration')}</th>
                    <th>{t('privacy.cookieRegisterOwner')}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>navel-cookies-accepted</code></td>
                    <td>{t('privacy.cookieTypeStorage')}</td>
                    <td>{t('privacy.cookiePurposeConsent')}</td>
                    <td>{t('privacy.cookieDuration1y')}</td>
                    <td>{t('privacy.cookieOwnerNavel')}</td>
                  </tr>
                  <tr>
                    <td><code>navel-lang</code></td>
                    <td>{t('privacy.cookieTypeStorage')}</td>
                    <td>{t('privacy.cookiePurposeLang')}</td>
                    <td>{t('privacy.cookieDuration1y')}</td>
                    <td>{t('privacy.cookieOwnerNavel')}</td>
                  </tr>
                  <tr>
                    <td><code>sb-*</code></td>
                    <td>{t('privacy.cookieTypeStorage')}</td>
                    <td>{t('privacy.cookiePurposeAuth')}</td>
                    <td>{t('privacy.cookieDurationSession')}</td>
                    <td>Supabase</td>
                  </tr>
                  <tr>
                    <td>Google Fonts</td>
                    <td>{t('privacy.cookieTypeThird')}</td>
                    <td>{t('privacy.cookiePurposeFonts')}</td>
                    <td>{t('privacy.cookieDurationVar')}</td>
                    <td>Google</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <Block titleKey="privacy.changes" bodyKey="privacy.changesText" />
          <div className="privacy-content__block privacy-content__block--meta">
            <p className="text-muted privacy-content__updated">{t('privacy.lastUpdated')}</p>
          </div>
          <div className="privacy-content__block">
            <p className="text-muted">
              <Link to="/rgpd">{t('privacy.rgpdCrossLink')}</Link>
              {' — '}
              {t('privacy.rgpdCrossLead')}
            </p>
          </div>
          <Block titleKey="privacy.contact" bodyKey="privacy.contactText" />
        </div>
      </section>
    </>
  )
}
