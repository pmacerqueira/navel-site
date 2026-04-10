/**
 * Shared constants for Navel website
 */

import {
  BOLAS_BETA_ACTION_2026_PDF,
  BOLAS_BETA_WORKER_2026_PDF,
} from './data/brands'

/** Dashboard de manutenções AT_Manut (app em www.navel.pt/manut/) */
export const MANUT_DASHBOARD_URL = 'https://navel.pt/manut/'

/** URLs dos sites oficiais dos fabricantes */
export const MILWAUKEE_URL = 'https://pt.milwaukeetool.eu/'
export const MILWAUKEE_DOWNLOADS_URL = 'https://pt.milwaukeetool.eu/downloads/'
export const BETA_URL = 'https://www.beta-tools.com/'
export const KAESER_URL = 'https://www.kaeser.com/'
/** XTOOLS — fornecedor que representamos; links diretos dos folhetos (página: xtools.pt/pt/catalogos/folhetos) */
const XTOOLS_BASE = 'https://xtools.pt/fileManager/catalogos'

/** Marcas + PDFs Bolas Beta — fonte única em src/data/brands.js */
export {
  BRAND_URLS,
  BRANDS_BY_CATEGORY,
  FOOTER_BRANDS,
  BROCHURES,
  BOLAS_BETA_TABELA_2026_PDF,
  BOLAS_BETA_ACTION_2026_PDF,
  BOLAS_BETA_WORKER_2026_PDF,
} from './data/brands'

/** Informação legal da empresa */
export const COMPANY_NIF = 'PT 512012962'
export const COMPANY_CAPITAL = '700.000,00 €'
export const LIVRO_RECLAMACOES_URL = 'https://www.livroreclamacoes.pt'

