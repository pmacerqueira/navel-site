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
