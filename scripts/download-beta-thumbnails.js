/**
 * Descarrega thumbnails Beta para public/images/catalogos/beta/.
 * — Bolas 2026 (banner 165): block2 = tabela; block3 = Action (file271); block4 = Worker (file224), como no HTML Bolas.
 * — C45 / RSC50: Proxira.
 *
 * Executar: node scripts/download-beta-thumbnails.js
 */
import { writeFile, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'public', 'images', 'catalogos', 'beta')

const BETA_THUMBNAILS = [
  { url: 'https://1941730701.rsc.cdn77.org/images/block2_165.jpg?1774265454', file: 'beta-tabela-precos-2026.jpg' },
  { url: 'https://1941730701.rsc.cdn77.org/images/block3_165.jpg?1774265533', file: 'beta-action-2026.jpg' },
  { url: 'https://1941730701.rsc.cdn77.org/images/block4_165.jpg?1757935536', file: 'beta-worker-2026.jpg' },
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
