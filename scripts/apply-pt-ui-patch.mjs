/**
 * Deep-merges scripts/pt-ui-patch-data.mjs into src/locales/pt.json
 * Run: node scripts/apply-pt-ui-patch.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { ptUiPatch } from './pt-ui-patch-data.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ptPath = path.join(__dirname, '..', 'src', 'locales', 'pt.json')

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

const existing = JSON.parse(fs.readFileSync(ptPath, 'utf8'))
deepMerge(existing, ptUiPatch)
fs.writeFileSync(ptPath, `${JSON.stringify(existing, null, 2)}\n`, 'utf8')
console.log('Merged ptUiPatch into', ptPath)
