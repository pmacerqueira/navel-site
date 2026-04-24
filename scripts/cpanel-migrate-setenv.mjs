/**
 * Migra segredos do AT_Manut (public_html/api/) de config.deploy-secrets.php
 * para SetEnv no .htaccess — recomendação CiberConceito (ticket #225838).
 *
 * Modo de funcionamento:
 *   1. SFTP ao navel.pt (usando .env.cpanel existente).
 *   2. Download de  {remote}/api/config.deploy-secrets.php  (legível só pelo
 *      dono; contém putenv('ATM_*=...')).
 *   3. Download do .htaccess actual para preservar regras já aplicadas.
 *   4. Geração local (em memória) do novo .htaccess com bloco SetEnv no topo +
 *      conteúdo existente (sem o bloco de exemplo comentado).
 *   5. Upload do .htaccess.bak-YYYYMMDD-HHMMSS antes de substituir.
 *   6. Upload do novo .htaccess.
 *   7. Smoke-test HTTPS ao endpoint /api/data.php.
 *
 * Uso:
 *   node scripts/cpanel-migrate-setenv.mjs                  # dry-run
 *   node scripts/cpanel-migrate-setenv.mjs --yes            # executa alterações
 *   node scripts/cpanel-migrate-setenv.mjs --yes --remove-fallback
 *                                                          # renomeia config.deploy-secrets.php
 *                                                          # para .disabled (não apaga)
 *
 * Segurança:
 *   - Valores reais nunca são impressos no stdout (apenas máscara).
 *   - Ficheiros temporários locais caem em ../cpanel-upload/setenv-tmp e são
 *     apagados no fim (ou preservados com --keep-tmp para inspecção).
 */
import SftpClient from 'ssh2-sftp-client'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createHash } from 'crypto'
import { enforceProjectFence, loadCpanelEnv, mask, requireKeys } from './cpanel-env.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const NAVEL_SITE = join(__dirname, '..')
const TMP_DIR = join(NAVEL_SITE, '..', 'cpanel-upload', 'setenv-tmp')

function parseArgs(argv) {
  const out = { flags: new Set(), opts: {} }
  for (const raw of argv) {
    if (!raw.startsWith('--')) continue
    const body = raw.slice(2)
    const eq = body.indexOf('=')
    if (eq > 0) out.opts[body.slice(0, eq)] = body.slice(eq + 1)
    else out.flags.add(body)
  }
  return out
}

const args = parseArgs(process.argv.slice(2))
const dry = !args.flags.has('yes')
const keepTmp = args.flags.has('keep-tmp')
const removeFallback = args.flags.has('remove-fallback')

const { env, hasFile } = loadCpanelEnv()
if (!hasFile) {
  console.error('❌ Falta .env.cpanel em navel-site/. Copia .env.cpanel.example primeiro.')
  process.exit(1)
}
try {
  enforceProjectFence(env)
} catch (err) {
  console.error('❌', err.message)
  process.exit(3)
}
const protocol = (env.CPANEL_PROTOCOL || 'sftp').toLowerCase()
if (protocol !== 'sftp') {
  console.error(
    `Este migrador só suporta SFTP. Protocolo actual: ${protocol}.\n` +
      `Põe CPANEL_PROTOCOL=sftp em .env.cpanel (ou executa "npm run deploy:probe").`,
  )
  process.exit(2)
}
requireKeys(env, ['CPANEL_SFTP_HOST', 'CPANEL_SFTP_PORT', 'CPANEL_SFTP_USER'])

const remoteRoot = (env.CPANEL_REMOTE_ROOT || '/public_html').replace(/\\/g, '/')
const remoteApi = remoteRoot.replace(/\/+$/, '') + '/api'
const remoteHtaccess = `${remoteApi}/.htaccess`
const remoteSecrets = `${remoteApi}/config.deploy-secrets.php`

