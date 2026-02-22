/**
 * ScrollReveal — anima elementos quando entram no viewport.
 * Respeita prefers-reduced-motion (WCAG 2.3.3).
 */
import { useEffect, useRef, useState } from 'react'

const ROOT_MARGIN = '0px 0px -60px 0px' // dispara quando 60px da base entra na view
const THRESHOLD = 0.1

export default function ScrollReveal({ children, className = '', as: Tag = 'div', delay = 0 }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true)
      },
      { rootMargin: ROOT_MARGIN, threshold: THRESHOLD }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <Tag
      ref={ref}
      className={`scroll-reveal ${visible ? 'scroll-reveal--visible' : ''} ${className}`.trim()}
      style={delay ? { '--scroll-reveal-delay': `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  )
}
