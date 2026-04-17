/**
 * Interpreta profiles.approved vindo do PostgREST / Supabase.
 * Usa comparação tolerante para evitar edge cases (ex.: tipos inesperados).
 */
export function isProfileApproved(approved) {
  if (approved === true || approved === 1) return true
  if (typeof approved === 'string') {
    const s = approved.trim().toLowerCase()
    return s === 'true' || s === 't' || s === '1'
  }
  return false
}
