import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const ROUTE_BREADCRUMBS = {
  '/milwaukee': ['nav.milwaukee'],
  '/produtos': ['nav.products'],
  '/marcas': ['nav.brands'],
  '/sobre': ['nav.about'],
  '/servicos': ['nav.services'],
  '/catalogos': ['nav.catalogs'],
  '/contacto': ['nav.contact'],
  '/privacidade': ['footer.privacy'],
}

export default function Breadcrumbs() {
  const { pathname } = useLocation()
  const { t } = useTranslation()

  const segments = ROUTE_BREADCRUMBS[pathname]
  if (!segments || pathname === '/') return null

  const items = [
    { path: '/', labelKey: 'nav.home' },
    { path: null, labelKey: segments[0], isCurrent: true },
  ]

  return (
    <nav className="breadcrumbs container" aria-label={t('a11y.breadcrumbs')}>
      <ol className="breadcrumbs__list">
        {items.map((item, i) => (
          <li key={i} className="breadcrumbs__item">
            {item.isCurrent ? (
              <span className="breadcrumbs__current" aria-current="page">
                {t(item.labelKey)}
              </span>
            ) : (
              <Link to={item.path} className="breadcrumbs__link">
                {t(item.labelKey)}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
