/**
 * Resolve URL for static assets in public/ so they work with Vite base URL
 * and when the app is deployed in a subpath (e.g. cPanel subdirectory).
 */
export function assetUrl(path) {
  if (!path || typeof path !== 'string') return path
  if (/^https?:\/\//i.test(path)) return path
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
  return base + (path.startsWith('/') ? path : '/' + path)
}
