/**
 * Verifica se as pastas de thumbnails dos catálogos existem em public/images/catalogos/.
 * Se faltar alguma, termina com código 1 para falhar o pipeline (OPTIMIZAR.bat).
 *
 * Executar: node scripts/verify-catalog-images.js
 */
import { readdir } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BASE = join(__dirname, '..', 'public', 'images', 'catalogos')

const REQUIRED = {
  facom: ['catalogo-facom-2025.webp', 'catalogo-jetline.webp', 'catalogo-roll-workshop.webp', 'catalogo-facom-novidades.webp', 'catalogo-facom-matrix.webp'],
  beta: ['catalogo-geral-2025.webp', 'beta-action-2025.webp', 'catalogo-c45pro-2-0.webp', 'catalogo-rsc50-2-0.webp'],
  'xtools-folhetos': ['iluminacao-unicraft.jpg', 'folheto-aircraft.jpg', 'folheto-optimum.png', 'folheto-metallkraft.png'],
  'xtools-resumo': ['aircraft-resumo.jpg', 'optimum-resumo.jpg', 'metallkraft-resumo.jpg', 'unicraft-resumo.jpg', 'holzkraft-resumo.jpg', 'schweisskraft-resumo.jpg', 'cleancraft-resumo.jpg'],
  xtools: ['aircraft.svg', 'optimum.svg', 'metallkraft.svg', 'unicraft.svg', 'holzkraft.svg', 'schweisskraft.svg', 'cleancraft.svg'],
}

let failed = false
for (const [folder, files] of Object.entries(REQUIRED)) {
  const dir = join(BASE, folder)
  try {
    const list = await readdir(dir)
    const missing = files.filter((f) => !list.includes(f))
    if (missing.length) {
      console.error(`[ERRO] ${folder}/: em falta: ${missing.join(', ')}`)
      failed = true
    }
  } catch (e) {
    console.error(`[ERRO] Pasta nao encontrada ou inacessivel: ${dir}`)
    failed = true
  }
}
if (failed) {
  console.error('\nExecute OPTIMIZAR.bat (ou os scripts em scripts/download-*-thumbnails.js) e volte a fazer o build.')
  process.exit(1)
}
console.log('Thumbnails dos catalogos: todas as pastas e ficheiros OK.')
