/**
 * Descarrega os thumbnails dos catálogos Beta do site da Proxira
 * e grava em public/images/catalogos/beta/.
 *
 * Executar: node scripts/download-beta-thumbnails.js
 */
import { writeFile, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'public', 'images', 'catalogos', 'beta')

const BETA_THUMBNAILS = [
  { url: 'https://proxira.pt/wp-content/uploads/2025/03/Catalogo-Beta-2025-1.webp', file: 'catalogo-geral-2025.webp' },
  { url: 'https://proxira.pt/wp-content/uploads/2025/03/Catalogo-Beta-Action-2025-1.webp', file: 'beta-action-2025.webp' },
  { url: 'https://proxira.pt/wp-content/uploads/2025/04/Catalogo-C45PRO-2.0-Beta.webp', file: 'catalogo-c45pro-2-0.webp' },
  { url: 'https://proxira.pt/wp-content/uploads/2025/04/Catalogo-RSC50-2.0-Beta.webp', file: 'catalogo-rsc50-2-0.webp' },
]

await mkdir(OUT_DIR, { recursive: true })
for (const { url, file } of BETA_THUMBNAILS) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} => ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const path = join(OUT_DIR, file)
  await writeFile(path, buf)
  console.log('OK', file)
}
console.log('Thumbnails Beta guardados em', OUT_DIR)
