/**
 * Protege rotas de admin — só permite acesso a comercial@navel.pt.
 */
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import AuthRouteLoader from './AuthRouteLoader'

export default function AdminRoute({ children }) {
  const { user, loading, isAdmin } = useAuth()
  const location = useLocation()

  if (loading) return <AuthRouteLoader />

  if (!user || !isAdmin) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}