// ---------------------------------------------------------------------------
// Parse putenv() — aceita:
//   putenv('KEY=value')
//   putenv("KEY=value")
//   putenv('KEY=' . 'value')            (concat PHP com '.')
//   putenv('KEY=' . "value" . '...')    (múltiplas partes)
// Dentro de cada parte aspa-delimitada, aplica unescape conforme regras PHP
// (aspas simples: só \' e \\; aspas duplas: \\ \' \" \n \t etc., mas tratamos
// conservadoramente só \\ \' \").
// ---------------------------------------------------------------------------
function phpUnescape(raw, quote) {
  if (quote === "'") return raw.replace(/\\([\\'])/g, '$1')
  // aspas duplas — suportar \\  \"  \'  \n  \t  \r
  return raw
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\r/g, '\r')
    .replace(/\\([\\'"$])/g, '$1')
}

function parsePutenvLines(phpSource) {
  const out = new Map()
  // Captura expressão inteira dentro de putenv( ... ); preservando aspas e .
  const stmtRe = /putenv\s*\(\s*([\s\S]*?)\s*\)\s*;/g
  const partRe = /(['"])((?:\\.|(?!\1).)*)\1/g
  let m
  while ((m = stmtRe.exec(phpSource)) !== null) {
    const expr = m[1]
    // Extrair todas as strings literais concatenadas; ignora `.`, espaços, etc.
    let assembled = ''
    let pm
    partRe.lastIndex = 0
    let any = false
    while ((pm = partRe.exec(expr)) !== null) {
      any = true
      assembled += phpUnescape(pm[2], pm[1])
    }
    if (!any) continue
    const eq = assembled.indexOf('=')
    if (eq <= 0) continue
    const key = assembled.slice(0, eq).trim()
    const value = assembled.slice(eq + 1)
    if (!/^[A-Z][A-Z0-9_]*$/.test(key)) continue
    out.set(key, value)
  }
  return out
}

// ---------------------------------------------------------------------------
// Neste host (LiteSpeed + LSPHP) mod_env NÃO está carregado (confirmado via
// probe 2026-04-24). A alternativa fiável é `RewriteRule ^ - [E=KEY:VALUE]`
// que injecta a var em getenv() e $_SERVER intactas (testado com chars
// especiais ' " + { } ~ ).
//
// Escape dentro de [E=...]:
//   \   → \\
//   ,   → \,    (delimitador de flags do mod_rewrite)
//   ]   → \]    (fecha o bloco)
// Os restantes caracteres passam inalterados.
// ---------------------------------------------------------------------------
function escapeForRewriteE(value) {
  return value.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/]/g, '\\]')
}
function rewriteEnvLine(key, value) {
  return `  RewriteRule ^ - [E=${key}:${escapeForRewriteE(value)}]`
}

// ---------------------------------------------------------------------------
// Template canónico do .htaccess — reconstruído do zero para ser determinístico
// e não arrastar lixo de versões anteriores. Mantém o bloco de segurança
// FilesMatch e adiciona o bloco dinâmico de ATM_ENV via mod_rewrite.
// ---------------------------------------------------------------------------
function buildNewHtaccess(_existingIgnored, vars) {
  const keys = [...vars.keys()].sort()
  return [
    '# AT_Manut API — defesa em profundidade + injecção de env vars.',
    '# NÃO versionar este ficheiro — contém segredos ligados via [E=...].',
    '#',
    '# Gerado por scripts/cpanel-migrate-setenv.mjs em ' + new Date().toISOString(),
    '# Estratégia de env vars: RewriteRule [E=KEY:VALUE] (mod_rewrite).',
    '#   Motivo: em LiteSpeed/LSPHP deste plano, mod_env NÃO está carregado',
    '#   (diagnosticado 2026-04-24 via probe PHP; ticket CiberConceito #225838).',
    '#   As directivas [E=...] passam para $_SERVER e getenv() intactas e',
    '#   estáveis, mesmo com caracteres especiais (\' " + { } ~).',
    '#   config.php lê os valores com atm_env().',
    '',
    '# BEGIN ATM_ENV (gerado — não editar manualmente)',
    '<IfModule mod_rewrite.c>',
    '  RewriteEngine On',
    ...keys.map((k) => rewriteEnvLine(k, vars.get(k))),
    '</IfModule>',
    '# END ATM_ENV',
    '',
    '# Bloqueia ferramentas de diagnóstico e ficheiros sensíveis se ainda',
    '# existirem no servidor após deploys antigos.',
    '<IfModule mod_authz_core.c>',
    '  <FilesMatch "^(test-.*|teste-.*|clear-cache)\\.php$">',
    '    Require all denied',
    '  </FilesMatch>',
    '  <FilesMatch "^ingest-istobal-retro\\.php$">',
    '    Require all denied',
    '  </FilesMatch>',
    '  <FilesMatch "^config\\.deploy-secrets\\.php(\\.disabled-.*)?$">',
    '    Require all denied',
    '  </FilesMatch>',
    '  <FilesMatch "^atm_report_auth\\.secret\\.php$">',
    '    Require all denied',
    '  </FilesMatch>',
    '  <FilesMatch "^\\.htaccess\\.bak-.*$">',
    '    Require all denied',
    '  </FilesMatch>',
    '</IfModule>',
    '',
  ].join('\n')
}

function sha1(buf) {
  return createHash('sha1').update(buf).digest('hex').slice(0, 10)
}

// ---------------------------------------------------------------------------
function timestamp() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    '-' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds())
  )
}

async function smokeTest() {
  const url = 'https://navel.pt/api/data.php'
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'ping' }),
      redirect: 'follow',
    })
    const txt = await res.text()
    const body = txt.length > 300 ? txt.slice(0, 300) + '…' : txt
    return { status: res.status, body }
  } catch (err) {
    return { status: 0, body: String(err) }
  }
}

