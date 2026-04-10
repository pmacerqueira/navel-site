/**
 * Registo central de marcas — organizado por categorias pré-definidas.
 *
 * CATEGORIAS: pré-definidas abaixo. Podem ser atualizadas ou criadas novas.
 * Para cada marca, informe a(s) categoria(s) onde será inserida.
 *
 * Para adicionar uma nova marca:
 * 1. Coloque o logotipo em public/images/brands/ (ex: nova-marca.webp)
 * 2. Adicione a BRAND_DEFINITIONS: id, name, logo, url (e opcionais)
 * 3. Adicione o id à(s) categoria(s) em BRANDS_BY_CATEGORY_IDS
 *
 * Catálogos: prefira alojar PDFs em public/catalogos/ (catalogPdf) e comprimi-los.
 * Só use downloadUrl externo se for site oficial do fabricante (evitar distribuidores/concorrentes).
 * Domínios considerados fabricante em MANUFACTURER_DOMAINS.
 *
 * Todas as marcas aparecem automaticamente na barra animada do rodapé.
 */

/** Domínios de sites oficiais de fabricantes — apenas estes são aceites como link externo para catálogos */
const MANUFACTURER_DOMAINS = [
  'milwaukeetool.eu',
  'milwaukeetool.com',
  'beta-tools.com',
  'aeg-powertools.eu',
  'kingtony.com',
  'mykingtony.com',
  'telwin.com',
  'kaeser.com',
  'kranzle.com',
  'skf.com',
  'toptul.com',
  'rodcraft.com',
  'cutwithlenox.com',
  'stanley.com',
  'kemppi.com',
  'chicagopneumatic.com',
  'istobal.com',
  'electroportugal.com',
  'ryobitools.eu',
  'schaeffler.com',
  'kroftools.com',
  'facom.com',
]

function isManufacturerUrl(url) {
  if (!url || typeof url !== 'string') return false
  try {
    const host = new URL(url).hostname.toLowerCase()
    return MANUFACTURER_DOMAINS.some((d) => host === d || host.endsWith('.' + d))
  } catch {
    return false
  }
}

/* =============================================================================
   CATEGORIAS PRÉ-DEFINIDAS
   cat1=Ferramentas elétricas, cat2=Equipamentos Industriais, cat3=Rolamentos,
   cat4=Soldadura, cat5=Ferramenta manual, cat6=Instrumentação, cat7=EPI,
   outras=Outras marcas
   (Para novas categorias: adicionar aqui e em constants.js CATEGORY_KEYS/IDS)
   ============================================================================= */

/* =============================================================================
   DEFINIÇÕES DE CADA MARCA
   id, name, logo, url — obrigatórios para marcas com link
   downloadUrl, brochure — opcionais
   ============================================================================= */
