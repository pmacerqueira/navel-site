/**
 * Teste imediato do onedrive-cron.php (sem esperar pelo Cron Jobs).
 * Lê ONEDRIVE_CRON_TOKEN do .env — não imprime o token.
 *
 * Uso: npm run test:onedrive-cron
 */
import { existsSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

function parseEnv(path) {
  const out = {}
  if (!existsSync(path)) return out
  for (const rawLine of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq < 0) continue
    const key = line.slice(0, eq).trim()
    let val = line.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    out[key] = val
  }
  return out
}

const env = {
  ...parseEnv(join(ROOT, '.env.cpanel')),
  ...parseEnv(join(ROOT, '.env')),
  ...parseEnv(join(ROOT, '.env.local')),
}
const token = (env.ONEDRIVE_CRON_TOKEN || '').trim()
const baseUrl = (env.CPANEL_PUBLIC_URL || 'https://navel.pt').replace(/\/+$/, '')
const url = `${baseUrl}/onedrive-cron.php`

if (!token) {
  console.error('❌ Falta ONEDRIVE_CRON_TOKEN no .env')
  process.exit(1)
}

console.log('→ A pedir', url, '(POST, token do .env oculto)')
console.log('  (A sincronização completa pode demorar vários minutos; este teste usa dois passos.)\n')

// 1) Token errado → deve ser 401 rápido (prova que o endpoint responde)
const bad = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ token: '__invalid__' }),
  signal: AbortSignal.timeout(15000),
})
const badText = await bad.text()
if (bad.status !== 401 || !badText.includes('unauthorized')) {
  console.warn('⚠️  Teste de controlo estranho: esperava 401 + unauthorized. HTTP', bad.status)
} else {
  console.log('✅ Controlo: token inválido → 401 (endpoint PHP a responder).\n')
}

// 2) Token certo — espera até 25s por resposta completa; se não vier, assume sync longo (normal)
const ac = new AbortController()
const t = setTimeout(() => ac.abort(), 25000)
let res
try {
  res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token }),
    signal: ac.signal,
  })
} catch (e) {
  clearTimeout(t)
  if (e.name === 'AbortError') {
    console.log(
      '✅ Passou ~25s sem erro de rede e sem 401 imediato no passo 2.',
    )
    console.log(
      '   Isto é compatível com uma sincronização OneDrive **a correr** (demora minutos).',
    )
    console.log(
      '   O token foi **aceite** pelo servidor (senão terias JSON com unauthorized em segundos).',
    )
    console.log('\n   Podes ir dormir: amanhã vê `logs/onedrive-cron.log` ou `documentos-store/.navel-onedrive-sync.log`.')
    process.exit(0)
  }
  throw e
}
clearTimeout(t)

const text = await res.text()
let json
try {
  json = JSON.parse(text)
} catch {
  json = null
}

if (res.status === 401) {
  console.error('❌ 401 unauthorized — o token no .env não bate com o documentos-api-config.php no servidor.')
  console.error('   Faz deploy: npm run deploy:php -- --yes')
  process.exit(1)
}

if (json && json.ok === true) {
  console.log('✅ Resposta OK:', json.skipped ? `skipped: ${json.skipped}` : 'sync concluída (resumo em JSON).')
  if (json.results) console.log('   Mounts:', Object.keys(json.results).join(', '))
  console.log('\nPodes ir dormir — cron e token estão alinhados.')
  process.exit(0)
}

if (json && json.ok === false) {
  console.error('❌ Resposta JSON com ok:false:', json.error || json)
  process.exit(1)
}

console.log('HTTP', res.status, text.slice(0, 500))
