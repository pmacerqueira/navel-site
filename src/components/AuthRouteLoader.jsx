/**
 * Loader reutilizável para rotas protegidas (auth check em curso).
 */
export default function AuthRouteLoader() {
  return (
    <div className="section">
      <div className="container container--narrow">
        <div className="page-loader" aria-hidden="true">
          <div className="page-loader__spinner" />
        </div>
      </div>
    </div>
  )
}
