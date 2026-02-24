/**
 * Faz scroll para o topo quando a rota muda.
 * Usa double-rAF (padrão estável para React + Suspense + lazy loading).
 * scrollRestoration = 'manual' impede o browser de restaurar posição anterior.
 */
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Desactivar restauração de scroll do browser uma única vez
if (typeof history !== 'undefined' && 'scrollRestoration' in history) {
  history.scrollRestoration = 'manual'
}

export default function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    // Double rAF: garante que o scroll corre após o browser aplicar o layout do novo conteúdo
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo(0, 0)
      })
    })
    return () => cancelAnimationFrame(raf)
  }, [pathname])

  return null
}
