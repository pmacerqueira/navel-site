/**
 * Deploy automático para cPanel (www.navel.pt).
 *
 * Suporta FTPS (default), SFTP e UAPI (cPanel API Token) com upload
 * incremental por hash SHA-1 (.cpanel-deploy-cache.json).
 *
 * Uso:
 *   npm run deploy:probe                     # testa conectividade
 *   npm run deploy:dry                       # mostra o que iria enviar
 *   npm run deploy:php                       # public/*.php → public_html/
 *   npm run deploy:site                      # dist/ → public_html/
 *   npm run deploy:zips                      # ../cpanel-upload/*.zip → public_html/_deploy-zips/
 *   npm run deploy:file -- public/documentos-api.php
 *   npm run deploy:all                       # site + php (NÃO inclui zips nem catalogos)
 *   npm run deploy:at-manut                  # ../AT_Manut/dist → public_html/manut/
 *
 * Flags:
 *   --dry             mostra só; NÃO envia (default se faltar --yes)
 *   --yes             confirma envio real
 *   --force           ignora cache de hashes (envia tudo)
 *   --protocol=X      override (ftps|sftp|uapi)
 *   --file=CAMINHO    envia um ficheiro específico
 *   --php             inclui public/*.php
 *   --site            inclui dist/ (PDFs em catalogos/ e images/catalogos/ excluídos;
 *                     catalogos/index.html e catalogos/README.md enviam sempre se existirem)
 *   --with-catalogos  no --site, inclui também PDFs em dist/catalogos/ e dist/images/catalogos/
 *   --zips            inclui ../cpanel-upload/*.zip em _deploy-zips/
 *   --all             = --site + --php  (NÃO inclui --zips nem catálogos)
 *   --at-manut        ../AT_Manut/dist → {remote}/manut/ (PWA AT_Manut)
 *   --remote=/PATH    override do remote root
 */
import { createHash } from 'crypto'
import {
  createReadStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'fs'
import { basename, dirname, join, relative, resolve, posix } from 'path'
import { fileURLToPath } from 'url'
import { createInterface } from 'readline'
import { enforceProjectFence, loadCpanelEnv, requireKeys } from './cpanel-env.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const NAVEL_SITE = join(__dirname, '..')
const NAVEL_ROOT = join(NAVEL_SITE, '..')
const AT_MANUT_DIST = join(NAVEL_ROOT, 'AT_Manut', 'dist')
const CPANEL_UPLOAD = join(NAVEL_ROOT, 'cpanel-upload')
const CACHE_FILE = join(__dirname, '.cpanel-deploy-cache.json')

// ---------------------------------------------------------------------------
// Argumentos
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const out = { _: [], flags: new Set(), opts: {} }
  for (const raw of argv) {
    if (raw.startsWith('--')) {
      const body = raw.slice(2)
      const eq = body.indexOf('=')
      if (eq > 0) out.opts[body.slice(0, eq)] = body.slice(eq + 1)
      else out.flags.add(body)
    } else {
      out._.push(raw)
    }
  }
  return out
}
const args = parseArgs(process.argv.slice(2))

const { env, hasFile } = loadCpanelEnv()
if (!hasFile) {
  console.error('\n❌ Falta .env.cpanel. Copia .env.cpanel.example para .env.cpanel.\n')
  process.exit(1)
}

try {
  enforceProjectFence(env)
} catch (err) {
  console.error('\n❌', err.message, '\n')
  process.exit(3)
}

const protocol = (args.opts.protocol || env.CPANEL_PROTOCOL || 'ftps').toLowerCase()
const remoteRoot = (args.opts.remote || env.CPANEL_REMOTE_ROOT || '/public_html').replace(/\\/g, '/')
const force = args.flags.has('force')
const yes = args.flags.has('yes')
const dry = args.flags.has('dry') || !yes

// ---------------------------------------------------------------------------
// Recolha de ficheiros
// ---------------------------------------------------------------------------
function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const s = statSync(full)
    if (s.isDirectory()) out.push(...walk(full))
    else out.push(full)
  }
  return out
}

function toRemote(localAbs, baseAbs, subPrefix = '') {
  const rel = relative(baseAbs, localAbs).replace(/\\/g, '/')
  return posix.join(remoteRoot, subPrefix, rel)
}

function hashFile(path) {
  const h = createHash('sha1')
  h.update(readFileSync(path))
  return h.digest('hex')
}

const SITE_EXCLUDE_DIRS = ['catalogos', 'images/catalogos']
/** Sem --with-catalogos: não enviar PDFs em dist/catalogos/ mas permitir shell pré-renderizado. */
const CATALOGOS_ALLOW_FILES = new Set(['catalogos/index.html', 'catalogos/README.md'])

function isSiteExcluded(relPath) {
  if (args.flags.has('with-catalogos')) return false
  if (CATALOGOS_ALLOW_FILES.has(relPath)) return false
  return SITE_EXCLUDE_DIRS.some((ex) => relPath === ex || relPath.startsWith(ex + '/'))
}

