import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from './LanguageSwitcher'
import { useAuth } from '../contexts/AuthContext'
import { NAV_ITEMS } from '../constants'

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const { t } = useTranslation()
  const { isApproved, isAdmin, adminPendingCount } = useAuth()

  return (
    <header className="header">
      <div className="container header__inner">
        <Link to="/" className="header__logo" onClick={() => setMenuOpen(false)}>
          <img src="/images/NAVEL_LOGO.jpg" alt="José Gonçalves Cerqueira (NAVEL-AÇORES), Lda." className="header__logo-img" width="140" height="44" fetchpriority="high" decoding="async" />
        </Link>

        <div className="header__right">
          <nav className={`header__nav ${menuOpen ? 'header__nav--open' : ''}`} aria-label={t('nav.mainNav')}>
            <ul className="header__list">
              {NAV_ITEMS.map((item) => {
                const { path, href, labelKey, hasDropdown, subKeys, isHighlight, isExternal } = item
                const key = path || href
                return (
                <li key={key} className={hasDropdown ? 'header__item--dropdown' : ''}>
                  {isExternal ? (
                    <a
                      href={href}
                      className={`header__link ${isHighlight ? 'header__link--highlight' : ''}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${t(labelKey)} (${t('a11y.opensNewWindow')})`}
                      onClick={() => setMenuOpen(false)}
                    >
                      {t(labelKey)}
                    </a>
                  ) : (
                    <Link
                      to={path}
                      className={`header__link ${location.pathname === path ? 'header__link--active' : ''} ${isHighlight ? 'header__link--highlight' : ''}`}
                      onClick={() => setMenuOpen(false)}
                    >
                      {t(labelKey)}
                    </Link>
                  )}
                  {hasDropdown && subKeys && (
                    <ul className="header__dropdown">
                      {subKeys.map((subKey, i) => (
                        <li key={i}>
                          <Link to="/produtos" onClick={() => setMenuOpen(false)}>
                            {t(subKey)}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
                )
              })}
              {isAdmin && (
                <li>
                  <Link
                    to="/admin"
                    className={`header__link ${adminPendingCount > 0 ? 'header__link--admin-nav' : ''} ${location.pathname === '/admin' ? 'header__link--active' : ''}`}
                    onClick={() => setMenuOpen(false)}
                    title={adminPendingCount > 0 ? t('auth.adminPendingNavTitle', { count: adminPendingCount }) : undefined}
                  >
                    <span className="header__admin-nav-label">{t('nav.admin')}</span>
                    {adminPendingCount > 0 ? (
                      <span className="header__admin-badge" aria-hidden="true">
                        {adminPendingCount > 99 ? '99+' : adminPendingCount}
                      </span>
                    ) : null}
                    {adminPendingCount > 0 ? (
                      <span className="visually-hidden">{t('auth.adminPendingNavTitle', { count: adminPendingCount })}</span>
                    ) : null}
                  </Link>
                </li>
              )}
            </ul>
          </nav>
          <div className="header__auth">
            <LanguageSwitcher />
            <Link
              to={isApproved ? '/area-reservada' : '/login'}
              className={`header__auth-btn ${isApproved ? 'header__auth-btn--area' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {isApproved ? t('nav.areaReservada') : t('nav.login')}
            </Link>
          </div>
          <button
            type="button"
            className="header__toggle"
            aria-label={menuOpen ? t('nav.menuClose') : t('nav.menuOpen')}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span className="header__toggle-bar" />
            <span className="header__toggle-bar" />
            <span className="header__toggle-bar" />
          </button>
        </div>
      </div>
    </header>
  )
}
