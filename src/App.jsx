/**
 * App — rotas e layout principal.
 * Usa lazy loading para páginas (exceto Home).
 */
import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ScrollToTop from './components/ScrollToTop'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import ErrorBoundary from './components/ErrorBoundary'
import Home from './pages/Home'

const Milwaukee = lazy(() => import('./pages/Milwaukee'))
const Produtos = lazy(() => import('./pages/Produtos'))
const Marcas = lazy(() => import('./pages/Marcas'))
const Sobre = lazy(() => import('./pages/Sobre'))
const Servicos = lazy(() => import('./pages/Servicos'))
const Catalogos = lazy(() => import('./pages/Catalogos'))
const Contacto = lazy(() => import('./pages/Contacto'))
const Privacidade = lazy(() => import('./pages/Privacidade'))
const Rgpd = lazy(() => import('./pages/Rgpd'))
const CondicoesGerais = lazy(() => import('./pages/CondicoesGerais'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const AguardarAprovacao = lazy(() => import('./pages/AguardarAprovacao'))
const AreaReservada = lazy(() => import('./pages/AreaReservada'))
const Admin = lazy(() => import('./pages/Admin'))
const NotFound = lazy(() => import('./pages/NotFound'))

function PageLoader() {
  return (
    <div className="page-loader" aria-hidden="true">
      <div className="page-loader__spinner" />
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <Layout>
        <ScrollToTop />
        <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/milwaukee" element={<Milwaukee />} />
          <Route path="/produtos" element={<Produtos />} />
          <Route path="/marcas" element={<Marcas />} />
          <Route path="/sobre" element={<Sobre />} />
          <Route path="/servicos" element={<Servicos />} />
          <Route path="/catalogos" element={<Catalogos />} />
          <Route path="/novidades" element={<Navigate to="/catalogos" replace />} />
          <Route path="/contacto" element={<Contacto />} />
          <Route path="/privacidade" element={<Privacidade />} />
          <Route path="/rgpd" element={<Rgpd />} />
          <Route path="/condicoes-gerais" element={<CondicoesGerais />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registar" element={<Register />} />
          <Route path="/aguardar-aprovacao" element={<AguardarAprovacao />} />
          <Route path="/area-reservada" element={<ProtectedRoute><AreaReservada /></ProtectedRoute>} />
          <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Layout>
    </ErrorBoundary>
  )
}

export default App
