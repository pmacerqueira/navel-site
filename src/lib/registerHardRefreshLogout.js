import { clearSupabaseAuthStorageSync } from './supabase'

/**
 * Hard refresh (Ctrl+F5, Ctrl+Shift+R, Cmd+Shift+R, etc.) não distingue de F5
 * depois do reload — limpamos tokens no keydown *antes* do browser recarregar.
 * F5 simples não usa modificadores → sessão mantém-se.
 * Limitação: "Esvaziar cache e recarregar" no DevTools não dispara estes atalhos.
 */
export function registerHardRefreshLogout() {
  if (typeof window === 'undefined') return

  window.addEventListener(
    'keydown',
    (e) => {
      const mod = e.ctrlKey || e.metaKey
      if (!mod) return

      // Ctrl+F5 / Cmd+F5 — reload forçado (comum no Windows/Linux; mac pode variar)
      if (e.key === 'F5' && !e.shiftKey) {
        clearSupabaseAuthStorageSync()
        return
      }

      // Ctrl+Shift+R / Cmd+Shift+R — hard reload em Chrome, Edge, Firefox
      if ((e.key === 'r' || e.key === 'R') && e.shiftKey) {
        clearSupabaseAuthStorageSync()
        return
      }

      // Safari (macOS): Cmd+Option+R — recarregar ignorando cache
      if (e.metaKey && e.altKey && (e.key === 'r' || e.key === 'R')) {
        clearSupabaseAuthStorageSync()
      }
    },
    true
  )
}
