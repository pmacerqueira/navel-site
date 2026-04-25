/**
 * Mantém ?lng=en|es na URL quando o idioma não é PT (e remove quando é PT).
 * Permite hreflang / canonical distintos por língua sem refactor de rotas.
 */
import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LANG_Q, normalizeLangCode } from '../utils/langUrl'

export default function LangQuerySync() {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const { i18n } = useTranslation()
  const lang = normalizeLangCode(i18n.language)

  useEffect(() => {
    const params = new URLSearchParams(search)
    const cur = params.get(LANG_Q)
    let nextSearch = search

    if (lang === 'pt') {
      if (cur) {
        params.delete(LANG_Q)
        nextSearch = params.toString() ? `?${params.toString()}` : ''
      }
    } else if (cur !== lang) {
      params.set(LANG_Q, lang)
      nextSearch = `?${params.toString()}`
    }

    if (nextSearch !== search) {
      navigate({ pathname, search: nextSearch }, { replace: true })
    }
  }, [pathname, search, lang, navigate])

  return null
}
