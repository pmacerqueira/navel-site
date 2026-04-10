/**
 * Copia scripts/privacy-locale-{pt,en,es}.json para src/locales/*.json → chave privacy
 * Executar: node scripts/merge-privacy-locales.js
 */
import { readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

for (const lang of ['pt', 'en', 'es']) {
  const privacy = JSON.parse(readFileSync(join(__dirname, `privacy-locale-${lang}.json`), 'utf8'))
  const path = join(root, 'src', 'locales', `${lang}.json`)
  const j = JSON.parse(readFileSync(path, 'utf8'))
  j.privacy = privacy
  writeFileSync(path, JSON.stringify(j))
  console.log('OK', path)
}
