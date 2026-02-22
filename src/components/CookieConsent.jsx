import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CONSENT_KEY, hasCookieConsent } from '../utils/consent'

export default function CookieConsent() {
  const { t } = useTranslation()
  /* Mostra a barra por defeito; esconde apenas se já tiver consentimento (evita flash) */
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (hasCookieConsent()) setVisible(false)
  }, [])

  function handleAccept() {
    try {
      localStorage.setItem(CONSENT_KEY, 'true')
      setVisible(false)
      window.dispatchEvent(new CustomEvent('navel-cookies-accepted'))
    } catch {
      setVisible(false)
    }
  }

  if (!visible) return null

  return (
    <div
      className="cookie-consent"
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
    >
      <div className="cookie-consent__inner">
        <p id="cookie-consent-title" className="cookie-consent__title">
          {t('cookies.title')}
        </p>
        <p id="cookie-consent-desc" className="cookie-consent__text">
          {t('cookies.text')}{' '}
          <Link to="/privacidade" className="cookie-consent__link">
            {t('cookies.policy')}
          </Link>
          .
        </p>
        <button
          type="button"
          className="btn btn--primary btn--sm cookie-consent__btn"
          onClick={handleAccept}
        >
          {t('cookies.accept')}
        </button>
      </div>
    </div>
  )
}
