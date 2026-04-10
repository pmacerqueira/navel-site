/**
 * main.jsx — ponto de entrada da aplicação Navel.
 * BrowserRouter + fallback no .htaccess (Apache) para URLs limpas e SEO.
 * Future flags: v7_relativeSplatPath, v7_startTransition (React Router v7).
 */
import './i18n'
import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { AuthProvider } from './contexts/AuthContext'
import App from './App'
import './index.css'
import './styles/components.css'
import './styles/pages.css'

/** Migração HashRouter → BrowserRouter: links antigos #/rota passam a path limpo antes do router ler a URL */
if (typeof window !== 'undefined') {
  const { hash, search } = window.location
  if (hash.startsWith('#/')) {
    let path = hash.slice(1).split('?')[0] || '/'
    if (!path.startsWith('/')) path = `/${path}`
    window.history.replaceState(null, '', path + (search || ''))
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <Suspense fallback={null}>
        <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </Suspense>
    </HelmetProvider>
  </React.StrictMode>,
)
