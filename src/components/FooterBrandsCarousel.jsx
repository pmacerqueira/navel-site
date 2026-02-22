import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { FOOTER_BRANDS } from '../constants'

export default function FooterBrandsCarousel() {
  const { t } = useTranslation()
  const trackRef = useRef(null)
  /* Duplicamos a lista para scroll infinito contínuo (direita → esquerda) */
  const trackItems = [...FOOTER_BRANDS, ...FOOTER_BRANDS]

  useEffect(() => {
    const track = trackRef.current
    if (!track || !track.animate) return
    /* Respeitar preferência do utilizador: animação desativada apenas se reduzir movimento estiver ativo */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const start = () => {
      const keyframes = [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-50%)' },
      ]
      const opts = {
        duration: 30000,
        iterations: Infinity,
        easing: 'linear',
      }
      track._scrollAnim = track.animate(keyframes, opts)
    }
    const raf = requestAnimationFrame(() => requestAnimationFrame(start))
    return () => {
      cancelAnimationFrame(raf)
      track._scrollAnim?.cancel()
    }
  }, [])

  const handleMouseEnter = (e) => {
    const track = e.currentTarget.querySelector('.footer-brands__track')
    track?._scrollAnim?.pause()
  }
  const handleMouseLeave = (e) => {
    const track = e.currentTarget.querySelector('.footer-brands__track')
    track?._scrollAnim?.play()
  }

  return (
    <div
      className="footer-brands"
      aria-label={t('footer.brandsCarousel')}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div ref={trackRef} className="footer-brands__track">
        {trackItems.map((brand, i) => {
          const hasUrl = !!brand.url
          const hasLogo = !!brand.src
          const content = (
            <>
              {hasLogo ? (
                <img
                  src={brand.src}
                  alt=""
                  className="footer-brands__img"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    e.target.style.display = 'none'
                    e.target.nextElementSibling?.classList.add('footer-brands__placeholder--visible')
                  }}
                />
              ) : (
                <span className="footer-brands__placeholder footer-brands__placeholder--visible" aria-hidden="true">
                  {brand.name}
                </span>
              )}
              {hasLogo && (
                <span className="footer-brands__placeholder" aria-hidden="true">
                  {brand.name}
                </span>
              )}
            </>
          )
          return hasUrl ? (
            <a
              key={`${brand.name}-${i}`}
              href={brand.url}
              target="_blank"
              rel="noopener noreferrer"
              className="footer-brands__item"
              aria-label={`${brand.name} (${t('a11y.opensNewWindow')})`}
            >
              {content}
            </a>
          ) : (
            <span key={`${brand.name}-${i}`} className="footer-brands__item" aria-hidden="true">
              {content}
            </span>
          )
        })}
      </div>
    </div>
  )
}
