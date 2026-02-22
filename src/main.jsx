/**
 * main.jsx — ponto de entrada da aplicação Navel.
 * HashRouter para compatibilidade com hospedagem estática (cPanel).
 * Future flags: v7_relativeSplatPath, v7_startTransition (React Router v7).
 */
import './i18n'
import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import App from './App'
import './index.css'
import './styles/components.css'
import './styles/pages.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Suspense fallback={null}>
      <HashRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </HashRouter>
    </Suspense>
  </React.StrictMode>,
)
