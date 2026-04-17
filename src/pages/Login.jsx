import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { isProfileApproved } from '../lib/profileApproved'
import { ADMIN_EMAIL } from '../constants'

export default function Login() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const from = location.state?.from?.pathname || '/area-reservada'

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!supabase) {
      setError(t('auth.supabaseNotConfigured'))
      return
    }
    setLoading(true)
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })
      if (err) {
        setError(err.message)
        return
      }
      if (data?.user) {
        const u = data.user
        const isAdminUser = u.email === ADMIN_EMAIL
        // Garantir sessão local antes do REST; por vezes o 1.º SELECT a profiles corre sem JWT aplicado.
        await supabase.auth.getSession()
        let approvedOk = isAdminUser
        if (!isAdminUser) {
          for (let attempt = 0; attempt < 2; attempt++) {
            const { data: profileRow } = await supabase
              .from('profiles')
              .select('approved')
              .eq('id', u.id)
              .maybeSingle()
            if (isProfileApproved(profileRow?.approved)) {
              approvedOk = true
              break
            }
            if (attempt === 0) await new Promise((r) => setTimeout(r, 400))
          }
        }
        if (approvedOk) {
          navigate(from, { replace: true })
        } else {
          navigate('/aguardar-aprovacao', { replace: true })
        }
      } else {
        setError(t('auth.loginFailedTryAgain'))
      }
    } catch (err) {
      setError(err?.message || t('auth.loginLead'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="section section--auth">
      <div className="container container--narrow-sm">
        <div className="auth-card">
          <h1>{t('auth.loginTitle')}</h1>
          <p className="text-muted auth-card__lead">{t('auth.loginLead')}</p>
          {error && <div className="auth-card__error" role="alert">{error}</div>}
          <form className="auth-form" onSubmit={handleSubmit} autoComplete="on">
            <div className="auth-form__row">
              <label htmlFor="login-email">{t('auth.email')}</label>
              <input id="login-email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" disabled={loading} />
            </div>
            <div className="auth-form__row">
              <label htmlFor="login-password">{t('auth.password')}</label>
              <input id="login-password" name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" disabled={loading} />
            </div>
            <button type="submit" className="btn btn--primary btn--block" disabled={loading}>
              {loading ? t('auth.loading') : t('auth.loginSubmit')}
            </button>
          </form>
          <p className="auth-card__footer">
            {t('auth.noAccount')} <Link to="/registar">{t('auth.registerLink')}</Link>
          </p>
        </div>
      </div>
    </section>
  )
}
