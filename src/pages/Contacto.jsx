import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { EMAIL_COMERCIAL, EMAIL_OFICINA, CONTACT_LOCATIONS } from '../constants'

const FAQ_ITEMS = [
  { q: 'contact.faq1Q', a: 'contact.faq1A' },
  { q: 'contact.faq2Q', a: 'contact.faq2A' },
  { q: 'contact.faq3Q', a: 'contact.faq3A' },
  { q: 'contact.faq4Q', a: 'contact.faq4A' },
  { q: 'contact.faq5Q', a: 'contact.faq5A' },
]

export default function Contacto() {
  const { t } = useTranslation()
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [openFaq, setOpenFaq] = useState(null)
  const [feedback, setFeedback] = useState(null) // 'success' | 'error' | null
  const [submitting, setSubmitting] = useState(false)

  const [errorType, setErrorType] = useState(null) // 'limit' | null
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('sent') === '1') setFeedback('success')
    else if (params.get('error')) {
      setFeedback('error')
      const err = params.get('error')
      setErrorType(err === 'limit' ? 'limit' : err === 'missing' ? 'missing' : err === 'invalid' ? 'invalid' : null)
    }
    if (params.get('sent') || params.get('error')) {
      window.history.replaceState({}, '', window.location.origin + (window.location.pathname || '/') + (window.location.hash || '#/contacto'))
    }
  }, [])

  const handleQuoteSubmit = (e) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    const formEl = e.target
    formEl.submit()
  }

  return (
    <>
      <section className="section page-hero">
        <div className="container">
          <h1>{t('contact.title')}</h1>
          <p className="text-muted page-hero__lead">{t('contact.lead')}</p>
        </div>
      </section>

      <section className="section contact-quote-form">
        <div className="container container--narrow">
          <h2>{t('contact.quoteFormTitle')}</h2>
          <p className="text-muted">{t('contact.quoteFormLead')}</p>
          {feedback === 'success' && (
            <div className="quote-form__feedback quote-form__feedback--success" role="status">
              {t('contact.quoteSuccess')}
            </div>
          )}
          {feedback === 'error' && (
            <div className="quote-form__feedback quote-form__feedback--error" role="alert">
              {errorType === 'limit' && t('contact.quoteErrorLimit')}
              {errorType === 'missing' && t('contact.quoteErrorMissing')}
              {errorType === 'invalid' && t('contact.quoteErrorInvalid')}
              {!errorType && t('contact.quoteError')}
            </div>
          )}
          <form className="quote-form" onSubmit={handleQuoteSubmit} action="/send-contact.php" method="POST">
            <div className="quote-form__row">
              <label htmlFor="quote-name">{t('contact.quoteFormName')}</label>
              <input
                id="quote-name"
                name="name"
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="quote-form__row">
              <label htmlFor="quote-email">{t('contact.quoteFormEmail')}</label>
              <input
                id="quote-email"
                name="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="quote-form__row">
              <label htmlFor="quote-subject">{t('contact.quoteFormSubject')}</label>
              <input
                id="quote-subject"
                name="subject"
                type="text"
                required
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              />
            </div>
            <div className="quote-form__row">
              <label htmlFor="quote-message">{t('contact.quoteFormMessage')}</label>
              <textarea
                id="quote-message"
                name="message"
                rows={5}
                required
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              />
            </div>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? t('auth.loading') : t('contact.quoteFormSubmit')}
            </button>
          </form>
        </div>
      </section>

      <section className="section contact-faq" aria-labelledby="faq-title">
        <div className="container container--narrow">
          <h2 id="faq-title">{t('contact.faqTitle')}</h2>
          <div className="faq-list">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className={`faq-item ${openFaq === i ? 'faq-item--open' : ''}`}>
                <button
                  type="button"
                  className="faq-item__trigger"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                  aria-controls={`faq-answer-${i}`}
                  id={`faq-question-${i}`}
                >
                  {t(item.q)}
                  <span className="faq-item__icon" aria-hidden="true" />
                </button>
                <div
                  id={`faq-answer-${i}`}
                  className="faq-item__content"
                  role="region"
                  aria-labelledby={`faq-question-${i}`}
                >
                  <p>{t(item.a)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section contact-cards">
        <div className="container">
          <div className="contact-grid">
            <div className="card contact-card">
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

          <div className="contact-cta">
            <p className="text-muted">{t('contact.cta')}</p>
            <p className="contact-cta__privacy text-muted">
              <Link to="/privacidade">{t('contact.privacyNotice')}</Link>
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
