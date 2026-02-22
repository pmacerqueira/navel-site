import { useTranslation } from 'react-i18next'
import ScrollReveal from '../components/ScrollReveal'

export default function Sobre() {
  const { t } = useTranslation()

  return (
    <>
      <section className="section page-hero">
        <div className="container">
          <h1>{t('about.title')}</h1>
          <p className="text-muted page-hero__lead">{t('about.lead')}</p>
        </div>
      </section>

      <section className="section about-content">
        <div className="container container--narrow">
          {[
            { content: <p>{t('about.block1')}</p> },
            { content: <><h3>{t('about.block2Title')}</h3><p>{t('about.block2')}</p></> },
            { content: <><h3>{t('about.block3Title')}</h3><p>{t('about.block3')}</p></> },
            { content: <><h3>{t('about.block4Title')}</h3><p>{t('about.block4a')}</p><p>{t('about.block4b')}</p></> },
          ].map((block, i) => (
            <ScrollReveal key={i} delay={i * 80}>
              <div className="about-content__block">{block.content}</div>
            </ScrollReveal>
          ))}
        </div>
      </section>
    </>
  )
}
