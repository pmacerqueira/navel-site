import { useTranslation } from 'react-i18next'
import ScrollReveal from '../components/ScrollReveal'

const SERVICE_AREAS = [
  { titleKey: 'services.area1Title', itemsKey: 'services.area1Items' },
  { titleKey: 'services.area2Title', itemsKey: 'services.area2Items' },
  { titleKey: 'services.area3Title', itemsKey: 'services.area3Items' },
  { titleKey: 'services.area4Title', itemsKey: 'services.area4Items' },
]

export default function Servicos() {
  const { t } = useTranslation()

  return (
    <>
      <section className="section page-hero">
        <div className="container">
          <h1>{t('services.title')}</h1>
          <p className="text-muted page-hero__lead">{t('services.lead')}</p>
        </div>
      </section>

      <section className="section services-grid">
        <div className="container">
          <div className="services-grid__list">
            {SERVICE_AREAS.map((area, i) => (
              <ScrollReveal key={i} delay={i * 80}>
                <div className="card services-card">
                <h3 className="services-card__title">{t(area.titleKey)}</h3>
                <ul className="services-card__list">
                  {(t(area.itemsKey, { returnObjects: true }) || []).map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ul>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