function collectFiles() {
  const want = {
    site: args.flags.has('site') || args.flags.has('all'),
    php: args.flags.has('php') || args.flags.has('all'),
    zips: args.flags.has('zips'),
    one: args.opts.file,
  }
  const files = []

  if (want.one) {
    const localAbs = resolve(want.one)
    if (!existsSync(localAbs)) {
      throw new Error(`Ficheiro não encontrado: ${want.one}`)
    }
    const baseAbs =
      localAbs.startsWith(join(NAVEL_SITE, 'public') + '\\') ||
      localAbs.startsWith(join(NAVEL_SITE, 'public') + '/')
        ? join(NAVEL_SITE, 'public')
        : dirname(localAbs)
    files.push({ local: localAbs, remote: toRemote(localAbs, baseAbs) })
  }

  if (want.site) {
    const dist = join(NAVEL_SITE, 'dist')
    if (!existsSync(dist)) {
      throw new Error('dist/ não existe. Corre "npm run build" primeiro.')
    }
    for (const f of walk(dist)) {
      const rel = relative(dist, f).replace(/\\/g, '/')
      if (isSiteExcluded(rel)) continue
      files.push({ local: f, remote: toRemote(f, dist) })
    }
  }

  if (want.php) {
    const publicDir = join(NAVEL_SITE, 'public')
    for (const name of readdirSync(publicDir)) {
      if (!name.endsWith('.php')) continue
      const full = join(publicDir, name)
      files.push({ local: full, remote: posix.join(remoteRoot, name) })
    }
  }

  if (want.zips) {
    if (!existsSync(CPANEL_UPLOAD)) {
      throw new Error(
        `Pasta ${CPANEL_UPLOAD} não existe. Corre "npm run cpanel:pack" primeiro.`,
      )
    }
    for (const name of readdirSync(CPANEL_UPLOAD)) {
      if (!name.endsWith('.zip')) continue
      const full = join(CPANEL_UPLOAD, name)
      files.push({ local: full, remote: posix.join(remoteRoot, '_deploy-zips', name) })
    }
  }

  if (args.flags.has('at-manut')) {
    if (!existsSync(AT_MANUT_DIST)) {
      throw new Error(
        'AT_Manut/dist não existe. Corre "npm run build" em ../AT_Manut primeiro.',
      )
    }
    const manutRemoteRoot = posix.join(remoteRoot.replace(/\/$/, ''), 'manut')
    for (const f of walk(AT_MANUT_DIST)) {
      const rel = relative(AT_MANUT_DIST, f).replace(/\\/g, '/')
      files.push({ local: f, remote: posix.join(manutRemoteRoot, rel) })
    }
  }

  return files
}

// ---------------------------------------------------------------------------
// Cache de hashes (upload incremental)
// ---------------------------------------------------------------------------
function loadCache() {
  try {
    return JSON.parse(readFileSync(CACHE_FILE, 'utf8'))
  } catch {
    return {}
  }
}
function saveCache(cache) {
  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8')
}

function applyCacheFilter(files, cache) {
  const skipped = []
  const changed = []
  for (const f of files) {
    const h = hashFile(f.local)
    f.hash = h
    f.size = statSync(f.local).size
    const key = f.remote
    if (!force && cache[key] === h) skipped.push(f)
    else changed.push(f)
  }
  return { skipped, changed }
}

// ---------------------------------------------------------------------------
// Uploaders por protocolo
// ---------------------------------------------------------------------------
async function ensureRemoteDirsFtps(client, dirs) {
  for (const d of [...dirs].sort()) {
    if (!d || d === '/' || d === '.') continue
    try {
      await client.ensureDir(d)
    } catch (err) {
      throw new Error(`FTPS: falha a criar ${d}: ${err.message}`)
    }
  }
  await client.cd('/')
}

async function uploadFtps(files, onProgress) {
  requireKeys(env, ['CPANEL_FTP_HOST', 'CPANEL_FTP_USER', 'CPANEL_FTP_PASSWORD'])
  const { Client } = await import('basic-ftp')
  const client = new Client(30000)
  client.ftp.verbose = false
  try {
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
    const dirs = new Set(files.map((f) => posix.dirname(f.remote)))
    await ensureRemoteDirsFtps(client, dirs)
    let done = 0
    for (const f of files) {
      const remoteDir = posix.dirname(f.remote)
      const remoteName = posix.basename(f.remote)
      await client.cd(remoteDir)
      await client.uploadFrom(f.local, remoteName)
      await client.cd('/')
      done++
      onProgress(done, files.length, f)
    }
  } finally {
    client.close()
  }
}

async function uploadSftp(files, onProgress) {
  requireKeys(env, ['CPANEL_SFTP_HOST', 'CPANEL_SFTP_USER'])
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
    throw new Error('SFTP sem password nem chave privada.')
  }
  try {
    await sftp.connect(opts)
    const dirs = new Set(files.map((f) => posix.dirname(f.remote)))
    for (const d of [...dirs].sort()) {
      if (!d || d === '/' || d === '.') continue
      const exists = await sftp.exists(d)
      if (!exists) await sftp.mkdir(d, true)
    }
    let done = 0
    for (const f of files) {
      await sftp.fastPut(f.local, f.remote)
      done++
      onProgress(done, files.length, f)
    }
  } finally {
    try {
      await sftp.end()
    } catch {}
  }
}

