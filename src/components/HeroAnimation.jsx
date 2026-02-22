import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { HERO_SLIDES } from '../constants'
import { assetUrl } from '../utils/assetUrl'

const SLIDE_INTERVAL = 4000

export default function HeroAnimation() {
  const { t } = useTranslation()
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % HERO_SLIDES.length)
    }, SLIDE_INTERVAL)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="hero-animation" aria-hidden="true">
      <div className="hero-animation__track">
        {HERO_SLIDES.map((slide, i) => {
          const alt = t(slide.altKey)
          const isBrochure = !!slide.internalPath
          const hasBg = !!slide.backgroundImage
          const slideContent = (
            <img
              src={assetUrl(slide.src)}
              alt={alt}
              className={`hero-animation__img ${isBrochure ? 'hero-animation__img--brochure' : ''} ${hasBg ? 'hero-animation__img--overlay' : ''}`}
              width={isBrochure ? 280 : 200}
              height={isBrochure ? 360 : 80}
              loading={i < 3 ? 'eager' : 'lazy'}
              decoding="async"
              fetchpriority={i === 0 ? 'high' : undefined}
            />
          )
          return (
            <div
              key={i}
              className={`hero-animation__slide ${i === activeIndex ? 'hero-animation__slide--active' : ''} ${isBrochure ? 'hero-animation__slide--brochure' : ''} ${hasBg ? 'hero-animation__slide--with-bg' : ''}`}
              style={hasBg ? { backgroundImage: `url(${assetUrl(slide.backgroundImage)})` } : undefined}
            >
              {slide.internalPath ? (
                <Link to={slide.internalPath} className="hero-animation__link" aria-label={alt}>
                  {slideContent}
                </Link>
              ) : (
                <a
                  href={slide.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hero-animation__link"
                  aria-label={`${alt} (${t('a11y.opensNewWindow')})`}
                >
                  {slideContent}
                </a>
              )}
            </div>
          )
        })}
      </div>
      <div className="hero-animation__dots" aria-label={t('hero.carouselLabel')}>
        {HERO_SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            className={`hero-animation__dot ${i === activeIndex ? 'hero-animation__dot--active' : ''}`}
            aria-label={`Slide ${i + 1}`}
            onClick={() => setActiveIndex(i)}
          />
        ))}
      </div>
    </div>
  )
}
