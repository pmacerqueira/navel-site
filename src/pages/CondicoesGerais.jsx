import { useTranslation } from 'react-i18next'
import { cgvsMeta, cgvsSections } from '../data/cgvs-pt'

export default function CondicoesGerais() {
  const { t } = useTranslation()
  const legalAside = t('cgvs.legalLang')

  return (
    <>
      <section className="section page-hero">
        <div className="container">
          <h1>{t('cgvs.title')}</h1>
          <p className="text-muted page-hero__lead">{t('cgvs.lead')}</p>
          {legalAside ? (
            <p className="text-muted page-hero__legal">{legalAside}</p>
          ) : null}
        </div>
      </section>

      <section className="section privacy-content">
        <div className="container container--narrow">
          <div className="privacy-content__block privacy-content__block--meta">
            <p className="text-muted">
              {t('cgvs.docReference', { code: cgvsMeta.code, edition: cgvsMeta.edition })}
            </p>
          </div>

          {cgvsSections.map((sec) => (
            <article key={sec.id} className="privacy-content__block cgvs-section">
              <h2 className="cgvs-section__title">{sec.title}</h2>
              {sec.paragraphs?.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
              {sec.subitems?.length ? (
                <ol className="cgvs-section__sublist">
                  {sec.subitems.map((item, i) => (
                    <li key={i}>
                      <span className="cgvs-section__label">{item.label}</span>
                      {' '}
                      {item.text}
                    </li>
                  ))}
                </ol>
              ) : null}
              {sec.paragraphsAfter?.map((para, i) => (
                <p key={`after-${i}`}>{para}</p>
              ))}
            </article>
          ))}

          <div className="privacy-content__block privacy-content__block--meta">
            <p className="text-muted">{t('cgvs.numberingNote')}</p>
          </div>
        </div>
      </section>
    </>
  )
}
