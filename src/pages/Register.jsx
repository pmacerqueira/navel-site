import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'

const MIN_PASSWORD = 8

export default function Register() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!supabase) {
      setError(t('auth.supabaseNotConfigured'))
      return
    }
    if (password.length < MIN_PASSWORD) {
      setError(t('auth.passwordTooShort'))
      return
    }
    if (password !== confirmPassword) {
      setError(t('auth.passwordsNotMatch'))
      return
    }
    setLoading(true)
    try {
      const redirectUrl = window.location.origin + (window.location.hash || '#/login')
      const { error: err } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: redirectUrl },
      })
      setPassword('')
      setConfirmPassword('')
      if (err) {
        setError(err.message)
        return
      }
      setSuccess(true)
    } catch (err) {
      setError(err?.message || t('auth.registerLead'))
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <section className="section section--auth">
        <div className="container container--narrow-sm">
          <div className="auth-card auth-card--success">
            <h1>{t('auth.registerSuccessTitle')}</h1>
            <p>{t('auth.registerSuccessText')}</p>
            <Link to="/login" className="btn btn--primary">{t('auth.goToLogin')}</Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="section section--auth">
      <div className="container container--narrow-sm">
        <div className="auth-card">
          <h1>{t('auth.registerTitle')}</h1>
          <p className="text-muted auth-card__lead">{t('auth.registerLead')}</p>
          {error && <div className="auth-card__error" role="alert">{error}</div>}
          <form className="auth-form" onSubmit={handleSubmit} autoComplete="on">
            <div className="auth-form__row">
              <label htmlFor="reg-email">{t('auth.email')}</label>
              <input id="reg-email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" disabled={loading} />
            </div>
            <div className="auth-form__row">
              <label htmlFor="reg-password">{t('auth.password')}</label>
              <input id="reg-password" name="new-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={MIN_PASSWORD} autoComplete="new-password" disabled={loading} />
              <span className="auth-form__hint">{t('auth.passwordHint')}</span>
            </div>
            <div className="auth-form__row">
              <label htmlFor="reg-confirm">{t('auth.confirmPassword')}</label>
              <input id="reg-confirm" name="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={MIN_PASSWORD} autoComplete="new-password" disabled={loading} />
            </div>
            <button type="submit" className="btn btn--primary btn--block" disabled={loading}>
              {loading ? t('auth.loading') : t('auth.registerSubmit')}
            </button>
          </form>
          <p className="auth-card__footer">
            {t('auth.haveAccount')} <Link to="/login">{t('auth.loginLink')}</Link>
          </p>
        </div>
      </div>
    </section>
  )
}
