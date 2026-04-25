/** Canonical origin and ?lng= helpers for SEO (hreflang, canonical, sitemap). */
export const CANONICAL_ORIGIN = 'https://navel.pt'
export const LANG_Q = 'lng'

const SUPPORTED = new Set(['pt', 'en', 'es'])

export function normalizeLangCode(lng) {
  if (!lng) return 'pt'
  const base = String(lng).split('-')[0].toLowerCase()
  return SUPPORTED.has(base) ? base : 'pt'
}

/** Read ?lng= from a search string or window.location.search */
export function readLangParamFromSearch(searchString) {
  const raw =
    typeof searchString === 'string'
      ? searchString
      : typeof window !== 'undefined'
        ? window.location.search
        : ''
  if (!raw) return null
  const q = new URLSearchParams(raw.startsWith('?') ? raw.slice(1) : raw).get(LANG_Q)
  if (!q) return null
  const base = String(q).split('-')[0].toLowerCase()
  return SUPPORTED.has(base) ? base : null
}

/** Absolute URL for path + language (pt = URL limpa sem ?lng). */
export function absoluteUrlForLang(pathname, langCode) {
  const p = !pathname || pathname === '/' ? '/' : pathname
  const pathPart = p === '/' ? '/' : p
  const base = `${CANONICAL_ORIGIN}${pathPart}`
  const n = normalizeLangCode(langCode)
  if (n === 'pt') return base
  const sep = base.includes('?') ? '&' : '?'
  return `${base}${sep}${LANG_Q}=${n}`
}

export const OG_LOCALE_BY_LANG = {
  pt: 'pt_PT',
  en: 'en_GB',
  es: 'es_ES',
}
