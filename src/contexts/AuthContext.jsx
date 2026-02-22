/**
 * Contexto de autenticação — Supabase Auth + aprovação manual.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { ADMIN_EMAIL } from '../constants'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId) => {
    if (!supabase) return
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
      setProfile(data ?? null)
    } catch {
      setProfile(null)
    }
  }, [])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null)
        if (session?.user) fetchProfile(session.user.id)
        else setProfile(null)
      })
      .catch(() => {
        setUser(null)
        setProfile(null)
      })
      .finally(() => setLoading(false))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const isAdmin = user?.email === ADMIN_EMAIL
  const isApproved = isAdmin || profile?.approved === true
  const isPending = user && !isAdmin && profile && !profile.approved

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      isAdmin,
      isApproved,
      isPending,
      signOut: () => supabase?.auth.signOut(),
    }),
    [user, profile, loading, isAdmin, isApproved, isPending]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
