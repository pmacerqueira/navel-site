/**
 * Injeta scripts/rgpd-locale-{pt,en,es}.json em src/locales/*.json (chave rgpd)
 * e footer.rgpd para o link do rodapé.
 * Executar: node scripts/merge-rgpd-locales.js
 */
import { readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const footerRgpd = { pt: 'RGPD', en: 'GDPR', es: 'RGPD' }

for (const lang of ['pt', 'en', 'es']) {
  const rgpd = JSON.parse(readFileSync(join(__dirname, `rgpd-locale-${lang}.json`), 'utf8'))
  const path = join(root, 'src', 'locales', `${lang}.json`)
  const j = JSON.parse(readFileSync(path, 'utf8'))
  j.rgpd = rgpd
  j.footer = { ...j.footer, rgpd: footerRgpd[lang] }
  writeFileSync(path, JSON.stringify(j))
  console.log('OK', path)
}
