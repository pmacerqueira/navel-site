/**
 * Contexto de autenticação — Supabase Auth + aprovação manual.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { isProfileApproved } from '../lib/profileApproved'
import { ADMIN_EMAIL } from '../constants'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [adminPendingCount, setAdminPendingCount] = useState(0)

  const fetchProfile = useCallback(async (userId) => {
    if (!supabase) return { data: null, error: null }
    setProfileLoading(true)
    try {
      const read = () => supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
      let { data, error } = await read()
      if (!error && data == null) {
        await new Promise((r) => setTimeout(r, 400))
        ;({ data, error } = await read())
      }
      if (error) {
        setProfile(null)
        return { data: null, error }
      }
      setProfile(data ?? null)
      return { data: data ?? null, error: null }
    } catch (e) {
      setProfile(null)
      const err = e instanceof Error ? e : new Error(String(e))
      return { data: null, error: err }
    } finally {
      setProfileLoading(false)
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return { data: null, error: null }
    return fetchProfile(user.id)
  }, [user?.id, fetchProfile])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        setUser(session?.user ?? null)
        if (session?.user) await fetchProfile(session.user.id)
        else setProfile(null)
      })
      .catch(() => {
        setUser(null)
        setProfile(null)
      })
      .finally(() => setLoading(false))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) void fetchProfile(session.user.id)
      else {
        setProfile(null)
        setProfileLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const isAdmin = user?.email === ADMIN_EMAIL
  const isApproved = isAdmin || isProfileApproved(profile?.approved)
  const isPending = user && !isAdmin && profile != null && !isProfileApproved(profile?.approved)

  const refreshAdminPendingCount = useCallback(async () => {
    if (!supabase || user?.email !== ADMIN_EMAIL) {
      setAdminPendingCount(0)
      return
    }
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('approved', false)
    if (!error && typeof count === 'number') setAdminPendingCount(count)
  }, [user?.email])

  useEffect(() => {
    if (!isAdmin) {
      setAdminPendingCount(0)
      return
    }
    refreshAdminPendingCount()
  }, [isAdmin, refreshAdminPendingCount])

  useEffect(() => {
    if (!isAdmin) return
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshAdminPendingCount()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [isAdmin, refreshAdminPendingCount])

  const signOut = useCallback(async () => {
    try {
      if (supabase) await supabase.auth.signOut({ scope: 'global' })
    } catch {
      /* continuar a limpar estado local */
    }
    setUser(null)
    setProfile(null)
    setAdminPendingCount(0)
    window.location.assign(`${window.location.origin}/login`)
  }, [])

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      profileLoading,
      isAdmin,
      isApproved,
      isPending,
      adminPendingCount,
      refreshAdminPendingCount,
      refreshProfile,
      signOut,
    }),
    [user, profile, loading, profileLoading, isAdmin, isApproved, isPending, adminPendingCount, refreshAdminPendingCount, refreshProfile, signOut]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
