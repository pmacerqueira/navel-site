/**
 * Error Boundary — captura erros de renderização React e evita crash total da app.
 */
import { Component } from 'react'
import { Link } from 'react-router-dom'

export default class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('[Navel] Erro capturado:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="section" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
          <div className="container container--narrow">
            <h1 style={{ marginBottom: '1rem' }}>Ocorreu um erro</h1>
            <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
              Algo correu mal. Por favor, recarregue a página ou volte ao início.
            </p>
            <Link to="/" className="btn btn--primary">
              Voltar ao início
            </Link>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
