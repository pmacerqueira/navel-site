/**
 * Atualiza document.title conforme a rota atual.
 * Melhora SEO e UX (títulos corretos nos separadores e histórico).
 */
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

/** Sufixo para títulos de páginas internas: reforça marca e localização (local SEO) */
const TITLE_SUFFIX = ' | Navel - Açores | Ponta Delgada'

const ROUTE_TITLES = {
  '/': null, // usa o título do index.html
  '/sobre': 'about.title',
  '/produtos': 'products.title',
  '/marcas': 'brands.title',
  '/milwaukee': 'milwaukee.title',
  '/servicos': 'services.title',
  '/catalogos': 'catalogs.title',
  '/contacto': 'contact.title',
  '/privacidade': 'privacy.title',
  '/login': 'auth.loginTitle',
  '/registar': 'auth.registerTitle',
  '/area-reservada': 'auth.areaTitle',
  '/admin': 'auth.adminTitle',
  '/aguardar-aprovacao': 'auth.pendingTitle',
}

/** Rotas que não devem ser indexadas pelo Google */
const NOINDEX_ROUTES = ['/login', '/registar', '/area-reservada', '/admin', '/aguardar-aprovacao']

export default function PageTitle() {
  const { pathname } = useLocation()
  const { t } = useTranslation()
  const path = pathname || '/'

  useEffect(() => {
    const key = ROUTE_TITLES[path]
    if (key) {
      document.title = t(key) + TITLE_SUFFIX
    } else if (path === '/') {
      document.title = 'Navel - Açores | Máquinas, Ferramentas e Acessórios Industriais | Ponta Delgada'
    } else {
      document.title = t('notFound.title') + TITLE_SUFFIX
    }
  }, [path, t])

  useEffect(() => {
    let meta = document.querySelector('meta[name="robots"]')
    if (NOINDEX_ROUTES.includes(path)) {
      if (!meta) {
        meta = document.createElement('meta')
        meta.name = 'robots'
        document.head.appendChild(meta)
      }
      meta.content = 'noindex, nofollow'
    } else if (meta && meta.content === 'noindex, nofollow') {
      meta.content = 'index, follow'
    }
  }, [path])

  return null
}
