import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function NotFound() {
  const { t } = useTranslation()

  return (
    <section className="section">
      <div className="container text-center">
        <h1>{t('notFound.title')}</h1>
        <p className="text-muted not-found-cta">{t('notFound.text')}</p>
        <Link to="/" className="btn btn--primary">{t('notFound.back')}</Link>
      </div>
    </section>
  )
}
