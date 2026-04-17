/**
 * Probe de conectividade ao cPanel.
 * Testa FTPS, SFTP e UAPI com as credenciais em .env.cpanel e reporta
 * quais funcionam + latência aproximada. Nada é escrito remotamente.
 *
 * Uso: npm run deploy:probe
 */
import { enforceProjectFence, loadCpanelEnv, mask } from './cpanel-env.mjs'

const { env, hasFile } = loadCpanelEnv()

if (!hasFile) {
  console.error('\n❌ Não encontrei .env.cpanel (nem .env.cpanel.local).')
  console.error('   Copia .env.cpanel.example para .env.cpanel e preenche.\n')
  process.exit(1)
}

try {
  enforceProjectFence(env)
} catch (err) {
  console.error('\n❌', err.message, '\n')
  process.exit(3)
}

function line(label, ok, detail) {
  const mark = ok ? '✅' : '❌'
  console.log(`${mark} ${label.padEnd(22)} ${detail || ''}`)
}

async function probeFtps() {
  const host = env.CPANEL_FTP_HOST
  const user = env.CPANEL_FTP_USER
  const password = env.CPANEL_FTP_PASSWORD
  const port = Number(env.CPANEL_FTP_PORT || 21)
  const secure = (env.CPANEL_FTP_SECURE || 'true').toLowerCase() !== 'false'
  const strict = (env.CPANEL_FTP_TLS_STRICT || 'true').toLowerCase() !== 'false'
  if (!host || !user || !password) {
    return { ok: false, detail: 'FTPS não configurado (falta host/user/password)' }
  }
  const started = Date.now()
  const { Client } = await import('basic-ftp')
  const client = new Client(15000)
  client.ftp.verbose = false
  try {
    const accessOpts = { host, port, user, password, secure }
    if (secure && !strict) {
      accessOpts.secureOptions = { rejectUnauthorized: false }
    }
    await client.access(accessOpts)
    const cwd = await client.pwd()
    const ms = Date.now() - started
    const tlsNote = secure ? (strict ? 'TLS strict' : 'TLS no-hostname-check') : 'sem TLS'
    return {
      ok: true,
      detail: `${ms}ms · dir=${cwd} · ${tlsNote} · user=${mask(user)}@${host}:${port}`,
    }
  } catch (err) {
    return { ok: false, detail: String(err?.message || err) }
  } finally {
    client.close()
  }
}

async function probeSftp() {
  const host = env.CPANEL_SFTP_HOST
  const user = env.CPANEL_SFTP_USER
  const port = Number(env.CPANEL_SFTP_PORT || 22)
  const password = env.CPANEL_SFTP_PASSWORD
  const keyPath = env.CPANEL_SFTP_KEY_PATH
  if (!host || !user || (!password && !keyPath)) {
    return { ok: false, detail: 'SFTP não configurado (falta host/user/password ou chave)' }
  }
  const started = Date.now()
  const { default: SftpClient } = await import('ssh2-sftp-client')
  const sftp = new SftpClient()
  try {
    const opts = { host, port, username: user, readyTimeout: 15000 }
    if (keyPath) {
      const { readFileSync } = await import('fs')
      opts.privateKey = readFileSync(keyPath)
      if (env.CPANEL_SFTP_PASSPHRASE) opts.passphrase = env.CPANEL_SFTP_PASSPHRASE
    } else {
      opts.password = password
    }
    await sftp.connect(opts)
    const cwd = await sftp.cwd()
    const ms = Date.now() - started
    return { ok: true, detail: `${ms}ms · dir=${cwd} · user=${mask(user)}@${host}:${port}` }
  } catch (err) {
    return { ok: false, detail: String(err?.message || err) }
  } finally {
    try {
      await sftp.end()
    } catch {}
  }
}

async function probeUapi() {
  const host = env.CPANEL_HOST
  const user = env.CPANEL_API_USER
  const token = env.CPANEL_API_TOKEN
  const port = Number(env.CPANEL_API_PORT || 2083)
  if (!host || !user || !token) {
    return { ok: false, detail: 'UAPI não configurado (falta host/user/token)' }
  }
  const started = Date.now()
  try {
    const url = `https://${host}:${port}/execute/StatsBar/get_stats`
    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `cpanel ${user}:${token}` },
      signal: AbortSignal.timeout(15000),
    })
    const ms = Date.now() - started
    if (!res.ok) {
      return { ok: false, detail: `HTTP ${res.status} ${res.statusText}` }
    }
    const body = await res.json().catch(() => ({}))
    const ok = body?.status === 1 || body?.status === true || Array.isArray(body?.data)
    return {
      ok,
      detail: `${ms}ms · status=${res.status} · user=${mask(user)}@${host}:${port}`,
    }
  } catch (err) {
    return { ok: false, detail: String(err?.message || err) }
  }
}

async function main() {
  console.log('\n=== cPanel Probe — www.navel.pt ===\n')
  console.log(`Host base:     ${env.CPANEL_HOST || '(não definido)'}`)
  console.log(`Remote root:   ${env.CPANEL_REMOTE_ROOT || '/public_html'}`)
  console.log(`Protocolo ativo: ${env.CPANEL_PROTOCOL || '(não definido)'}\n`)

  const [ftps, sftp, uapi] = await Promise.all([probeFtps(), probeSftp(), probeUapi()])
  line('FTPS', ftps.ok, ftps.detail)
  line('SFTP', sftp.ok, sftp.detail)
  line('UAPI (API Token)', uapi.ok, uapi.detail)

  const working = [
    ftps.ok && 'ftps',
    sftp.ok && 'sftp',
    uapi.ok && 'uapi',
  ].filter(Boolean)

  console.log('')
  if (!working.length) {
    console.log('Nenhum protocolo funcionou. Vê a secção de troubleshooting em')
    console.log('docs/DEPLOY-AUTOMATICO-CPANEL.md.\n')
    process.exit(2)
  }
  const preferred = env.CPANEL_PROTOCOL && working.includes(env.CPANEL_PROTOCOL)
    ? env.CPANEL_PROTOCOL
    : working[0]
  console.log(`Protocolos OK: ${working.join(', ')}`)
  console.log(`Sugestão CPANEL_PROTOCOL=${preferred}`)
  if (env.CPANEL_PROTOCOL && env.CPANEL_PROTOCOL !== preferred) {
    console.log(
      `(Tens CPANEL_PROTOCOL=${env.CPANEL_PROTOCOL} mas ele falhou — considera mudar para ${preferred}.)`,
    )
  }
  console.log('')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
