import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function Admin() {
  const { t } = useTranslation()
  const { user, signOut } = useAuth()
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    supabase.from('profiles').select('id, email, created_at').eq('approved', false).order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setPending(data)
      })
      .catch(() => setPending([]))
      .finally(() => setLoading(false))
  }, [])

  const approve = async (id) => {
    if (!supabase) return
    try {
      const { error } = await supabase.from('profiles').update({ approved: true }).eq('id', id)
      if (!error) setPending((p) => p.filter((u) => u.id !== id))
    } catch {
      /* erro silencioso — utilizador permanece na lista */
    }
  }

  return (
    <section className="section">
      <div className="container">
        <div className="admin-panel">
          <div className="admin-panel__header">
            <h1>{t('auth.adminTitle')}</h1>
            <p className="text-muted">{t('auth.adminLead')}</p>
            <div className="admin-panel__user">
              <span>{user?.email}</span>
              <button type="button" className="btn btn--outline btn--sm" onClick={() => signOut()}>
                {t('auth.signOut')}
              </button>
            </div>
          </div>

          <div className="admin-panel__content">
            <h2>{t('auth.pendingUsers')}</h2>
            {loading ? (
              <p className="text-muted">{t('auth.loading')}</p>
            ) : pending.length === 0 ? (
              <p className="text-muted">{t('auth.noPendingUsers')}</p>
            ) : (
              <ul className="admin-list">
                {pending.map((u) => (
                  <li key={u.id} className="admin-list__item">
                    <div>
                      <strong>{u.email}</strong>
                      <span className="admin-list__date">{new Date(u.created_at).toLocaleDateString()}</span>
                    </div>
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      onClick={() => approve(u.id)}
                    >
                      {t('auth.approve')}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
