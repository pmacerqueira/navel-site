import { useTranslation } from 'react-i18next'

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
          <div className="privacy-content__block">
            <h3>{t('privacy.controller')}</h3>
            <p>{t('privacy.controllerText')}</p>
          </div>
          <div className="privacy-content__block">
            <h3>{t('privacy.data')}</h3>
            <p>{t('privacy.dataText')}</p>
          </div>
          <div className="privacy-content__block">
            <h3>{t('privacy.purpose')}</h3>
            <p>{t('privacy.purposeText')}</p>
          </div>
          <div className="privacy-content__block">
            <h3>{t('privacy.cookies')}</h3>
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
          <div className="privacy-content__block">
            <h3>{t('privacy.rights')}</h3>
            <p>{t('privacy.rightsText')}</p>
          </div>
          <div className="privacy-content__block">
            <h3>{t('privacy.contact')}</h3>
            <p>{t('privacy.contactText')}</p>
          </div>
        </div>
      </section>
    </>
  )
}