const BRAND_DEFINITIONS = {
  milwaukee: {
    name: 'Milwaukee Tools',
    logo: '/images/brands/milwaukee-logo.png',
    url: 'https://pt.milwaukeetool.eu/',
    downloadUrl: 'https://pt.milwaukeetool.eu/downloads/',
    brochure: {
      brandKey: 'news.brandMilwaukee',
      titleKey: 'news.brochureMilwaukeeHDNQ1',
      imageSrc: '/images/campaigns/slide-milwaukee_HDN_Q1.jpg',
      brandColor: '#b90211',
    },
  },
  beta: {
    name: 'Beta Tools',
    logo: '/images/brands/beta.png',
    url: 'https://www.beta-tools.com/',
    brochure: {
      brandKey: 'news.brandBeta',
      titleKey: 'news.brochureBeta1',
      imageSrc: '/images/brands/beta.png',
      brandColor: '#003366',
    },
  },
  facom: {
    name: 'Facom',
    logo: '/images/brands/facom.png',
    url: 'https://www.facom.com/',
  },
  aeg: {
    name: 'AEG',
    logo: '/images/brands/aeg-logo.png',
    url: 'https://www.aeg-powertools.eu/pt-pt',
    brochure: {
      brandKey: 'news.brandAeg',
      titleKey: 'news.brochureAeg1',
      imageSrc: '/images/brands/aeg-logo.png',
      brandColor: '#ed6b21',
    },
  },
  kingtony: {
    name: 'King Tony',
    logo: '/images/brands/kingtony-logo.png',
    url: 'https://www.kingtony.com/',
    downloadUrl: 'https://extranet.mykingtony.com/Shared/Offers/2025-KT-40th_and_NEWS/2025-KT-40th_AND_NEW-EN-euros.pdf',
    brochure: {
      brandKey: 'news.brandKingTony',
      titleKey: 'news.brochureKingTony1',
      imageSrc: '/images/brands/kingtony-logo.png',
      brandColor: '#c41e2a',
    },
  },
  telwin: {
    name: 'Telwin',
    logo: '/images/brands/telwin.webp',
    url: 'https://www.telwin.com/',
    brochure: {
      brandKey: 'news.brandTelwin',
      titleKey: 'home.campaignTelwinMagazineTitle',
      imageSrc: '/images/campaigns/magazine-telwin-2026.png',
      brandColor: '#e30613',
      catalogPdf: 'telwin/magazine-telwin-2026.pdf',
    },
  },
  kaeser: {
    name: 'Kaeser Compressors',
    logo: '/images/brands/kaeser.png',
    url: 'https://www.kaeser.com/',
  },
  eurotrod: {
    name: 'Eurotrod',
    logo: '/images/brands/eurotrod.webp',
    url: 'https://www.electroportugal.com/index.php?id=12',
  },
  kranzle: {
    name: 'Kranzle',
    logo: '/images/brands/kranzle.webp',
    url: 'https://www.kranzle.com/',
  },
  ryobi: {
    name: 'Ryobi',
    logo: '/images/brands/ryobi-logo.png',
    url: 'https://www.ryobitools.eu/',
  },
  skf: {
    name: 'SKF',
    logo: '/images/brands/skf.webp',
    url: 'https://www.skf.com/',
  },
  toptul: {
    name: 'TopTul',
    logo: '/images/brands/toptul.webp',
    url: 'https://www.toptul.com/',
  },
  rodcraft: {
    name: 'Rodcraft',
    logo: '/images/brands/rodcraft.webp',
    url: 'https://www.rodcraft.com/',
  },
  lenox: {
    name: 'Lenox',
    logo: '/images/brands/lenox.webp',
    url: 'https://www.cutwithlenox.com/',
  },
  stanley: {
    name: 'Stanley',
    logo: '/images/brands/stanley.webp',
    url: 'https://www.stanley.com/',
  },
  kroftools: {
    name: 'KrofTools',
    logo: '/images/brands/kroftools.webp',
    url: 'https://www.kroftools.com/',
  },
  ina: {
    name: 'INA Schaeffler',
    logo: '/images/brands/ina-schaeffler-logo.png',
    url: 'https://www.schaeffler.com/',
  },
  kemppi: {
    name: 'Kemppi',
    logo: '/images/brands/kemppi-logo.png',
    url: 'https://www.kemppi.com/',
  },
  chicagopneumatic: {
    name: 'Chicago Pneumatic',
    logo: '/images/brands/chicagopneumatic-logo.png',
    url: 'https://www.chicagopneumatic.com/',
  },
  istobal: {
    name: 'Istobal',
    logo: '/images/brands/istobal.png',
    url: 'https://www.istobal.com/',
  },
  limge: { name: 'Limge', logo: '/images/brands/limge.svg', url: null },
  cleancraft: { name: 'Cleancraft', logo: '/images/brands/cleancraft.png', url: 'https://xtools.pt/pt/catalogos/folhetos' },
  aircraft: { name: 'Aircraft', logo: '/images/brands/aircraft.png', url: 'https://xtools.pt/pt/catalogos/folhetos' },
  schweisscraft: { name: 'Schweisscraft', logo: '/images/brands/schweisscraft.png', url: 'https://xtools.pt/pt/catalogos/folhetos' },
  optimum: { name: 'Optimum', logo: '/images/brands/optimum.png', url: 'https://xtools.pt/pt/catalogos/folhetos' },
  metallkraft: { name: 'Metallkraft', logo: '/images/catalogos/xtools/metallkraft.svg', url: 'https://xtools.pt/pt/catalogos/folhetos' },
  unicraft: { name: 'Unicraft', logo: '/images/brands/unicraft.png', url: 'https://xtools.pt/pt/catalogos/folhetos' },
  holzkraft: { name: 'Holzkraft', logo: '/images/brands/holzkraft.png', url: 'https://xtools.pt/pt/catalogos/folhetos' },
  metrica: { name: 'Metrica', logo: '/images/brands/metrica.svg', url: null },
  climax: { name: 'Climax', logo: '/images/brands/climax.svg', url: null },
  personna: { name: 'Personna', logo: '/images/brands/personna.svg', url: null },
  samoa: { name: 'Samoa', logo: '/images/brands/samoa.svg', url: null },
  raasm: { name: 'Raasm', logo: '/images/brands/raasm.svg', url: null },
  orapi: { name: 'Orapi', logo: '/images/brands/orapi.svg', url: null },
  vmd: { name: 'VMD', logo: '/images/brands/vmd.svg', url: null },
  ecoservice: { name: 'EcoService', logo: '/images/brands/ecoservice.svg', url: null },
}

