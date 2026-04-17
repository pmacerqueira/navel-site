import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { isProfileApproved } from '../lib/profileApproved'

const POLL_MS = 25_000

export default function AguardarAprovacao() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, isAdmin, signOut, isApproved, refreshProfile } = useAuth()
  const [checking, setChecking] = useState(false)
  const [recheckMessage, setRecheckMessage] = useState(null)
  const [recheckIsError, setRecheckIsError] = useState(false)

  useEffect(() => {
    if (!user || isAdmin) return
    refreshProfile()
    const id = setInterval(() => {
      refreshProfile()
    }, POLL_MS)
    return () => clearInterval(id)
  }, [user?.id, isAdmin, refreshProfile])

  useEffect(() => {
    if (!isAdmin && isApproved) navigate('/area-reservada', { replace: true })
  }, [isAdmin, isApproved, navigate])

  function errMessage(err) {
    if (!err) return ''
    if (typeof err === 'object' && err !== null && 'message' in err) return String(err.message)
    return String(err)
  }

  async function handleRecheck() {
    if (!supabase || !user) return
    setRecheckMessage(null)
    setRecheckIsError(false)
    setChecking(true)
    try {
      await supabase.auth.getSession()
      try {
        await supabase.auth.refreshSession()
      } catch {
        /* sem refresh token ou rede; a leitura do perfil pode mesmo assim funcionar */
      }
      const { data, error } = await refreshProfile()
      if (error) {
        setRecheckIsError(true)
        setRecheckMessage(t('auth.pendingRecheckApiError', { message: errMessage(error) }))
        return
      }
      if (!data) {
        setRecheckIsError(true)
        setRecheckMessage(t('auth.pendingRecheckNoProfile'))
        return
      }
      if (!isProfileApproved(data.approved)) {
        setRecheckIsError(false)
        setRecheckMessage(t('auth.pendingRecheckStillPending'))
        return
      }
      setRecheckMessage(null)
    } finally {
      setChecking(false)
    }
  }

  if (isAdmin) return <Navigate to="/area-reservada" replace />
  if (!user) return <Navigate to="/login" replace />

  return (
    <section className="section section--auth">
      <div className="container container--narrow-sm">
        <div className="auth-card auth-card--info">
          <h1>{t('auth.pendingTitle')}</h1>
          <p>{t('auth.pendingText')}</p>
          <p className="text-muted auth-card__hint">{t('auth.pendingRecheckHint')}</p>
          {user && <p className="text-muted">{user.email}</p>}
          {recheckMessage && (
            <p className={recheckIsError ? 'auth-card__error' : 'auth-card__notice'} role={recheckIsError ? 'alert' : 'status'}>
              {recheckMessage}
            </p>
          )}
          <div className="auth-card__actions">
            <button type="button" className="btn btn--primary" onClick={handleRecheck} disabled={checking}>
              {checking ? t('auth.loading') : t('auth.pendingRecheck')}
            </button>
            <button type="button" className="btn btn--outline" onClick={() => void signOut()}>
              {t('auth.signOut')}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
