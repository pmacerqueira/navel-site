/**
 * Protege rotas — só permite acesso a utilizadores aprovados.
 */
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import AuthRouteLoader from './AuthRouteLoader'

export default function ProtectedRoute({ children }) {
  const { user, loading, isApproved, isPending } = useAuth()
  const location = useLocation()

  if (loading) return <AuthRouteLoader />

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (isPending) {
    return <Navigate to="/aguardar-aprovacao" replace />
  }

  if (!isApproved) {
    return <Navigate to="/login" replace />
  }

  return children
}
