/**
 * Repõe o .htaccess da AT_Manut API à versão do repo (sem SetEnv) e guarda
 * uma cópia timestamp do actual antes de substituir.
 *
 * Uso:
 *   node scripts/cpanel-rollback-htaccess.mjs --yes
 */
import SftpClient from 'ssh2-sftp-client'
import { existsSync, readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { enforceProjectFence, loadCpanelEnv, requireKeys } from './cpanel-env.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const NAVEL_SITE = join(__dirname, '..')
const REPO_HTACCESS = join(
  NAVEL_SITE,
  '..',
  'AT_Manut',
  'servidor-cpanel',
  'api',
  '.htaccess',
)

const { env, hasFile } = loadCpanelEnv()
if (!hasFile) process.exit(1)
try { enforceProjectFence(env) } catch (e) { console.error('❌', e.message); process.exit(3) }
requireKeys(env, ['CPANEL_SFTP_HOST', 'CPANEL_SFTP_PORT', 'CPANEL_SFTP_USER'])

const args = new Set(process.argv.slice(2))
const commit = args.has('--yes')

const remoteRoot = (env.CPANEL_REMOTE_ROOT || '/public_html').replace(/\\/g, '/')
const remoteApi = remoteRoot.replace(/\/+$/, '') + '/api'
const remoteHtaccess = `${remoteApi}/.htaccess`

function timestamp() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return (
    d.getUTCFullYear() +
    p(d.getUTCMonth() + 1) +
    p(d.getUTCDate()) +
    '-' +
    p(d.getUTCHours()) +
    p(d.getUTCMinutes()) +
    p(d.getUTCSeconds())
  )
}

async function main() {
  const local = readFileSync(REPO_HTACCESS, 'utf8')
  console.log(`\n=== Rollback .htaccess → versão do repo ===`)
  console.log(`Local:  ${REPO_HTACCESS}  (${local.length} bytes)`)
  console.log(`Remote: ${remoteHtaccess}`)
  if (!commit) {
    console.log('DRY-RUN — re-corre com --yes para aplicar.')
    return
  }

  const sftp = new SftpClient()
  await sftp.connect({
    host: env.CPANEL_SFTP_HOST,
    port: Number(env.CPANEL_SFTP_PORT || 22),
    username: env.CPANEL_SFTP_USER,
    password: env.CPANEL_SFTP_PASSWORD || undefined,
    privateKey:
      env.CPANEL_SFTP_KEY_PATH && existsSync(env.CPANEL_SFTP_KEY_PATH)
        ? readFileSync(env.CPANEL_SFTP_KEY_PATH)
        : undefined,
    passphrase: env.CPANEL_SFTP_PASSPHRASE || undefined,
    readyTimeout: 25000,
  })
  try {
    if (await sftp.exists(remoteHtaccess)) {
      const backup = `${remoteHtaccess}.bak-${timestamp()}`
      await sftp.rename(remoteHtaccess, backup)
      console.log(`Backup: ${backup}`)
    }
    await sftp.put(Buffer.from(local, 'utf8'), remoteHtaccess)
    console.log(`✅ Upload OK: ${remoteHtaccess}`)

    // smoke-test
    const res = await fetch('https://navel.pt/api/data.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ r: 'auth', action: 'login', username: 'x', password: 'x' }),
    })
    const body = await res.text()
    console.log(`\nSmoke-test: ${res.status}  ${body.slice(0, 200)}`)
  } finally {
    try { await sftp.end() } catch {}
  }
}

main().catch((e) => { console.error('❌', e.message || e); process.exit(10) })
