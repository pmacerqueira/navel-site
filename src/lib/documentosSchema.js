export const DOCUMENT_TYPES = [
  'MANUAL_UTILIZADOR',
  'MANUAL_TECNICO',
  'PLANO_MANUTENCAO',
  'OUTROS',
]

export const DOCUMENTOS_ROOT_FOLDERS = [
  { slug: 'Comercial', labelKey: 'auth.portalFolderComercial' },
  { slug: 'Assistencia Tecnica', labelKey: 'auth.portalFolderAssistencia' },
]

export const ASSISTENCIA_TECNICA_ROOT = 'Assistencia Tecnica'
export const COMERCIAL_ROOT = 'Comercial'

/**
 * Alinha com documentos-api.php (n_doc_normalize_taxonomy_text):
 * NFC + traços tipográficos → hífen. Usar em caminhos e comparações de taxonomia AT_Manut.
 */
export function normalizeTaxonomyPath(s) {
  if (s == null || s === '') return ''
  return String(s)
    .normalize('NFC')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .trim()
}

/**
 * Chave estável para comparar nomes de pastas (disco vs taxonomia vs variantes com/sem acentos).
 * Não substitui normalizeTaxonomyPath em caminhos reais — só para dedupe na UI.
 */
export function normalizeFolderDedupeKey(s) {
  const base = normalizeTaxonomyPath(String(s || ''))
  return base
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
}

/** Compara caminhos ignorando diacríticos (ex.: raiz AT com ou sem acentos). */
export function pathMatchesMountFolder(currentPath, mountFolder) {
  const a = normalizeFolderDedupeKey(currentPath).replace(/\\/g, '/')
  const b = normalizeFolderDedupeKey(mountFolder).replace(/\\/g, '/')
  return a === b || a.startsWith(`${b}/`)
}

/**
 * Caminho relativo dentro de Assistencia Tecnica (1.º segmento), ignorando acentos no nome da raiz.
 * '' = estamos na raiz AT; null = fora da árvore AT.
 */
export function relativePathUnderAssistenciaRoot(currentPath) {
  if (currentPath == null || currentPath === '') return null
  const norm = normalizeTaxonomyPath(String(currentPath)).replace(/\\/g, '/')
  const root = ASSISTENCIA_TECNICA_ROOT
  if (normalizeFolderDedupeKey(norm) === normalizeFolderDedupeKey(root)) return ''
  const parts = norm.split('/').filter(Boolean)
  if (parts.length === 0) return null
  if (normalizeFolderDedupeKey(parts[0]) !== normalizeFolderDedupeKey(root)) return null
  return parts.slice(1).join('/')
}
