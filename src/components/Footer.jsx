import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FOOTER_NAV, EMAIL_COMERCIAL, EMAIL_OFICINA, COMPANY_NIF, LIVRO_RECLAMACOES_URL } from '../constants'
import FooterBrandsCarousel from './FooterBrandsCarousel'

export default function Footer() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState(null)

  function handleNewsletterSubmit(e) {
    e.preventDefault()
    const trimmed = email.trim()
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
    if (!valid) {
      setStatus('error')
      return
    }
    const subject = encodeURIComponent('Registo Newsletter Navel')
    const body = encodeURIComponent(`Por favor, adicione o seguinte email à newsletter:\n\n${trimmed}`)
    window.location.href = `mailto:${EMAIL_COMERCIAL}?subject=${subject}&body=${body}`
    setStatus('success')
    setEmail('')
  }

  return (
    <footer className="footer">
      <FooterBrandsCarousel />
      <div className="container">
        <div className="footer__main">
          <div className="footer__brand">
            <Link to="/" className="footer__brand-logo">
              <img src="/images/logo.png" alt="Navel - Açores, Lda." width="120" height="38" loading="lazy" decoding="async" />
            </Link>
            <p className="footer__tagline text-muted">{t('footer.tagline')}</p>
          </div>
          <div className="footer__links">
            <h4 className="footer__heading">{t('footer.pages')}</h4>
            <ul>
              {FOOTER_NAV.map((item) => (
                <li key={item.path || item.href}>
                  {item.isExternal ? (
                    <a href={item.href} target="_blank" rel="noopener noreferrer" aria-label={`${t(item.key)} (${t('a11y.opensNewWindow')})`}>{t(item.key)}</a>
                  ) : (
                    <Link to={item.path}>{t(item.key)}</Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div className="footer__contact">
            <h4 className="footer__heading">{t('footer.contact')}</h4>
            <p>
              <strong>{t('footer.commercial')}</strong><br />
              <a href={`mailto:${EMAIL_COMERCIAL}`}>{EMAIL_COMERCIAL}</a>
            </p>
            <p>
              <strong>{t('footer.workshop')}</strong><br />
              <a href={`mailto:${EMAIL_OFICINA}`}>{EMAIL_OFICINA}</a>
            </p>
            <p className="text-muted">Tel. 296 205 290 / 296 630 120</p>
            <p className="footer__hours text-muted">{t('footer.hours')}</p>
          </div>
          <div className="footer__newsletter">
            <h4 className="footer__heading">{t('footer.newsletter')}</h4>
            <p className="text-muted footer__newsletter-text">{t('footer.newsletterText')}</p>
            <p className="footer__newsletter-privacy text-muted">
              {t('footer.newsletterPrivacy')}{' '}
              <Link to="/privacidade" className="footer__privacy-link">{t('footer.policy')}</Link>.
            </p>
            <form className="footer__newsletter-form" onSubmit={handleNewsletterSubmit}>
              <input
                type="email"
                name="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setStatus(null) }}
                placeholder={t('footer.newsletterPlaceholder')}
                className="footer__newsletter-input"
                required
                aria-label={t('footer.newsletterPlaceholder')}
              />
              <button type="submit" className="btn btn--outline btn--sm footer__newsletter-btn">
                {t('footer.newsletterSubmit')}
              </button>
            </form>
            {status === 'success' && (
              <p className="footer__newsletter-message footer__newsletter-message--success" role="status" aria-live="polite">
                {t('footer.newsletterSuccess')}
              </p>
            )}
            {status === 'error' && (
              <p className="footer__newsletter-message footer__newsletter-message--error" role="alert" aria-live="assertive">
                {t('footer.newsletterError')}
              </p>
            )}
          </div>
        </div>
        <div className="footer__bottom">
          <p className="text-muted">
            © {new Date().getFullYear()} {t('footer.copyright')}
            {' · '}
            NIF {COMPANY_NIF}
          </p>
          <p className="text-muted footer__legal">
            <Link to="/privacidade" className="footer__privacy-link">{t('footer.privacy')}</Link>
            {' · '}
            <a href={LIVRO_RECLAMACOES_URL} target="_blank" rel="noopener noreferrer" className="footer__privacy-link" aria-label={`${t('footer.complaintsBook')} (${t('a11y.opensNewWindow')})`}>
              {t('footer.complaintsBook')}
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
