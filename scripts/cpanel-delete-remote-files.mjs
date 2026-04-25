/**
 * Apaga ficheiros remotos por SFTP (lista fixa ou argumentos).
 * Uso: node scripts/cpanel-delete-remote-files.mjs --yes /home/navel/public_html/api/test-email.php ...
 */
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { readFileSync } from 'fs'
import { enforceProjectFence, loadCpanelEnv, requireKeys } from './cpanel-env.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

const { env } = loadCpanelEnv()
enforceProjectFence(env)
requireKeys(env, ['CPANEL_SFTP_HOST', 'CPANEL_SFTP_USER'])

const yes = process.argv.includes('--yes')
const paths = process.argv.slice(2).filter((a) => !a.startsWith('--'))

if (!yes) {
  console.error('Acrescenta --yes para apagar remotamente.')
  process.exit(1)
}
if (!paths.length) {
  console.error('Indica caminhos absolutos remotos.')
  process.exit(1)
}

async function connectSftp() {
  const { default: SftpClient } = await import('ssh2-sftp-client')
  const sftp = new SftpClient()
  const opts = {
    host: env.CPANEL_SFTP_HOST,
    port: Number(env.CPANEL_SFTP_PORT || 22),
    username: env.CPANEL_SFTP_USER,
    readyTimeout: 30000,
  }
  if (env.CPANEL_SFTP_KEY_PATH) {
    opts.privateKey = readFileSync(env.CPANEL_SFTP_KEY_PATH)
    if (env.CPANEL_SFTP_PASSPHRASE) opts.passphrase = env.CPANEL_SFTP_PASSPHRASE
  } else if (env.CPANEL_SFTP_PASSWORD) {
    opts.password = env.CPANEL_SFTP_PASSWORD
  } else {
    throw new Error('SFTP sem password nem chave.')
  }
  await sftp.connect(opts)
  return sftp
}

const sftp = await connectSftp()
try {
  for (const p of paths) {
    const norm = p.replace(/\\/g, '/')
    try {
      await sftp.delete(norm)
      console.log('✅ Apagado:', norm)
    } catch (e) {
      const msg = String(e.message || e)
      if (/No such file|not found|2:/i.test(msg)) {
        console.log('— Já não existia:', norm)
      } else {
        console.error('❌', norm, msg)
      }
    }
  }
} finally {
  await sftp.end().catch(() => {})
}
