/**
 * Manutenção pós-auditoria no servidor cPanel (FTPS), sem abrir o File Manager.
 *
 * Faz automaticamente:
 *   1) Apaga fix-istobal.php na raiz do site (se existir).
 *   3) Cria/envia keep-alive-supabase.secret.php a partir de .env / .env.local (URL + anon key).
 *   4) Se documentos-store/.navel-permissions.json NÃO existir no servidor, envia cópia do .example.
 *
 * Gera ficheiro local (gitignored) com comandos de cron para colares no cPanel:
 *   scripts/.cpanel-cron-paste.txt
 *
 * Uso: npm run cpanel:hygiene -- --yes
 */
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { posix } from 'path'
import { tmpdir } from 'os'
import { enforceProjectFence, loadCpanelEnv, requireKeys } from './cpanel-env.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const CRON_HINTS = join(__dirname, '.cpanel-cron-paste.txt')
const PERM_EXAMPLE = join(ROOT, 'public', 'documentos-store', '.navel-permissions.json.example')
const PHP_CONFIG = join(ROOT, 'public', 'documentos-api-config.php')

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

function loadAppEnv() {
  return {
    ...parseEnvFile(join(ROOT, '.env')),
    ...parseEnvFile(join(ROOT, '.env.local')),
  }
}

