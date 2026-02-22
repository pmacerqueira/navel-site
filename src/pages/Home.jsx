import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { EMAIL_COMERCIAL, EMAIL_OFICINA, CONTACT_LOCATIONS, HOME_CAMPAIGNS, MANUT_DASHBOARD_URL } from '../constants'
import HeroAnimation from '../components/HeroAnimation'
import SearchBar from '../components/SearchBar'
import ScrollReveal from '../components/ScrollReveal'
import { assetUrl } from '../utils/assetUrl'

export default function Home() {
  const { t } = useTranslation()

  return (
    <>
      <section className="section section--hero hero">
        <div className="container hero__inner">
          <div className="hero__content">
            <p className="hero__eyebrow">{t('home.eyebrow')}</p>
            <h1 className="hero__title">{t('home.title')}</h1>
            <p className="hero__lead text-muted">{t('home.lead')}</p>
            <div className="hero__actions-wrapper">
              <div className="hero__actions">
                <Link to="/catalogos" className="btn btn--primary">{t('home.ctaProducts')}</Link>
                <Link to="/contacto" className="btn btn--primary hero__cta-quote">
                  {t('nav.requestQuote')}
                </Link>
              </div>
              <div className="hero__search-row">
                <SearchBar />
              </div>
            </div>
          </div>
          <HeroAnimation />
        </div>
        <div className="hero__strip" aria-hidden="true" />
      </section>

      <section className="section values">
        <div className="container">
          <div className="values__grid">
            {[
              { title: 'home.value1Title', text: 'home.value1Text' },
              { title: 'home.value2Title', text: 'home.value2Text' },
              { title: 'home.value3Title', text: 'home.value3Text' },
            ].map((item, i) => (
              <ScrollReveal key={i} delay={i * 80}>
                <div className="card values__card">
                  <h3>{t(item.title)}</h3>
                  <p className="text-muted">{t(item.text)}</p>
                  {i === 2 && (
                    <div className="values__dashboard">
                      <a href={MANUT_DASHBOARD_URL} className="btn values__dashboard-btn" aria-label="Aceder ao Dashboard de manutenções Navel">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                        </svg>
                        Dashboard
                      </a>
                    </div>
                  )}
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section home-social-proof" aria-labelledby="social-proof-title">
        <div className="container">
          <h2 id="social-proof-title" className="visually-hidden">{t('home.socialProofTitle')}</h2>
          <div className="home-social-proof__grid">
            {[
              { num: '30+', key: 'home.socialProofBrands' },
              { num: '40+', key: 'home.socialProofYears' },
              { num: '2000m²+', key: 'home.socialProofArea' },
              { num: '45.000+', key: 'home.socialProofStock' },
            ].map((item, i) => (
              <ScrollReveal key={i} delay={i * 100}>
                <div className="home-social-proof__item">
                  <span className="home-social-proof__number">{item.num}</span>
                  <p className="home-social-proof__text">{t(item.key)}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <ScrollReveal as="section" className="section home-campaigns">
        <div className="container">
          <h2 className="home-campaigns__title">{t('home.campaignsTitle')}</h2>
          <p className="home-campaigns__lead text-muted">{t('home.campaignsLead')}</p>
          <div className="home-campaigns__grid">
            {HOME_CAMPAIGNS.map((campaign, i) => (
              <ScrollReveal key={i} delay={i * 60}>
                <a
                  href={campaign.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card home-campaign-card"
                  aria-label={`${t(campaign.titleKey)} — ${t('news.viewDownload')} (${t('a11y.opensNewWindow')})`}
                >
                  <div className="home-campaign-card__thumb">
                    <img src={assetUrl(campaign.src)} alt="" loading="lazy" decoding="async" />
                  </div>
                  <div className="home-campaign-card__body">
                    <span className="home-campaign-card__brand">{t(campaign.brandKey)}</span>
                    <h3 className="home-campaign-card__title">{t(campaign.titleKey)}</h3>
                    {campaign.urgencyKey && (
                      <span className="home-campaign-card__urgency">{t(campaign.urgencyKey)}</span>
                    )}
                  </div>
                </a>
              </ScrollReveal>
            ))}
          </div>
          <div className="home-campaigns__cta">
            <Link to="/catalogos" className="btn btn--outline">{t('home.campaignsCta')}</Link>
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal as="section" className="section home-locations" id="contactos">
        <div className="container">
          <h2 className="home-locations__title">{t('home.locationsTitle')}</h2>
          <div className="contact-grid home-locations__grid">
            <div className="card contact-card">
              <span className="contact-card__badge">{t('footer.commercial')}</span>
              <h3 className="contact-card__title">{t('contact.location1')}</h3>
              <address className="contact-card__address">
                {t('contact.address1')}<br />
                {t('contact.postal1')}
              </address>
              <p>
                <strong>{t('contact.phones')}:</strong> 296 630 120 / 1 / 2 / 3
              </p>
              <p className="contact-card__hours text-muted">
                <strong>{t('contact.hoursLabel')}:</strong> {t('contact.hours')}
              </p>
              <p className="contact-card__map">
                <a href={CONTACT_LOCATIONS[0].mapsUrl} target="_blank" rel="noopener noreferrer" className="contact-card__map-link" aria-label={`${t('contact.openInMaps')} — ${t('contact.location1')} (${t('a11y.opensNewWindow')})`}>
                  {t('contact.openInMaps')}
                </a>
                <span className="contact-card__coords text-muted">37.778019, -25.589581</span>
              </p>
              <a href={`mailto:${EMAIL_COMERCIAL}`} className="contact-card__email">{EMAIL_COMERCIAL}</a>
            </div>

            <div className="card contact-card">
              <span className="contact-card__badge">{t('footer.workshop')}</span>
              <h3 className="contact-card__title">{t('contact.location2')}</h3>
              <address className="contact-card__address">
                {t('contact.address2')}<br />
                {t('contact.postal2')}
              </address>
              <p>
                <strong>{t('contact.phones')}:</strong> 296 205 290 / 1 / 2 / 3
              </p>
              <p className="contact-card__hours text-muted">
                <strong>{t('contact.hoursLabel')}:</strong> {t('contact.hours')}
              </p>
              <p className="contact-card__map">
                <a href={CONTACT_LOCATIONS[1].mapsUrl} target="_blank" rel="noopener noreferrer" className="contact-card__map-link" aria-label={`${t('contact.openInMaps')} — ${t('contact.location2')} (${t('a11y.opensNewWindow')})`}>
                  {t('contact.openInMaps')}
                </a>
                <span className="contact-card__coords text-muted">37.734603, -25.678455</span>
              </p>
              <a href={`mailto:${EMAIL_OFICINA}`} className="contact-card__email">{EMAIL_OFICINA}</a>
            </div>
          </div>
          <div className="home-locations__cta">
            <Link to="/contacto" className="btn btn--primary">{t('home.ctaButton')}</Link>
          </div>
        </div>
      </ScrollReveal>
    </>
  )
}
