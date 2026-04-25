/**
 * SEO e título do documento por rota: title, meta description, canonical,
 * hreflang (?lng=), Open Graph (og:locale), Twitter Card, BreadcrumbList JSON-LD,
 * robots (noindex em área reservada).
 */
import { Helmet } from 'react-helmet-async'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  absoluteUrlForLang,
  CANONICAL_ORIGIN,
  OG_LOCALE_BY_LANG,
  normalizeLangCode,
} from '../utils/langUrl'

const OG_IMAGE = `${CANONICAL_ORIGIN}/images/og-image.png`
const LEGAL_NAME = 'José Gonçalves Cerqueira (NAVEL-AÇORES), Lda.'
const HOME_TITLE = `${LEGAL_NAME} | Máquinas, Ferramentas e Acessórios Industriais | Ponta Delgada`

const TITLE_SUFFIX = ` | ${LEGAL_NAME} | Ponta Delgada`

const ROUTE_CONFIG = {
  '/': { titleMode: 'home', descriptionKey: 'seo.homeDescription' },
  '/sobre': { titleKey: 'about.title', descriptionKey: 'about.lead' },
  '/produtos': { titleKey: 'products.title', descriptionKey: 'products.lead' },
  '/marcas': { titleKey: 'brands.title', descriptionKey: 'brands.lead' },
  '/milwaukee': { titleKey: 'milwaukee.title', descriptionKey: 'milwaukee.lead' },
  '/istobal': { titleKey: 'istobal.title', descriptionKey: 'istobal.lead' },
  '/servicos': { titleKey: 'services.title', descriptionKey: 'services.lead' },
  '/catalogos': { titleKey: 'catalogs.title', descriptionKey: 'catalogs.lead' },
  '/contacto': { titleKey: 'contact.title', descriptionKey: 'contact.lead' },
  '/privacidade': { titleKey: 'privacy.title', descriptionKey: 'privacy.lead' },
  '/rgpd': { titleKey: 'rgpd.title', descriptionKey: 'rgpd.lead' },
  '/condicoes-gerais': { titleKey: 'cgvs.title', descriptionKey: 'cgvs.lead' },
  '/login': { titleKey: 'auth.loginTitle', descriptionKey: 'auth.loginLead' },
  '/registar': { titleKey: 'auth.registerTitle', descriptionKey: 'auth.registerLead' },
  '/area-reservada': { titleKey: 'auth.areaTitle', descriptionKey: 'auth.areaLead' },
  '/admin': { titleKey: 'auth.adminTitle', descriptionKey: 'auth.adminLead' },
  '/aguardar-aprovacao': { titleKey: 'auth.pendingTitle', descriptionKey: 'auth.pendingText' },
}

const NOINDEX_ROUTES = new Set([
  '/login',
  '/registar',
  '/area-reservada',
  '/admin',
  '/aguardar-aprovacao',
])

function breadcrumbJsonLd(pathname, config, t, lang) {
  if (!config || config.titleMode === 'home' || !config.titleKey) return null
  const n = normalizeLangCode(lang)
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: t('nav.home'),
        item: absoluteUrlForLang('/', n),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: t(config.titleKey),
        item: absoluteUrlForLang(pathname, n),
      },
    ],
  }
}

export default function PageTitle() {
  const { pathname } = useLocation()
  const { t, i18n } = useTranslation()
  const path = pathname || '/'
  const config = ROUTE_CONFIG[path]
  const isNoIndex = NOINDEX_ROUTES.has(path)
  const lang = normalizeLangCode(i18n.language)

  const fullTitle = config
    ? config.titleMode === 'home'
      ? HOME_TITLE
      : `${t(config.titleKey)}${TITLE_SUFFIX}`
    : `${t('notFound.title')}${TITLE_SUFFIX}`

  const description = config ? t(config.descriptionKey) : t('seo.notFoundDescription')
  const robotsContent = isNoIndex ? 'noindex, nofollow' : 'index, follow'
  const canonical = absoluteUrlForLang(path, lang)

  const hrefPt = absoluteUrlForLang(path, 'pt')
  const hrefEn = absoluteUrlForLang(path, 'en')
  const hrefEs = absoluteUrlForLang(path, 'es')
  const hrefXDefault = hrefPt

  const ogLocale = OG_LOCALE_BY_LANG[lang] || OG_LOCALE_BY_LANG.pt
  const ogLocaleAlternates = Object.entries(OG_LOCALE_BY_LANG)
    .filter(([code]) => code !== lang)
    .map(([, loc]) => loc)

  const crumbs = !isNoIndex ? breadcrumbJsonLd(path, config, t, lang) : null

  return (
    <Helmet prioritizeSeoTags>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robotsContent} />
      <link rel="canonical" href={canonical} />
      {!isNoIndex && (
        <>
          <link rel="alternate" hrefLang="pt" href={hrefPt} />
          <link rel="alternate" hrefLang="en" href={hrefEn} />
          <link rel="alternate" hrefLang="es" href={hrefEs} />
          <link rel="alternate" hrefLang="x-default" href={hrefXDefault} />
        </>
      )}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonical} />
      <meta property="og:locale" content={ogLocale} />
      {ogLocaleAlternates.map((loc) => (
        <meta key={loc} property="og:locale:alternate" content={loc} />
      ))}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={OG_IMAGE} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta
        property="og:image:alt"
        content={`${LEGAL_NAME} | Máquinas, ferramentas e equipamentos industriais | Ponta Delgada, Açores`}
      />
      <meta property="og:site_name" content={LEGAL_NAME} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={OG_IMAGE} />
      <meta
        name="twitter:image:alt"
        content={`${LEGAL_NAME} | Máquinas, ferramentas e equipamentos industriais | Ponta Delgada`}
      />
      {crumbs && (
        <script type="application/ld+json">{JSON.stringify(crumbs)}</script>
      )}
    </Helmet>
  )
}
