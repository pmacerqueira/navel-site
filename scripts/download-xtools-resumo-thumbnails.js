/**
 * Descarrega os thumbnails dos 7 catálogos XTOOLS "Catálogo Resumo"
 * (https://xtools.pt/pt/catalogos/catalogo-resumo) e grava em
 * public/images/catalogos/xtools-resumo/.
 * Usados na página Catálogos do site Navel.
 *
 * Executar: node scripts/download-xtools-resumo-thumbnails.js
 */
import { writeFile, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'public', 'images', 'catalogos', 'xtools-resumo')

// Ordem na página catalogo-resumo: Aircraft, Optimum, Metallkraft, Unicraft, Holzkraft, Schweisskraft, Cleancraft
const XTOOLS_RESUMO_THUMBNAILS = [
  { url: 'https://xtools.pt/fileManager/catalogos/imagem_1.jpg', file: 'aircraft-resumo.jpg' },
  { url: 'https://xtools.pt/fileManager/catalogos/imagem_2.jpg', file: 'optimum-resumo.jpg' },
  { url: 'https://xtools.pt/fileManager/catalogos/imagem_7.jpg', file: 'metallkraft-resumo.jpg' },
  { url: 'https://xtools.pt/fileManager/catalogos/imagem_8.jpg', file: 'unicraft-resumo.jpg' },
  { url: 'https://xtools.pt/fileManager/catalogos/imagem_9.jpg', file: 'holzkraft-resumo.jpg' },
  { url: 'https://xtools.pt/fileManager/catalogos/imagem_10.jpg', file: 'schweisskraft-resumo.jpg' },
  { url: 'https://xtools.pt/fileManager/catalogos/imagem_11.jpg', file: 'cleancraft-resumo.jpg' },
]

await mkdir(OUT_DIR, { recursive: true })
for (const { url, file } of XTOOLS_RESUMO_THUMBNAILS) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} => ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const path = join(OUT_DIR, file)
  await writeFile(path, buf)
  console.log('OK', file)
}
console.log('Thumbnails XTOOLS Catálogo Resumo guardados em', OUT_DIR)
