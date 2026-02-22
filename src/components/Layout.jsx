import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import Breadcrumbs from './Breadcrumbs'
import CookieConsent from './CookieConsent'
import WhatsAppButton from './WhatsAppButton'
import TawkWidget from './TawkWidget'
import PageTitle from './PageTitle'

export default function Layout({ children }) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const isReservedArea = pathname === '/area-reservada' || pathname === '/admin'

  return (
    <>
      <PageTitle />
      <CookieConsent />
      <WhatsAppButton />
      <TawkWidget />
      <a href="#main-content" className="skip-link">
        {t('a11y.skipToContent')}
      </a>
      <Header />
      <main id="main-content" className={`main-content ${isReservedArea ? 'main-content--reserved' : ''}`} tabIndex={-1}>
        <div className="main-content__inner">
          <Breadcrumbs />
          {children}
        </div>
      </main>
      <Footer />
    </>
  )
}