/** Contactos */
export const EMAIL_COMERCIAL = 'comercial@navel.pt'
/** Admin da área reservada (aprovação de utilizadores) */
export const ADMIN_EMAIL = 'comercial@navel.pt'
export const EMAIL_OFICINA = 'oficina@navel.pt'
/** WhatsApp — número principal */
export const WHATSAPP_PHONE = '351962086712'
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_PHONE}`

/**
 * tawk.to live chat — preencher após criar conta em https://www.tawk.to
 * Administration → Chat Widget → copiar Property ID e Widget ID
 * Se vazios, o widget não é carregado. Ver docs/TAWKTO-CHATBOT.md
 */
export const TAWK_PROPERTY_ID = import.meta.env.VITE_TAWK_PROPERTY_ID || ''
export const TAWK_WIDGET_ID = import.meta.env.VITE_TAWK_WIDGET_ID || ''

/** Coordenadas GPS para Maps / Street View */
export const CONTACT_LOCATIONS = [
  {
    lat: 37.778019,
    lng: -25.589581,
    mapsUrl: 'https://www.google.com/maps?q=37.778019,-25.589581',
  },
  {
    lat: 37.734603,
    lng: -25.678455,
    mapsUrl: 'https://www.google.com/maps?q=37.734603,-25.678455',
  },
]

export const CATEGORY_KEYS = [
  { name: 'products.cat1', desc: 'products.cat1Desc' },
  { name: 'products.cat2', desc: 'products.cat2Desc' },
  { name: 'products.cat3', desc: 'products.cat3Desc' },
  { name: 'products.cat4', desc: 'products.cat4Desc' },
  { name: 'products.cat5', desc: 'products.cat5Desc' },
  { name: 'products.cat6', desc: 'products.cat6Desc' },
  { name: 'products.cat7', desc: 'products.cat7Desc' },
]

export const PRODUCT_CATEGORY_SUBKEYS = CATEGORY_KEYS.map((c) => c.name)

/** IDs das categorias (índice no array CATEGORY_KEYS) */
export const CATEGORY_IDS = ['cat1', 'cat2', 'cat3', 'cat4', 'cat5', 'cat6', 'cat7']

export const NAV_ITEMS = [
  { path: '/', labelKey: 'nav.home' },
  { path: '/sobre', labelKey: 'nav.about' },
  {
    path: '/produtos',
    labelKey: 'nav.products',
    hasDropdown: true,
    subKeys: PRODUCT_CATEGORY_SUBKEYS,
  },
  { path: '/marcas', labelKey: 'nav.brands' },
  { path: '/servicos', labelKey: 'nav.services' },
  { path: '/catalogos', labelKey: 'nav.catalogs' },
  { path: '/contacto', labelKey: 'nav.contact' },
]

export const FOOTER_NAV = [
  { path: '/', key: 'nav.home' },
  { path: '/sobre', key: 'nav.about' },
  { path: '/produtos', key: 'nav.products' },
  { path: '/marcas', key: 'nav.brands' },
  { path: '/servicos', key: 'nav.services' },
  { path: '/catalogos', key: 'nav.catalogs' },
  { path: '/contacto', key: 'nav.contact' },
]

export const LANGUAGES = [
  { code: 'pt', labelKey: 'language.pt', flag: '/images/flags/pt.svg' },
  { code: 'en', labelKey: 'language.en', flag: '/images/flags/uk.svg' },
  { code: 'es', labelKey: 'language.es', flag: '/images/flags/es.svg' },
]

/** Campanhas em destaque na Home (Milwaukee + campanhas custom) */
export const HOME_CAMPAIGNS = [
  {
    brandKey: 'news.brandMilwaukee',
    titleKey: 'news.brochureMilwaukeeHDNQ1',
    src: '/images/campaigns/slide-milwaukee_HDN_Q1.jpg',
    brandColor: '#b90211',
    url: MILWAUKEE_DOWNLOADS_URL,
    urgencyKey: 'home.campaignUrgencyLimited',
  },
  {
    brandKey: 'home.campaignSolucoesBrand',
    titleKey: 'home.campaignSolucoesTitle',
    src: '/images/campaigns/solucoes-industria-2025-26.png',
    brandColor: '#ed6b21',
    url: '/catalogos/campanhas/solucoes-industria-2025-26.pdf',
    urgencyKey: 'home.campaignUrgencyValid2026',
  },
  {
    brandKey: 'news.brandBeta',
    titleKey: 'home.campaignBetaActionTitle',
    src: '/images/catalogos/beta/beta-action-2026.jpg',
    brandColor: '#ed6b21',
    url: BOLAS_BETA_ACTION_2026_PDF,
    urgencyKey: 'home.campaignUrgencyFebEnd',
  },
  {
    brandKey: 'news.brandBeta',
    titleKey: 'home.campaignBetaWorkerTitle',
    src: '/images/catalogos/beta/beta-worker-2026.jpg',
    brandColor: '#ed6b21',
    url: BOLAS_BETA_WORKER_2026_PDF,
    urgencyKey: 'home.campaignUrgencyBetaWorker',
  },
  {
    brandKey: 'news.brandTelwin',
    titleKey: 'home.campaignTelwinMagazineTitle',
    src: '/images/campaigns/magazine-telwin-2026.png',
    brandColor: '#e30613',
    url: '/catalogos/telwin/magazine-telwin-2026.pdf',
    urgencyKey: 'home.campaignUrgencyValid2026',
  },
  {
    brandKey: 'home.campaignPromoBrand',
    titleKey: 'home.campaignPromoFebTitle',
    src: '/images/campaigns/promo-fevereiro-2026.png',
    brandColor: '#e30613',
    url: '/catalogos/campanhas/promo-fevereiro-2026.pdf',
    urgencyKey: 'home.campaignUrgencyFeb',
  },
  {
    brandKey: 'home.xtoolsBrandUnicraft',
    titleKey: 'home.xtoolsFolhetoIluminacaoUnicraft',
    src: '/images/catalogos/xtools-folhetos/iluminacao-unicraft.jpg',
    brandColor: '#2c5282',
    url: `${XTOOLS_BASE}/pdf_pt_22.pdf`,
  },
  {
    brandKey: 'home.xtoolsBrandAircraft',
    titleKey: 'home.xtoolsFolhetoGeralAircraft',
    src: '/images/catalogos/xtools-folhetos/folheto-aircraft.jpg',
    brandColor: '#2c5282',
    url: `${XTOOLS_BASE}/pdf_pt_19.pdf`,
  },
  {
    brandKey: 'home.xtoolsBrandOptimum',
    titleKey: 'home.xtoolsFolhetoGeralOptimum',
    src: '/images/catalogos/xtools-folhetos/folheto-optimum.png',
    brandColor: '#2c5282',
    url: `${XTOOLS_BASE}/pdf_pt_20.pdf`,
  },
  {
    brandKey: 'home.xtoolsBrandMetallkraft',
    titleKey: 'home.xtoolsFolhetoGeralMetallkraft',
    src: '/images/catalogos/xtools-folhetos/folheto-metallkraft.png',
    brandColor: '#2c5282',
    url: `${XTOOLS_BASE}/pdf_pt_21.pdf`,
  },
]

/** Slides do carrossel da Home: 3 logos + campanhas atuais */
export const HERO_SLIDES = [
  { src: '/images/brands/milwaukee-logo.png', altKey: 'hero.slideMilwaukee', href: MILWAUKEE_URL },
  { src: '/images/brands/beta.png', altKey: 'hero.slideBeta', href: BETA_URL, backgroundImage: '/images/beta-bg.png' },
  { src: '/images/brands/kaeser.png', altKey: 'hero.slideKaeser', href: KAESER_URL, backgroundImage: '/images/kaeser-bg.png' },
  { src: '/images/campaigns/slide-milwaukee_HDN_Q1.jpg', altKey: 'news.brochureMilwaukeeHDNQ1', href: MILWAUKEE_DOWNLOADS_URL },
  { src: '/images/campaigns/solucoes-industria-2025-26.png', altKey: 'home.campaignSolucoesTitle', href: '/catalogos/campanhas/solucoes-industria-2025-26.pdf' },
  { src: '/images/catalogos/beta/beta-action-2026.jpg', altKey: 'home.campaignBetaActionTitle', href: BOLAS_BETA_ACTION_2026_PDF },
  { src: '/images/catalogos/beta/beta-worker-2026.jpg', altKey: 'home.campaignBetaWorkerTitle', href: BOLAS_BETA_WORKER_2026_PDF },
  { src: '/images/campaigns/magazine-telwin-2026.png', altKey: 'home.campaignTelwinMagazineTitle', href: '/catalogos/telwin/magazine-telwin-2026.pdf' },
  { src: '/images/campaigns/promo-fevereiro-2026.png', altKey: 'home.campaignPromoFebTitle', href: '/catalogos/campanhas/promo-fevereiro-2026.pdf' },
  { src: '/images/catalogos/xtools-folhetos/iluminacao-unicraft.jpg', altKey: 'home.xtoolsFolhetoIluminacaoUnicraft', href: `${XTOOLS_BASE}/pdf_pt_22.pdf` },
  { src: '/images/catalogos/xtools-folhetos/folheto-aircraft.jpg', altKey: 'home.xtoolsFolhetoGeralAircraft', href: `${XTOOLS_BASE}/pdf_pt_19.pdf` },
  { src: '/images/catalogos/xtools-folhetos/folheto-optimum.png', altKey: 'home.xtoolsFolhetoGeralOptimum', href: `${XTOOLS_BASE}/pdf_pt_20.pdf` },
  { src: '/images/catalogos/xtools-folhetos/folheto-metallkraft.png', altKey: 'home.xtoolsFolhetoGeralMetallkraft', href: `${XTOOLS_BASE}/pdf_pt_21.pdf` },
]