/* =============================================================================
   MARCAS POR CATEGORIA
   Para cada marca, informe a(s) categoria(s) onde será inserida.
   cat1=Ferramentas elétricas, cat2=Equipamentos Industriais, cat3=Rolamentos,
   cat4=Soldadura, cat5=Ferramenta manual, cat6=Instrumentação, cat7=EPI,
   outras=Outras marcas
   ============================================================================= */
const BRANDS_BY_CATEGORY_IDS = {
  cat1: ['milwaukee', 'aeg', 'ryobi'],
  cat2: ['kranzle', 'istobal', 'limge', 'cleancraft', 'kaeser', 'aircraft'],
  cat3: ['skf', 'ina'],
  cat4: ['eurotrod', 'kemppi', 'telwin', 'schweisscraft'],
  cat5: ['beta', 'facom', 'kingtony', 'toptul', 'rodcraft', 'chicagopneumatic'],
  cat6: ['milwaukee', 'skf', 'metrica'],
  cat7: ['milwaukee', 'beta', 'climax', 'personna'],
  outras: ['samoa', 'raasm', 'orapi', 'vmd', 'ecoservice', 'optimum', 'metallkraft', 'unicraft', 'holzkraft'],
}

/* =============================================================================
   DADOS DERIVADOS (não editar)
   ============================================================================= */

/** Ordem das marcas em destaque (primeira linha): Milwaukee, Beta, SKF, AEG, Ryobi, King Tony */
const BRANDS_FEATURED_ORDER = ['milwaukee', 'beta', 'facom', 'skf', 'aeg', 'ryobi', 'kingtony']

/** Lista plana de marcas com id (para página Marcas, rodapé, etc.) — ordenada: destaque primeiro, depois alfabético */
export const BRANDS = Object.entries(BRAND_DEFINITIONS)
  .map(([id, def]) => ({ id, ...def }))
  .sort((a, b) => {
    const indexA = BRANDS_FEATURED_ORDER.indexOf(a.id)
    const indexB = BRANDS_FEATURED_ORDER.indexOf(b.id)
    if (indexA !== -1 && indexB !== -1) return indexA - indexB
    if (indexA !== -1) return -1
    if (indexB !== -1) return 1
    return a.name.localeCompare(b.name)
  })

/** Mapa nome → URL (para categorias de produtos) */
export const BRAND_URLS = Object.fromEntries(
  BRANDS.filter((b) => b.url).map((b) => [b.name, b.url])
)

/** Marcas por categoria — nomes para a página Produtos */
export const BRANDS_BY_CATEGORY = Object.fromEntries(
  Object.entries(BRANDS_BY_CATEGORY_IDS).map(([catId, ids]) => [
    catId,
    ids.map((id) => BRAND_DEFINITIONS[id]?.name).filter(Boolean),
  ])
)

