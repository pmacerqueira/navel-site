import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import pt from './locales/pt.json'
import { hasCookieConsent } from './utils/consent'

const LANG_KEY = 'navel-lang'
const SUPPORTED = ['pt', 'en', 'es']
const loaded = new Set(['pt'])

/** Lazy loaders: apenas en/es (pt já está no bundle principal) */
const lazyLocales = {
  en: () => import('./locales/en.json'),
  es: () => import('./locales/es.json'),
}

function getInitialLanguage() {
  if (hasCookieConsent()) {
    const saved = localStorage.getItem(LANG_KEY)
    if (saved && SUPPORTED.includes(saved)) return saved
  }
  const browser = navigator.language || navigator.userLanguage || ''
  const code = browser.split('-')[0].toLowerCase()
  return SUPPORTED.includes(code) ? code : 'pt'
}

const preferredLng = getInitialLanguage()

i18n
  .use(initReactI18next)
  .init({
    resources: { pt: { translation: pt } },
    lng: 'pt',
    fallbackLng: 'pt',
    supportedLngs: SUPPORTED,
    interpolation: { escapeValue: false },
  })

i18n.on('languageChanged', (lng) => {
  try {
    if (hasCookieConsent()) localStorage.setItem(LANG_KEY, lng)
  } catch {}
  document.documentElement.lang = lng
})

document.documentElement.lang = i18n.language

if (typeof window !== 'undefined') {
  window.addEventListener('navel-cookies-accepted', () => {
    try {
      localStorage.setItem(LANG_KEY, i18n.language)
    } catch {}
  })
}

if (preferredLng !== 'pt') {
  lazyLocales[preferredLng]?.()
    .then((mod) => {
      i18n.addResourceBundle(preferredLng, 'translation', mod.default)
      loaded.add(preferredLng)
      i18n.changeLanguage(preferredLng)
    })
    .catch(() => { /* fallback para pt já carregado */ })
}

export async function changeLanguage(lng) {
  if (lng === i18n.language) return
  if (!loaded.has(lng)) {
    const loader = lazyLocales[lng]
    if (loader) {
      const mod = await loader()
      i18n.addResourceBundle(lng, 'translation', mod.default)
      loaded.add(lng)
    }
  }
  await i18n.changeLanguage(lng)
}

export default i18n