// ---------------------------------------------------------------------------
async function main() {
  if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR, { recursive: true })

  const sftp = new SftpClient()
  const connect = {
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
  }

  console.log(`\n=== Migração SetEnv AT_Manut — ${dry ? 'DRY-RUN' : 'EXECUÇÃO'} ===\n`)
  console.log(`Host remoto:   ${connect.host}:${connect.port}`)
  console.log(`Utilizador:    ${connect.username}`)
  console.log(`API remota:    ${remoteApi}`)
  console.log('')

  await sftp.connect(connect)
  try {
    // 1) Verificar existência do config.deploy-secrets.php
    const hasSecrets = await sftp.exists(remoteSecrets)
    if (!hasSecrets) {
      console.error(`❌ Não existe ${remoteSecrets}.`)
      console.error('   A app já deve estar a ler variáveis do cPanel — abortar migração.')
      process.exit(4)
    }
    // 2) Download para TMP
    const localSecrets = join(TMP_DIR, 'config.deploy-secrets.php')
    const localHtaccess = join(TMP_DIR, 'htaccess-remote.txt')
    await sftp.fastGet(remoteSecrets, localSecrets)
    const hasHtaccess = await sftp.exists(remoteHtaccess)
    let existingHtaccess = ''
    if (hasHtaccess) {
      await sftp.fastGet(remoteHtaccess, localHtaccess)
      existingHtaccess = readFileSync(localHtaccess, 'utf8')
    }

    // 3) Parsing (nunca imprimir valores)
    const phpSrc = readFileSync(localSecrets, 'utf8')
    const vars = parsePutenvLines(phpSrc)
    if (vars.size === 0) {
      console.error('❌ Nenhuma linha putenv() encontrada. Verifica o ficheiro manualmente.')
      process.exit(5)
    }
    console.log(`Variáveis detectadas (${vars.size}):`)
    for (const [k, v] of [...vars.entries()].sort()) {
      console.log(`  · ${k.padEnd(38)} ${mask(v)}  (${v.length} chars)`)
    }
    const atm = [...vars.keys()].filter((k) => k.startsWith('ATM_'))
    const outros = [...vars.keys()].filter((k) => !k.startsWith('ATM_'))
    if (outros.length) {
      console.log(`\nAviso: ${outros.length} variáveis não-ATM_ serão também exportadas (SetEnv):`)
      for (const k of outros) console.log(`  · ${k}`)
    }
    if (atm.length === 0) {
      console.error('❌ Nenhuma variável ATM_* — esperado falso positivo?')
      process.exit(6)
    }

    // 4) Construir .htaccess
    const newHtaccess = buildNewHtaccess(existingHtaccess, vars)
    const localNew = join(TMP_DIR, 'htaccess-new.txt')
    writeFileSync(localNew, newHtaccess, 'utf8')
    console.log(
      `\n.htaccess actual:   ${existingHtaccess.length} bytes  (sha1=${sha1(existingHtaccess)})`,
    )
    console.log(`.htaccess proposto: ${newHtaccess.length} bytes  (sha1=${sha1(newHtaccess)})`)

    // 5) Dry-run → apenas mostrar diferença resumida e sair
    if (dry) {
      console.log('\n── Pré-visualização (sem valores sensíveis) ────────────────────')
      const lines = newHtaccess.split('\n').map((ln) => {
        const m = ln.match(/^(\s*RewriteRule\s+\^\s+-\s+\[E=)(\w+):/)
        if (m) return `${m[1]}${m[2]}:${'*'.repeat(8)}]`
        return ln
      })
      console.log(lines.join('\n'))
      console.log('\n(DRY-RUN) Volta a correr com --yes para aplicar.')
      return
    }

    // 6) Backup remoto do .htaccess
    if (hasHtaccess) {
      const backup = `${remoteHtaccess}.bak-${timestamp()}`
      await sftp.rename(remoteHtaccess, backup)
      console.log(`\nBackup remoto criado: ${backup}`)
    }

    // 7) Upload do novo .htaccess
    await sftp.fastPut(localNew, remoteHtaccess)
    console.log(`Upload OK: ${remoteHtaccess}`)

    // 8) Opcional: renomear config.deploy-secrets.php para .disabled
    if (removeFallback) {
      const disabled = `${remoteSecrets}.disabled-${timestamp()}`
      await sftp.rename(remoteSecrets, disabled)
      console.log(`Fallback renomeado: ${disabled}`)
      console.log('   (não foi apagado — faz rollback renomeando de volta se algo falhar)')
    } else {
      console.log(
        '\n(fallback) config.deploy-secrets.php mantido. Após validar, podes\n' +
          '   renomeá-lo manualmente (ou correr com --remove-fallback numa 2ª passagem).',
      )
    }

    // 9) Smoke-test HTTPS
    console.log('\n── Smoke-test HTTPS ────────────────────────────────────────────')
    const sm = await smokeTest()
    console.log(`POST https://navel.pt/api/data.php → status ${sm.status}`)
    console.log(`body (primeiros 300 chars): ${sm.body}`)
    if (sm.status === 0 || sm.status >= 500) {
      console.error(
        '\n⚠️  Erro 5xx ou rede. Faz rollback imediato renomeando o backup de volta:\n' +
          `    ${remoteHtaccess}.bak-…  →  ${remoteHtaccess}`,
      )
    } else {
      console.log('\n✅ API responde. Testa o login na app (https://navel.pt/manut/) para confirmar.')
    }
  } finally {
    try {
      await sftp.end()
    } catch {}
    if (!keepTmp) {
      rmSync(TMP_DIR, { recursive: true, force: true })
    } else {
      console.log(`\n(TMP preservado em ${TMP_DIR})`)
    }
  }
}

main().catch((err) => {
  console.error('\n❌ Falha:', err?.message || err)
  process.exit(10)
})