/** Marcas para o carrossel do rodapé */
export const FOOTER_BRANDS = BRANDS.map((b) => ({
  name: b.name,
  src: b.logo,
  url: b.url || null,
}))

/** Catálogos Milwaukee adicionais (PDFs alojados localmente) */
const MILWAUKEE_CATALOG_ITEMS = [
  { titleKey: 'catalogs.milwaukeePromo2026', catalogPdf: 'milwaukee/catalogo-promocoes-2026.pdf' },
  { titleKey: 'catalogs.milwaukeeAcessorios2026', catalogPdf: 'milwaukee/catalogo-acessorios-2026.pdf' },
  { titleKey: 'catalogs.milwaukeeFerramentaManual2025', catalogPdf: 'milwaukee/catalogo-ferramenta-manual-armazenamento-2025.pdf' },
  { titleKey: 'catalogs.milwaukeeEpis2025', catalogPdf: 'milwaukee/catalogo-epis-2025.pdf' },
]

const MILWAUKEE_BRAND = {
  brandKey: 'news.brandMilwaukee',
  fallbackLogo: '/images/brands/milwaukee-logo.png',
  fallbackBrand: 'Milwaukee Tools',
  brandColor: '#b90211',
}

/**
 * Catálogos Beta via Bolas (banner 165): block2 = tabela; block3 + file271 = Action; block4 + file224 = Worker.
 * C45/RSC50: PDF local + thumbnail em public/.
 */
/** PDFs Bolas; capas em public/images/catalogos/beta/ (script download-beta-thumbnails.js) */
export const BOLAS_BETA_TABELA_2026_PDF =
  'https://www.bolas.pt/downloads/file275_pt.pdf?cbid=165&cbida=2'
export const BOLAS_BETA_ACTION_2026_PDF =
  'https://www.bolas.pt/downloads/file271_pt.pdf?cbid=165&cbida=3'
export const BOLAS_BETA_WORKER_2026_PDF =
  'https://www.bolas.pt/downloads/file224_pt.pdf?eidb=141&eidbp=200&cbid=165&cbida=4'

const BETA_CATALOG_ITEMS = [
  {
    titleKey: 'catalogs.betaTabelaPrecos2026',
    url: BOLAS_BETA_TABELA_2026_PDF,
    imageSrc: '/images/catalogos/beta/beta-tabela-precos-2026.jpg',
  },
  {
    titleKey: 'catalogs.betaAction2026',
    url: BOLAS_BETA_ACTION_2026_PDF,
    imageSrc: '/images/catalogos/beta/beta-action-2026.jpg',
  },
  {
    titleKey: 'catalogs.betaWorker2026',
    url: BOLAS_BETA_WORKER_2026_PDF,
    imageSrc: '/images/catalogos/beta/beta-worker-2026.jpg',
  },
  { titleKey: 'catalogs.betaC45Pro20', catalogPdf: 'beta/catalogo-c45pro-2-0.pdf', imageSrc: '/images/catalogos/beta/catalogo-c45pro-2-0.webp' },
  { titleKey: 'catalogs.betaRSC5020', catalogPdf: 'beta/catalogo-rsc50-2-0.pdf', imageSrc: '/images/catalogos/beta/catalogo-rsc50-2-0.webp' },
]

const BETA_BRAND = {
  brandKey: 'news.brandBeta',
  fallbackLogo: '/images/brands/beta.png',
  fallbackBrand: 'Beta Tools',
  brandColor: '#003366',
}

