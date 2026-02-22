/**
 * Download brand logos from Rolnorte to public/brands/
 * Run: node scripts/download-brands.js
 */
import { writeFile } from 'fs/promises'
import { mkdir } from 'fs/promises'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BRANDS_DIR = `${__dirname}/../public/brands`

const ROLNORTE_LOGOS = {
  eurotrod: 'https://rolnorte.pt/wp-content/uploads/2022/01/EUROTROD.webp',
  kranzle: 'https://rolnorte.pt/wp-content/uploads/2022/01/Kranzle.webp',
  kroftools: 'https://rolnorte.pt/wp-content/uploads/2022/01/KrofTools.webp',
  lenox: 'https://rolnorte.pt/wp-content/uploads/2022/01/LENOX.webp',
  rodcraft: 'https://rolnorte.pt/wp-content/uploads/2023/09/Rodcraft-1.webp',
  skf: 'https://rolnorte.pt/wp-content/uploads/2022/01/SKF.webp',
  stanley: 'https://rolnorte.pt/wp-content/uploads/2022/01/Stanley.webp',
  telwin: 'https://rolnorte.pt/wp-content/uploads/2022/01/Telwin.webp',
  toptul: 'https://rolnorte.pt/wp-content/uploads/2022/01/Toptul.webp',
}

async function download(url, filepath) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`)
  const buffer = Buffer.from(await res.arrayBuffer())
  const dir = dirname(filepath)
  await mkdir(dir, { recursive: true })
  await writeFile(filepath, buffer)
  console.log(`OK: ${filepath}`)
}

async function main() {
  await mkdir(BRANDS_DIR, { recursive: true })
  for (const [name, url] of Object.entries(ROLNORTE_LOGOS)) {
    const ext = url.includes('.webp') ? 'webp' : 'png'
    const filepath = `${BRANDS_DIR}/${name}.${ext}`
    try {
      await download(url, filepath)
    } catch (err) {
      console.error(`ERRO ${name}:`, err.message)
    }
  }
  console.log('\nNota: Beta, Milwaukee e Kaeser já existem em /. Fluke e Kaeser não estão na página Marcas da Rolnorte.')
}

main()
