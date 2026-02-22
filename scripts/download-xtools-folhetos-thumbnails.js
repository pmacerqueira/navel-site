/**
 * Descarrega os thumbnails dos 4 folhetos XTOOLS (campanhas atuais na Home)
 * de xtools.pt e grava em public/images/catalogos/xtools-folhetos/.
 *
 * Executar: node scripts/download-xtools-folhetos-thumbnails.js
 */
import { writeFile, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'public', 'images', 'catalogos', 'xtools-folhetos')

const XTOOLS_FOLHETOS = [
  { url: 'https://xtools.pt/fileManager/catalogos/imagem_22.jpg', file: 'iluminacao-unicraft.jpg' },
  { url: 'https://xtools.pt/fileManager/catalogos/imagem_19.jpg', file: 'folheto-aircraft.jpg' },
  { url: 'https://xtools.pt/fileManager/catalogos/imagem_20.png', file: 'folheto-optimum.png' },
  { url: 'https://xtools.pt/fileManager/catalogos/imagem_21.png', file: 'folheto-metallkraft.png' },
]

await mkdir(OUT_DIR, { recursive: true })
for (const { url, file } of XTOOLS_FOLHETOS) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} => ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const path = join(OUT_DIR, file)
  await writeFile(path, buf)
  console.log('OK', file)
}
console.log('Thumbnails XTOOLS folhetos guardados em', OUT_DIR)