function escapePhpSingle(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

function buildKeepAliveSecretPhp(url, anonKey) {
  const u = url.replace(/\/+$/, '')
  return `<?php
declare(strict_types=1);
/**
 * Gerado automaticamente por scripts/cpanel-server-hygiene.mjs — não versionar.
 * O keep-alive-supabase.php lê este ficheiro no servidor.
 */
return [
  'url' => '${escapePhpSingle(u)}',
  'anon_key' => '${escapePhpSingle(anonKey)}',
];
`
}

function extractOnedriveCronToken(phpSource) {
  const m =
    phpSource.match(/['"]onedrive_cron_token['"]\s*=>\s*['"]([^'"]*)['"]/) ||
    phpSource.match(/['"]onedrive_cron_token['"]\s*=>\s*"([^"]*)"/)
  return m ? m[1] : ''
}

async function ftpsConnect(env) {
  requireKeys(env, ['CPANEL_FTP_HOST', 'CPANEL_FTP_USER', 'CPANEL_FTP_PASSWORD'])
  const { Client } = await import('basic-ftp')
  const client = new Client(45000)
  client.ftp.verbose = false
  const secure = (env.CPANEL_FTP_SECURE || 'true').toLowerCase() !== 'false'
  const strict = (env.CPANEL_FTP_TLS_STRICT || 'true').toLowerCase() !== 'false'
  const accessOpts = {
    host: env.CPANEL_FTP_HOST,
    port: Number(env.CPANEL_FTP_PORT || 21),
    user: env.CPANEL_FTP_USER,
    password: env.CPANEL_FTP_PASSWORD,
    secure,
  }
  if (secure && !strict) {
    accessOpts.secureOptions = { rejectUnauthorized: false }
  }
  await client.access(accessOpts)
  return client
}

async function ensureDirRecursive(client, absDir) {
  const parts = absDir.split('/').filter(Boolean)
  let cur = ''
  for (const p of parts) {
    cur += '/' + p
    try {
      await client.ensureDir(cur)
    } catch {
      /* ensureDir pode falhar se já existe — basic-ftp não distingue bem */
    }
  }
}

async function cdToDir(client, absDir) {
  await client.cd('/')
  if (!absDir || absDir === '/') return
  const norm = absDir.replace(/\/+$/, '') || '/'
  await client.cd(norm)
}

async function tryRemoveFile(client, remoteAbsPath) {
  const norm = remoteAbsPath.replace(/\\/g, '/')
  const dir = posix.dirname(norm)
  const base = posix.basename(norm)
  try {
    await cdToDir(client, dir)
    await client.remove(base)
    return true
  } catch (e) {
    const msg = String(e.message || e)
    if (/550|552|553|not found|No such file|does not exist|failed to delete/i.test(msg)) {
      return false
    }
    throw e
  }
}

async function tryDownloadFile(client, remoteAbsPath, localPath) {
  const norm = remoteAbsPath.replace(/\\/g, '/')
  const dir = posix.dirname(norm)
  const base = posix.basename(norm)
  try {
    await cdToDir(client, dir)
    await client.downloadTo(localPath, base)
    return true
  } catch {
    return false
  }
}

async function uploadFile(client, localPath, remoteAbsPath) {
  const norm = remoteAbsPath.replace(/\\/g, '/')
  const dir = posix.dirname(norm)
  const base = posix.basename(norm)
  await ensureDirRecursive(client, dir)
  await cdToDir(client, dir)
  await client.uploadFrom(localPath, base)
  await client.cd('/')
}

function parseArgs(argv) {
  return argv.includes('--yes')
}

async function main() {
  const yes = parseArgs(process.argv.slice(2))
  if (!yes) {
    console.error('Uso: npm run cpanel:hygiene -- --yes')
    process.exit(1)
  }

  const { env, hasFile } = loadCpanelEnv()
  if (!hasFile) {
    console.error('Falta .env.cpanel')
    process.exit(1)
  }
  try {
    enforceProjectFence(env)
  } catch (err) {
    console.error(err.message)
    process.exit(3)
  }

  const cpanelEnv = env
  const remoteRoot = (cpanelEnv.CPANEL_REMOTE_ROOT || '/public_html').replace(/\\/g, '/')
  const siteUrl = (cpanelEnv.CPANEL_PUBLIC_URL || 'https://navel.pt').replace(/\/+$/, '')

  const appEnv = loadAppEnv()
  const supabaseUrl = (appEnv.VITE_SUPABASE_URL || appEnv.SUPABASE_URL || '').trim()
  const supabaseAnon = (appEnv.VITE_SUPABASE_ANON_KEY || appEnv.SUPABASE_ANON_KEY || '').trim()

  let cronToken = ''
  if (existsSync(PHP_CONFIG)) {
    cronToken = extractOnedriveCronToken(readFileSync(PHP_CONFIG, 'utf8'))
  }

  const lines = []
  lines.push('# ── Colar estes comandos no cPanel → Cron Jobs (ou ajustar horários) ──')
  lines.push('# OneDrive: usa POST (evita 403 "Acesso negado" quando o alojamento bloqueia o header X-Cron-Token).')
  lines.push('# Se preferires o header ou ?token=, ver documentos-api-config.sample.php.')
  lines.push('')
  if (cronToken) {
    lines.push(`# OneDrive — token lido do documentos-api-config.php local após build.`)
    lines.push(
      `*/15 * * * * curl -fsS -m 300 -X POST -d "token=${cronToken}" "${siteUrl}/onedrive-cron.php" >> $HOME/logs/onedrive-cron.log 2>&1`,
    )
  } else {
    lines.push('# OneDrive: colar o valor de onedrive_cron_token em TOKEN abaixo.')
    lines.push(
      `*/15 * * * * curl -fsS -m 300 -X POST -d "token=TOKEN" "${siteUrl}/onedrive-cron.php" >> $HOME/logs/onedrive-cron.log 2>&1`,
    )
  }
  lines.push('')
  lines.push('# Supabase keep-alive — 2× por dia (manhã e fim de tarde)')
  lines.push(`0 6,18 * * * curl -fsS -m 45 "${siteUrl}/keep-alive-supabase.php" >> $HOME/logs/supabase-keepalive.log 2>&1`)
  lines.push('')
  writeFileSync(CRON_HINTS, lines.join('\n'), 'utf8')

  const client = await ftpsConnect(cpanelEnv)
  try {
    // 1) Apagar fix-istobal.php
    const fixPath = posix.join(remoteRoot, 'fix-istobal.php').replace(/\\/g, '/')
    const removed = await tryRemoveFile(client, fixPath)
    console.log(removed ? '✅ fix-istobal.php apagado no servidor.' : 'ℹ️  fix-istobal.php já não existia (OK).')

    // 3) keep-alive secret
    if (!supabaseUrl || !supabaseAnon) {
      console.warn(
        '⚠️  Falta VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY no .env — não gerei keep-alive-supabase.secret.php.',
      )
      console.warn('    Adiciona essas linhas ao .env e volta a correr: npm run cpanel:hygiene -- --yes')
    } else {
      const tmpSecret = join(tmpdir(), `navel-keepalive-${Date.now()}.php`)
      writeFileSync(tmpSecret, buildKeepAliveSecretPhp(supabaseUrl, supabaseAnon), 'utf8')
      const remoteSecret = posix.join(remoteRoot, 'keep-alive-supabase.secret.php').replace(/\\/g, '/')
      await uploadFile(client, tmpSecret, remoteSecret)
      try {
        unlinkSync(tmpSecret)
      } catch {}
      console.log('✅ keep-alive-supabase.secret.php enviado para o servidor (URL + anon key).')
    }

    // 4) permissões — só criar se não existir
    const remotePerm = posix
      .join(remoteRoot, 'documentos-store', '.navel-permissions.json')
      .replace(/\\/g, '/')
    const tmpPerm = join(tmpdir(), `navel-perm-check-${Date.now()}.json`)
    const hadFile = await tryDownloadFile(client, remotePerm, tmpPerm)
    let useExisting = false
    if (hadFile) {
      try {
        const st = readFileSync(tmpPerm, 'utf8').trim()
        useExisting = st.length > 5
      } catch {}
      try {
        unlinkSync(tmpPerm)
      } catch {}
    }
    if (useExisting) {
      console.log('ℹ️  .navel-permissions.json já existe no servidor — não sobrescrevi.')
    } else {
      if (!existsSync(PERM_EXAMPLE)) {
        console.error('❌ Falta public/documentos-store/.navel-permissions.json.example no projeto.')
        process.exit(1)
      }
      await uploadFile(client, PERM_EXAMPLE, remotePerm)
      console.log(
        '✅ Criei documentos-store/.navel-permissions.json no servidor (cópia do .example com pastas Comercial / AT).',
      )
      console.log(
        '    Se precisares de restringir por email, edita no File Manager ou pede ajuda — por agora está aberto a parceiros autenticados nas pastas definidas.',
      )
    }
  } finally {
    client.close()
  }

  console.log('')
  console.log('── Próximo passo manual (só isto) ──')
  console.log('Abre o ficheiro no teu PC (tem os comandos exactos do cron):')
  console.log(`   ${CRON_HINTS}`)
  console.log('Depois: cPanel → Cron Jobs → Add New Cron Job → cola as linhas que começam com */15 e 0 6,18')
  console.log('(Apaga entradas antigas do OneDrive que usem ?token= na URL.)')
}

main().catch((err) => {
  console.error('❌', err.message || err)
  process.exit(1)
})