/** Catálogos Facom (PDFs alojados localmente; thumbnails em public/images/catalogos/facom/) */
const FACOM_CATALOG_ITEMS = [
  { titleKey: 'catalogs.facom2025', catalogPdf: 'facom/catalogo-facom-2025.pdf', imageSrc: '/images/catalogos/facom/catalogo-facom-2025.webp' },
  { titleKey: 'catalogs.facomJetline', catalogPdf: 'facom/catalogo-jetline-2023.pdf', imageSrc: '/images/catalogos/facom/catalogo-jetline.webp' },
  { titleKey: 'catalogs.facomRollWorkshop', catalogPdf: 'facom/catalogo-roll-workshop-system.pdf', imageSrc: '/images/catalogos/facom/catalogo-roll-workshop.webp' },
  { titleKey: 'catalogs.facomNovidades', catalogPdf: 'facom/catalogo-facom-novidades.pdf', imageSrc: '/images/catalogos/facom/catalogo-facom-novidades.webp' },
  { titleKey: 'catalogs.facomMatrix', catalogPdf: 'facom/catalogo-facom-matrix.pdf', imageSrc: '/images/catalogos/facom/catalogo-facom-matrix.webp' },
]

const FACOM_BRAND = {
  brandKey: 'news.brandFacom',
  fallbackLogo: '/images/brands/facom.png',
  fallbackBrand: 'Facom',
  brandColor: '#003366',
}

/** Catálogos XTOOLS — Catálogo Resumo (7 marcas); thumbnails em public/images/catalogos/xtools-resumo/ */
const XTOOLS_CATALOGO_RESUMO_URL = 'https://xtools.pt/pt/catalogos/catalogo-resumo'
const XTOOLS_CATALOG_ITEMS = [
  { brandKey: 'catalogs.xtoolsBrandAircraft', titleKey: 'catalogs.xtoolsTitleAircraft', imageSrc: '/images/catalogos/xtools-resumo/aircraft-resumo.jpg', fallbackLogo: '/images/brands/aircraft.png', fallbackBrand: 'Aircraft', url: XTOOLS_CATALOGO_RESUMO_URL },
  { brandKey: 'catalogs.xtoolsBrandOptimum', titleKey: 'catalogs.xtoolsTitleOptimum', imageSrc: '/images/catalogos/xtools-resumo/optimum-resumo.jpg', fallbackLogo: '/images/brands/optimum.png', fallbackBrand: 'Optimum', url: XTOOLS_CATALOGO_RESUMO_URL },
  { brandKey: 'catalogs.xtoolsBrandMetallkraft', titleKey: 'catalogs.xtoolsTitleMetallkraft', imageSrc: '/images/catalogos/xtools-resumo/metallkraft-resumo.jpg', fallbackLogo: '/images/catalogos/xtools/metallkraft.svg', fallbackBrand: 'Metallkraft', url: XTOOLS_CATALOGO_RESUMO_URL },
  { brandKey: 'catalogs.xtoolsBrandUnicraft', titleKey: 'catalogs.xtoolsTitleUnicraft', imageSrc: '/images/catalogos/xtools-resumo/unicraft-resumo.jpg', fallbackLogo: '/images/brands/unicraft.png', fallbackBrand: 'Unicraft', url: XTOOLS_CATALOGO_RESUMO_URL },
  { brandKey: 'catalogs.xtoolsBrandHolzkraft', titleKey: 'catalogs.xtoolsTitleHolzkraft', imageSrc: '/images/catalogos/xtools-resumo/holzkraft-resumo.jpg', fallbackLogo: '/images/brands/holzkraft.png', fallbackBrand: 'Holzkraft', url: XTOOLS_CATALOGO_RESUMO_URL },
  { brandKey: 'catalogs.xtoolsBrandSchweisskraft', titleKey: 'catalogs.xtoolsTitleSchweisskraft', imageSrc: '/images/catalogos/xtools-resumo/schweisskraft-resumo.jpg', fallbackLogo: '/images/brands/schweisscraft.png', fallbackBrand: 'Schweisskraft', url: XTOOLS_CATALOGO_RESUMO_URL },
  { brandKey: 'catalogs.xtoolsBrandCleancraft', titleKey: 'catalogs.xtoolsTitleCleancraft', imageSrc: '/images/catalogos/xtools-resumo/cleancraft-resumo.jpg', fallbackLogo: '/images/brands/cleancraft.png', fallbackBrand: 'Cleancraft', url: XTOOLS_CATALOGO_RESUMO_URL },
]

