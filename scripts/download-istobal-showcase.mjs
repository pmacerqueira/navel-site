/**
 * Descarrega imagens de marketing usadas na página /istobal (CDN público Magento da ISTOBAL).
 * Executar após aprovação comercial: node scripts/download-istobal-showcase.mjs
 */
import { mkdirSync, writeFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'public', 'images', 'istobal')

const ASSETS = [
  ['hero-bg.png', 'https://www.istobal.com/media/catalog/category/image_97.png'],
  ['showcase-1.png', 'https://www.istobal.com/media/catalog/category/image_104_1.png'],
  ['showcase-2.png', 'https://www.istobal.com/media/catalog/category/Rectangle_285_10_.png'],
  ['showcase-3.png', 'https://www.istobal.com/media/catalog/category/Rectangle_285_8_.png'],
  ['showcase-4.png', 'https://www.istobal.com/media/catalog/category/Rectangle_285_9_.png'],
  ['showcase-5.png', 'https://www.istobal.com/media/catalog/category/image_103_1_1.png'],
]

mkdirSync(outDir, { recursive: true })

for (const [name, url] of ASSETS) {
  const dest = join(outDir, name)
  if (existsSync(dest)) {
    console.log('skip exists', name)
    continue
  }
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NavelAssetSync/1.0)' },
  })
  if (!res.ok) throw new Error(`${name} ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  writeFileSync(dest, buf)
  console.log('OK', name, buf.length)
}
console.log('Done →', outDir)
