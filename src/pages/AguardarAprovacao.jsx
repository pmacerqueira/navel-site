import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'

export default function AguardarAprovacao() {
  const { t } = useTranslation()
  const { user, isAdmin, signOut } = useAuth()

  return (
    <section className="section section--auth">
      <div className="container container--narrow-sm">
        <div className="auth-card auth-card--info">
          <h1>{t('auth.pendingTitle')}</h1>
          <p>{t('auth.pendingText')}</p>
          {user && <p className="text-muted">{user.email}</p>}
          {isAdmin && (
            <Link to="/admin" className="btn btn--primary">{t('auth.adminPanel')}</Link>
          )}
          <button type="button" className="btn btn--outline" onClick={() => signOut()}>
            {t('auth.signOut')}
          </button>
        </div>
      </div>
    </section>
  )
}
