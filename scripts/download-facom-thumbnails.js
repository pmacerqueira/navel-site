/**
 * Descarrega os thumbnails dos catálogos Facom do site da Proxira
 * e grava em public/images/catalogos/facom/.
 *
 * Executar: node scripts/download-facom-thumbnails.js
 */
import { writeFile, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'public', 'images', 'catalogos', 'facom')

const FACOM_THUMBNAILS = [
  { url: 'https://proxira.pt/wp-content/uploads/2025/08/Catalogo-FACOM-2025.webp', file: 'catalogo-facom-2025.webp' },
  { url: 'https://proxira.pt/wp-content/uploads/2025/09/CATALOGO-JEtline.webp', file: 'catalogo-jetline.webp' },
  { url: 'https://proxira.pt/wp-content/uploads/2025/09/CATALOGO-ROLL-Workshop-System.webp', file: 'catalogo-roll-workshop.webp' },
  { url: 'https://proxira.pt/wp-content/uploads/2025/09/Catalogo-FACOM-Novidades.webp', file: 'catalogo-facom-novidades.webp' },
  { url: 'https://proxira.pt/wp-content/uploads/2025/09/Catalogo-FACOM-MATRIX.webp', file: 'catalogo-facom-matrix.webp' },
]

await mkdir(OUT_DIR, { recursive: true })
for (const { url, file } of FACOM_THUMBNAILS) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} => ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const path = join(OUT_DIR, file)
  await writeFile(path, buf)
  console.log('OK', file)
}
console.log('Thumbnails Facom guardados em', OUT_DIR)
