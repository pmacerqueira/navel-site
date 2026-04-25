import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import pt from './locales/pt.json'
import { hasCookieConsent } from './utils/consent'
import { readLangParamFromSearch } from './utils/langUrl'

const LANG_KEY = 'navel-lang'
const SUPPORTED = ['pt', 'en', 'es']
const loaded = new Set(['pt'])

const lazyLocales = {
  en: () => import('./locales/en.json'),
  es: () => import('./locales/es.json'),
}

/** Código base (pt, en, es) — evita pt-PT vs pt e bandeira errada no switcher */
export function normalizeLanguage(lng) {
  if (!lng) return 'pt'
  const base = String(lng).split('-')[0].toLowerCase()
  return SUPPORTED.includes(base) ? base : 'pt'
}

function getInitialLanguage() {
  const fromUrl = typeof window !== 'undefined' ? readLangParamFromSearch() : null
  if (fromUrl) return fromUrl
  if (hasCookieConsent()) {
    const saved = localStorage.getItem(LANG_KEY)
    if (saved) {
      const n = normalizeLanguage(saved)
      if (SUPPORTED.includes(n)) return n
    }
  }
  const browser = navigator.language || navigator.userLanguage || ''
  const code = normalizeLanguage(browser)
  return SUPPORTED.includes(code) ? code : 'pt'
}

/**
 * Inicialização assíncrona: carrega o bundle do idioma preferido antes do 1.º render
 * (evita flash PT→EN e garante lng coerente com localStorage / browser).
 */
export async function initI18n() {
  const preferredLng = getInitialLanguage()

  const resources = { pt: { translation: pt } }
  if (preferredLng !== 'pt') {
    const mod = await lazyLocales[preferredLng]()
    resources[preferredLng] = { translation: mod.default }
    loaded.add(preferredLng)
  }

  await i18n.use(initReactI18next).init({
    resources,
    lng: preferredLng,
    fallbackLng: 'pt',
    supportedLngs: SUPPORTED,
    load: 'languageOnly',
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
  })

  document.documentElement.lang = normalizeLanguage(i18n.language)

  i18n.on('languageChanged', (lng) => {
    try {
      if (hasCookieConsent()) localStorage.setItem(LANG_KEY, normalizeLanguage(lng))
    } catch {
      /* ignore */
    }
    document.documentElement.lang = normalizeLanguage(lng)
  })

  if (typeof window !== 'undefined') {
    window.addEventListener('navel-cookies-accepted', () => {
      try {
        localStorage.setItem(LANG_KEY, normalizeLanguage(i18n.language))
      } catch {
        /* ignore */
      }
    })
  }
}

export async function changeLanguage(lng) {
  const target = normalizeLanguage(lng)
  if (target === normalizeLanguage(i18n.language)) return
  if (!loaded.has(target)) {
    const loader = lazyLocales[target]
    if (loader) {
      const mod = await loader()
      i18n.addResourceBundle(target, 'translation', mod.default)
      loaded.add(target)
    }
  }
  await i18n.changeLanguage(target)
}

export default i18n
