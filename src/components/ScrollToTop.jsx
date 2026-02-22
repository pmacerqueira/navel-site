/**
 * Faz scroll para o topo da página quando a rota muda.
 * Garante que todas as páginas (incl. política de privacidade a partir do rodapé) abrem no topo.
 * Inclui fix para Safari/iOS (Mac/iPhone), que por vezes restaura o scroll após o primeiro paint.
 */
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const scrollOptions = { top: 0, left: 0, behavior: 'auto' }
const scrollIntoViewOptions = { block: 'start', inline: 'nearest', behavior: 'auto' }

function scrollToTop() {
  window.scrollTo(scrollOptions)
  document.documentElement.scrollTo(scrollOptions)
  if (document.body && typeof document.body.scrollTo === 'function') {
    document.body.scrollTo(scrollOptions)
  }
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
  const main = document.getElementById('main-content')
  if (main) {
    main.scrollTop = 0
    // Safari/iOS respeita melhor scrollIntoView no elemento principal
    main.scrollIntoView(scrollIntoViewOptions)
  }
}

export default function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    if (typeof history !== 'undefined' && 'scrollRestoration' in history) {
      history.scrollRestoration = 'manual'
    }

    scrollToTop()
    // Double rAF: Safari aplica layout no segundo frame
    const raf1 = requestAnimationFrame(() => {
      scrollToTop()
      requestAnimationFrame(scrollToTop)
    })
    const t1 = setTimeout(scrollToTop, 50)
    const t2 = setTimeout(scrollToTop, 150)
    const t3 = setTimeout(scrollToTop, 400)
    const t4 = setTimeout(scrollToTop, 800)
    const t5 = setTimeout(scrollToTop, 1200)
    // Safari/iOS: restauração de scroll pode ocorrer tarde; repetir até ~2.5s
    const t6 = setTimeout(scrollToTop, 1800)
    const t7 = setTimeout(scrollToTop, 2500)
    return () => {
      cancelAnimationFrame(raf1)
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      clearTimeout(t4)
      clearTimeout(t5)
      clearTimeout(t6)
      clearTimeout(t7)
    }
  }, [pathname])

  return null
}
