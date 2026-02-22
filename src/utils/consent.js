/**
 * Utilitários para consentimento de cookies (RGPD)
 */

export const CONSENT_KEY = 'navel-cookies-accepted'

export function hasCookieConsent() {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(CONSENT_KEY) === 'true'
  } catch {
    return false
  }
}
