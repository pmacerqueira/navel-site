/**
 * Lê variáveis de ambiente e actualiza public/documentos-api-config.php:
 *   - supabase_url, supabase_anon_key (para /auth/v1/user no PHP)
 *   - onedrive_cron_token (opcional)
 *
 * Fontes (merge): primeiro `.env` na raiz do navel-site, depois sobrescreve com
 * `../.navel-secrets/navel-secrets.env` se existir — o ficheiro da workspace NAVEL
 * é a fonte de verdade e evita sobrescrever com um .env local desactualizado.
 *
 * Segurança:
 *   - DOCUMENTOS_API_CONFIG_SYNC=0 no .env → não altera o PHP (útil em CI ou máquinas sem secrets).
 *   - Nunca grava chaves vazias / placeholders / sb_secret_* no campo anon.
 *   - Backup do PHP actual em .doc-api-config-backups/ antes de gravar (fora de public/).
 *
 * Executado no prebuild; falhas de leitura → aviso e exit 0 (não bloqueia quem não tem .env).
 */
import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const envPath = join(root, '.env')
const secretsPath = join(root, '..', '.navel-secrets', 'navel-secrets.env')
const target = join(root, 'public', 'documentos-api-config.php')
const sample = join(root, 'public', 'documentos-api-config.sample.php')
const backupDir = join(root, '.doc-api-config-backups')

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

function extractPhpString(content, key) {
  const re = new RegExp(`'${key}'\\s*=>\\s*'((?:\\\\'|[^'])*)'`, 'm')
  const m = content.match(re)
  if (!m) return null
  return m[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\')
}

function looksPlaceholder(url, anon) {
  if (!url || !anon) return true
  const u = url.toLowerCase()
  if (u.includes('seu-projeto') || u.includes('placeholder')) return true
  if (anon === 'COLE_AQUI_A_SUPABASE_ANON_KEY' || anon.length < 20) return true
  return false
}

function looksLikeServiceRoleInAnonField(anon) {
  return typeof anon === 'string' && anon.startsWith('sb_secret_')
}

function loadMergedEnv() {
  const merged = {}
  const sources = []

  if (existsSync(envPath)) {
    try {
      Object.assign(merged, parseEnv(readFileSync(envPath, 'utf8')))
      sources.push('.env')
    } catch {
      console.warn('[sync-documentos-api-config] Não foi possível ler .env')
    }
  }

  if (existsSync(secretsPath)) {
    try {
      const fromSecrets = parseEnv(readFileSync(secretsPath, 'utf8'))
      Object.assign(merged, fromSecrets)
      sources.push(join('..', '.navel-secrets', 'navel-secrets.env'))
    } catch {
      console.warn('[sync-documentos-api-config] Não foi possível ler navel-secrets.env')
    }
  }

  return { merged, sources }
}

// Opt-out explícito (variável de ambiente do processo OU dentro do .env)
if (process.env.DOCUMENTOS_API_CONFIG_SYNC === '0') {
  console.log('[sync-documentos-api-config] DOCUMENTOS_API_CONFIG_SYNC=0 — não altero documentos-api-config.php')
  process.exit(0)
}

const { merged: env, sources } = loadMergedEnv()

if (sources.length === 0) {
  console.log('[sync-documentos-api-config] Sem .env nem ..\\.navel-secrets\\navel-secrets.env — não altero documentos-api-config.php')
  process.exit(0)
}

if (env.DOCUMENTOS_API_CONFIG_SYNC === '0') {
  console.log('[sync-documentos-api-config] DOCUMENTOS_API_CONFIG_SYNC=0 no ficheiro de env — não altero documentos-api-config.php')
  process.exit(0)
}

if (sources.length > 0) {
  console.log(`[sync-documentos-api-config] Fontes de variáveis: ${sources.join(' → ')}`)
}

const url = (env.VITE_SUPABASE_URL || '').trim()
const anon = (env.VITE_SUPABASE_ANON_KEY || '').trim()

if (looksLikeServiceRoleInAnonField(anon)) {
  console.error(
    '[sync-documentos-api-config] VITE_SUPABASE_ANON_KEY parece ser sb_secret_* (service role). Use a chave anon / publishable. Não altero documentos-api-config.php.',
  )
  process.exit(1)
}

if (looksPlaceholder(url, anon)) {
  console.warn(
    '[sync-documentos-api-config] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY em falta ou placeholders — não altero documentos-api-config.php (evita apagar chaves de produção no prebuild).',
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

const initialPhp = content

const prevUrl = extractPhpString(content, 'supabase_url')
const prevAnon = extractPhpString(content, 'supabase_anon_key')
if (prevUrl !== null && prevAnon !== null && !looksPlaceholder(prevUrl, prevAnon)) {
  if (prevUrl !== url || prevAnon !== anon) {
    console.warn(
      '[sync-documentos-api-config] AVISO: supabase_url ou supabase_anon_key no PHP vão mudar em relação ao ficheiro actual. Confirme que isto é intencional (alinhamento com Supabase Dashboard).',
    )
  }
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

const cronTok = (env.ONEDRIVE_CRON_TOKEN || '').trim()
if (cronTok) {
  const beforeCron = next
  const r = replaceKey(next, 'onedrive_cron_token', cronTok)
  if (r !== null) {
    next = r
    if (r !== beforeCron) {
      console.log('[sync-documentos-api-config] Actualizado onedrive_cron_token a partir de ONEDRIVE_CRON_TOKEN')
    }
  } else {
    console.warn(
      '[sync-documentos-api-config] ONEDRIVE_CRON_TOKEN definido mas não encontrei onedrive_cron_token no PHP',
    )
  }
}

if (next === initialPhp) {
  console.log('[sync-documentos-api-config] Nenhuma alteração necessária em documentos-api-config.php')
  process.exit(0)
}

try {
  mkdirSync(backupDir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const backupFile = join(backupDir, `documentos-api-config.php.${stamp}.bak`)
  copyFileSync(target, backupFile)
  console.log(`[sync-documentos-api-config] Backup: ${backupFile}`)
} catch (e) {
  console.warn('[sync-documentos-api-config] Não foi possível criar backup (continuo a gravar):', e.message)
}

writeFileSync(target, next, 'utf8')
console.log('[sync-documentos-api-config] Actualizado supabase_url e supabase_anon_key em public/documentos-api-config.php')