/** Folhetos/catálogos para a página Catálogos. Beta, Facom e Milwaukee têm listas próprias; XTOOLS usa links externos; os restantes vêm das marcas. */
const brochuresFromBrands = BRANDS.filter((b) => b.brochure && b.id !== 'beta')
  .map((b) => {
    const localPath = b.brochure.catalogPdf
    const externalUrl = localPath ? null : (isManufacturerUrl(b.downloadUrl) ? b.downloadUrl : (isManufacturerUrl(b.url) ? b.url : null))
    const url = localPath ? `/catalogos/${localPath}` : externalUrl
    return {
      brandKey: b.brochure.brandKey,
      titleKey: b.brochure.titleKey,
      src: b.brochure.imageSrc,
      fallbackLogo: b.logo,
      fallbackBrand: b.name,
      brandColor: b.brochure.brandColor,
      url,
    }
  })
  .filter((b) => b.url)

const milwaukeeExtraItems = MILWAUKEE_CATALOG_ITEMS.map((item) => ({
  brandKey: MILWAUKEE_BRAND.brandKey,
  titleKey: item.titleKey,
  src: MILWAUKEE_BRAND.fallbackLogo,
  fallbackLogo: MILWAUKEE_BRAND.fallbackLogo,
  fallbackBrand: MILWAUKEE_BRAND.fallbackBrand,
  brandColor: MILWAUKEE_BRAND.brandColor,
  url: `/catalogos/${item.catalogPdf}`,
}))

const betaExtraItems = BETA_CATALOG_ITEMS.map((item) => ({
  brandKey: BETA_BRAND.brandKey,
  titleKey: item.titleKey,
  src: item.imageSrc || BETA_BRAND.fallbackLogo,
  fallbackLogo: BETA_BRAND.fallbackLogo,
  fallbackBrand: BETA_BRAND.fallbackBrand,
  brandColor: BETA_BRAND.brandColor,
  url: item.url ?? `/catalogos/${item.catalogPdf}`,
}))

const facomExtraItems = FACOM_CATALOG_ITEMS.map((item) => ({
  brandKey: FACOM_BRAND.brandKey,
  titleKey: item.titleKey,
  src: item.imageSrc || FACOM_BRAND.fallbackLogo,
  fallbackLogo: FACOM_BRAND.fallbackLogo,
  fallbackBrand: FACOM_BRAND.fallbackBrand,
  brandColor: FACOM_BRAND.brandColor,
  url: `/catalogos/${item.catalogPdf}`,
}))

const xtoolsCatalogItems = XTOOLS_CATALOG_ITEMS.map((item) => ({
  brandKey: item.brandKey,
  titleKey: item.titleKey,
  src: item.imageSrc,
  fallbackLogo: item.fallbackLogo || item.imageSrc,
  fallbackBrand: item.fallbackBrand,
  brandColor: '#2c5282',
  url: item.url,
}))

const allBrochures = [...brochuresFromBrands, ...milwaukeeExtraItems, ...betaExtraItems, ...facomExtraItems, ...xtoolsCatalogItems]

function brochureSortOrder (a, b) {
  const nameA = a.fallbackBrand || ''
  const nameB = b.fallbackBrand || ''
  const isMilwaukee = (name) => name === 'Milwaukee Tools'
  const isBeta = (name) => name === 'Beta Tools'
  const isFacom = (name) => name === 'Facom'
  if (isMilwaukee(nameA) && !isMilwaukee(nameB)) return -1
  if (!isMilwaukee(nameA) && isMilwaukee(nameB)) return 1
  if (isBeta(nameA) && !isBeta(nameB)) return -1
  if (!isBeta(nameA) && isBeta(nameB)) return 1
  if (isFacom(nameA) && !isFacom(nameB)) return -1
  if (!isFacom(nameA) && isFacom(nameB)) return 1
  return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' })
}

export const BROCHURES = [...allBrochures].sort(brochureSortOrder)
