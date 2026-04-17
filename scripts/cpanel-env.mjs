/**
 * Utilitário partilhado: carrega .env.cpanel (ou .env.cpanel.local) sem dotenv.
 * Mantém zero dependências runtime — só usa fs/path/url.
 */
import { existsSync, readFileSync } from 'fs'
import { basename, join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const ROOT_NAME = basename(ROOT).toLowerCase()

function parseEnvFile(path) {
  const out = {}
  if (!existsSync(path)) return out
  const text = readFileSync(path, 'utf8')
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq < 0) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    out[key] = value
  }
  return out
}

export function loadCpanelEnv() {
  const primary = join(ROOT, '.env.cpanel')
  const local = join(ROOT, '.env.cpanel.local')
  const merged = { ...parseEnvFile(primary), ...parseEnvFile(local) }
  for (const [k, v] of Object.entries(merged)) {
    if (process.env[k] === undefined) process.env[k] = v
  }
  return {
    ROOT,
    env: merged,
    hasFile: existsSync(primary) || existsSync(local),
  }
}

export function mask(value) {
  if (!value) return '(vazio)'
  if (value.length <= 4) return '*'.repeat(value.length)
  return value.slice(0, 2) + '*'.repeat(value.length - 4) + value.slice(-2)
}

export function requireKeys(env, keys) {
  const missing = keys.filter((k) => !env[k])
  if (missing.length) {
    throw new Error(
      `Faltam variáveis em .env.cpanel: ${missing.join(', ')}\n` +
        `Copia .env.cpanel.example para .env.cpanel e preenche os campos.`,
    )
  }
}

/**
 * Project fence — este pipeline é EXCLUSIVO do navel-site / www.navel.pt.
 *
 * Outros projectos NAVEL no workspace (AT_Manut, app-stocks-next em Vercel,
 * navel-propostas, app-ftecnicas, etc.) têm stacks e destinos de deploy
 * diferentes. Este script NÃO deve ser copiado nem reutilizado cegamente
 * noutros repos — causaria uploads para o servidor errado.
 *
 * Guardas:
 *   1. Deve executar a partir da raiz `navel-site/`.
 *   2. `CPANEL_HOST` / `CPANEL_FTP_HOST` / `CPANEL_SFTP_HOST` têm de estar
 *      no domínio `navel.pt` (ou subdomínios). Se algum deles apontar para
 *      outro domínio, aborta.
 */
export function enforceProjectFence(env) {
  if (ROOT_NAME !== 'navel-site') {
    throw new Error(
      `Fence NAVEL: este pipeline de deploy cPanel é exclusivo do projecto ` +
        `'navel-site'. Detectado: '${ROOT_NAME}'. Para outros projectos do ` +
        `workspace NAVEL (ex.: Vercel, AT_Manut, etc.) usar o próprio fluxo ` +
        `de cada repo — não copiar este script.`,
    )
  }
  const hosts = [env.CPANEL_HOST, env.CPANEL_FTP_HOST, env.CPANEL_SFTP_HOST]
    .filter(Boolean)
    .map((h) => h.toLowerCase().trim())
  for (const h of hosts) {
    const ok = h === 'navel.pt' || h.endsWith('.navel.pt')
    if (!ok) {
      throw new Error(
        `Fence NAVEL: host '${h}' não pertence ao domínio navel.pt.\n` +
          `Este pipeline só suporta www.navel.pt. Outros domínios/projectos ` +
          `devem usar as suas próprias ferramentas de deploy (ex.: Vercel CLI).`,
      )
    }
  }
}