async function uploadUapi(files, onProgress) {
  requireKeys(env, ['CPANEL_HOST', 'CPANEL_API_USER', 'CPANEL_API_TOKEN'])
  const host = env.CPANEL_HOST
  const user = env.CPANEL_API_USER
  const token = env.CPANEL_API_TOKEN
  const port = Number(env.CPANEL_API_PORT || 2083)
  let done = 0
  for (const f of files) {
    const remoteDir = posix.dirname(f.remote)
    const remoteName = posix.basename(f.remote)
    const url = new URL(`https://${host}:${port}/execute/Fileman/upload_files`)
    url.searchParams.set('dir', remoteDir)
    url.searchParams.set('overwrite', '1')
    const form = new FormData()
    const data = readFileSync(f.local)
    const blob = new Blob([data])
    form.append('file-1', blob, remoteName)
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `cpanel ${user}:${token}` },
      body: form,
      signal: AbortSignal.timeout(120000),
    })
    if (!res.ok) {
      throw new Error(`UAPI ${f.remote}: HTTP ${res.status} ${res.statusText}`)
    }
    const body = await res.json().catch(() => ({}))
    if (body?.status !== 1 && body?.status !== true) {
      throw new Error(`UAPI ${f.remote}: ${JSON.stringify(body?.errors || body)}`)
    }
    done++
    onProgress(done, files.length, f)
  }
}

// ---------------------------------------------------------------------------
// Confirmação interativa
// ---------------------------------------------------------------------------
function prompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((res) => {
    rl.question(question, (ans) => {
      rl.close()
      res(ans)
    })
  })
}

function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  if (
    !args.opts.file &&
    !args.flags.has('site') &&
    !args.flags.has('php') &&
    !args.flags.has('zips') &&
    !args.flags.has('all') &&
    !args.flags.has('at-manut')
  ) {
    console.error('Indica o que queres enviar: --site / --php / --zips / --all / --at-manut / --file=PATH')
    console.error('Ex.: npm run deploy:dry -- --all')
    process.exit(1)
  }

  const files = collectFiles()
  if (!files.length) {
    console.log('Nada a enviar (0 ficheiros).')
    return
  }

  const cache = loadCache()
  const { skipped, changed } = applyCacheFilter(files, cache)

  console.log('\n=== cPanel Deploy ===')
  console.log(`Protocolo:   ${protocol}`)
  console.log(`Remote root: ${remoteRoot}`)
  console.log(`Modo:        ${dry ? 'DRY-RUN (nada será escrito)' : 'ENVIO REAL'}${force ? ' · --force' : ''}`)
  console.log('')

  if (skipped.length) {
    console.log(`• ${skipped.length} ficheiro(s) sem alterações (ignorados via cache)`)
  }
  console.log(`• ${changed.length} ficheiro(s) a enviar:`)
  const totalSize = changed.reduce((acc, f) => acc + f.size, 0)
  for (const f of changed.slice(0, 40)) {
    console.log(`    ${f.remote}   (${fmtSize(f.size)})`)
  }
  if (changed.length > 40) console.log(`    … e mais ${changed.length - 40}`)
  console.log(`  Total: ${fmtSize(totalSize)}`)
  console.log('')

  if (!changed.length) {
    console.log('Nada mudou. Usa --force para forçar re-envio.\n')
    return
  }

  if (dry) {
    console.log('Dry-run. Para enviar realmente: acrescenta --yes.\n')
    return
  }

  if (!yes) {
    const answer = await prompt(
      `Confirmas envio de ${changed.length} ficheiro(s) via ${protocol.toUpperCase()}? (s/N) `,
    )
    if (!/^(s|sim|y|yes)$/i.test(answer.trim())) {
      console.log('Cancelado.')
      return
    }
  } else {
    console.log(`(--yes passado; a enviar ${changed.length} ficheiro(s) via ${protocol.toUpperCase()})`)
  }

  const started = Date.now()
  const onProgress = (done, total, f) => {
    const pct = String(Math.round((done / total) * 100)).padStart(3)
    process.stdout.write(`\r  [${pct}%] ${done}/${total}  ${f.remote.slice(-60)}           `)
  }

  if (protocol === 'sftp') await uploadSftp(changed, onProgress)
  else if (protocol === 'uapi') await uploadUapi(changed, onProgress)
  else await uploadFtps(changed, onProgress)

  process.stdout.write('\n')
  for (const f of changed) cache[f.remote] = f.hash
  saveCache(cache)
  const secs = ((Date.now() - started) / 1000).toFixed(1)
  console.log(`\n✅ Concluído em ${secs}s. Cache actualizada.\n`)
}

main().catch((err) => {
  console.error('\n❌', err?.message || err)
  if (process.env.DEBUG) console.error(err)
  process.exit(1)
})
