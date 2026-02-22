/**
 * tawk.to live chat — carrega o script apenas após consentimento de cookies (RGPD).
 * Requer TAWK_PROPERTY_ID e TAWK_WIDGET_ID em constants (ou VITE_TAWK_* no .env).
 * Ver docs/TAWKTO-CHATBOT.md
 */
import { useEffect, useRef } from 'react'
import { hasCookieConsent } from '../utils/consent'
import { TAWK_PROPERTY_ID, TAWK_WIDGET_ID } from '../constants'

const TAWK_SCRIPT_URL = 'https://embed.tawk.to'

function loadTawkScript() {
  if (typeof window === 'undefined') return
  if (!TAWK_PROPERTY_ID || !TAWK_WIDGET_ID) return
  if (document.querySelector(`script[src^="${TAWK_SCRIPT_URL}/"]`)) return

  const script = document.createElement('script')
  script.async = true
  script.src = `${TAWK_SCRIPT_URL}/${TAWK_PROPERTY_ID}/${TAWK_WIDGET_ID}`
  script.charset = 'UTF-8'
  script.setAttribute('crossorigin', '*')
  document.body.appendChild(script)
}

export default function TawkWidget() {
  const loadedRef = useRef(false)

  useEffect(() => {
    if (loadedRef.current) return

    function tryLoad() {
      if (!hasCookieConsent()) return
      loadedRef.current = true
      loadTawkScript()
    }

    tryLoad()

    const handler = () => {
      if (!loadedRef.current) tryLoad()
    }
    window.addEventListener('navel-cookies-accepted', handler)
    return () => window.removeEventListener('navel-cookies-accepted', handler)
  }, [])

  return null
}
