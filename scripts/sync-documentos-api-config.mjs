/**
 * Lê VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY do .env e actualiza
 * public/documentos-api-config.php (só as chaves supabase_*), preservando o resto
 * (at_integration_bearer, OneDrive, etc.).
 *
 * Assim o ficheiro fica alinhado com o projecto antes de `vite build` copiar para dist/.
 * Executado em prebuild; se .env não existir ou faltar valores, avisa e não falha.
 */
import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const envPath = join(root, '.env')
const target = join(root, 'public', 'documentos-api-config.php')
const sample = join(root, 'public', 'documentos-api-config.sample.php')

function parseEnv(text) {
  const out = {}
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    const key = t.slice(0, eq).trim()
    let val = t.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    out[key] = val
  }
  return out
}

function escapePhpSingleQuoted(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

function replaceKey(content, key, value) {
  const esc = escapePhpSingleQuoted(value)
  const re = new RegExp(`('${key}'\\s*=>\\s*)'(?:\\\\'|[^'])*'`, 'm')
  if (!re.test(content)) {
    return null
  }
  return content.replace(re, `$1'${esc}'`)
}

function looksPlaceholder(url, anon) {
  if (!url || !anon) return true
  const u = url.toLowerCase()
  if (u.includes('seu-projeto') || u.includes('placeholder')) return true
  if (anon === 'COLE_AQUI_A_SUPABASE_ANON_KEY' || anon.length < 20) return true
  return false
}

if (!existsSync(envPath)) {
  console.log('[sync-documentos-api-config] Sem .env — não actualizo documentos-api-config.php')
  process.exit(0)
}

let env
try {
  env = parseEnv(readFileSync(envPath, 'utf8'))
} catch {
  console.warn('[sync-documentos-api-config] Não foi possível ler .env')
  process.exit(0)
}

const url = (env.VITE_SUPABASE_URL || '').trim()
const anon = (env.VITE_SUPABASE_ANON_KEY || '').trim()

if (looksPlaceholder(url, anon)) {
  console.warn(
    '[sync-documentos-api-config] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY em falta ou ainda placeholders no .env — não altero documentos-api-config.php',
  )
  process.exit(0)
}

let content
if (existsSync(target)) {
  content = readFileSync(target, 'utf8')
} else {
  if (!existsSync(sample)) {
    console.error('[sync-documentos-api-config] Falta documentos-api-config.sample.php')
    process.exit(1)
  }
  copyFileSync(sample, target)
  content = readFileSync(target, 'utf8')
  console.log('[sync-documentos-api-config] Criei public/documentos-api-config.php a partir do sample')
}

let next = content
let n = replaceKey(next, 'supabase_url', url)
if (n === null) {
  console.error('[sync-documentos-api-config] Não encontrei supabase_url no PHP')
  process.exit(1)
}
next = n
n = replaceKey(next, 'supabase_anon_key', anon)
if (n === null) {
  console.error('[sync-documentos-api-config] Não encontrei supabase_anon_key no PHP')
  process.exit(1)
}
next = n

writeFileSync(target, next, 'utf8')
console.log('[sync-documentos-api-config] Actualizado supabase_url e supabase_anon_key em public/documentos-api-config.php')
