/**
 * Deep-merges scripts/es-ui-patch-data.mjs into src/locales/es.json
 * Run: node scripts/apply-es-ui-patch.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { esUiPatch } from './es-ui-patch-data.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const esPath = path.join(__dirname, '..', 'src', 'locales', 'es.json')

function deepMerge(target, source) {
  if (!source || typeof source !== 'object') return target
  for (const [k, v] of Object.entries(source)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      if (!target[k] || typeof target[k] !== 'object' || Array.isArray(target[k])) {
        target[k] = {}
      }
      deepMerge(target[k], v)
    } else {
      target[k] = v
    }
  }
  return target
}

const existing = JSON.parse(fs.readFileSync(esPath, 'utf8'))
deepMerge(existing, esUiPatch)
fs.writeFileSync(esPath, `${JSON.stringify(existing, null, 2)}\n`, 'utf8')
console.log('Merged esUiPatch into', esPath)
