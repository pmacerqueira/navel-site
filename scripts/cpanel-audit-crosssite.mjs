/**
 * Auditoria cruzada AT_Manut ↔ navel-site após a migração .htaccess.
 *
 * Verifica:
 *   - .htaccess da raiz (público_html/) — NÃO tocado; confirmar que continua intacto.
 *   - documentos-api.php (raiz)          — usado pela área reservada.
 *   - taxonomy-nodes.php (/api/)          — usado pelo documentos-api.php e pelo AT_Manut.
 *   - navel-documentos-upload.php (/api/) — endpoint de integração.
 *   - keep-alive-supabase.php (raiz)      — cron do navel-site (se existir).
 *   - onedrive-callback.php (raiz)        — flow OAuth da área reservada.
 *
 * Não envia credenciais reais — espera respostas 401/403 normais.
 */
import SftpClient from 'ssh2-sftp-client'
import { existsSync, readFileSync } from 'fs'
import { loadCpanelEnv, enforceProjectFence, requireKeys } from './cpanel-env.mjs'

const { env } = loadCpanelEnv()
enforceProjectFence(env)
requireKeys(env, ['CPANEL_SFTP_HOST', 'CPANEL_SFTP_PORT', 'CPANEL_SFTP_USER'])

const remoteRoot = (env.CPANEL_REMOTE_ROOT || '/public_html').replace(/\\/g, '/')

async function httpProbe(url, body, hdrs = {}) {
  try {
    const opts = {
      method: body ? 'POST' : 'GET',
      headers: { ...hdrs },
      redirect: 'manual',
    }
    if (body) {
      opts.headers['Content-Type'] = 'application/json'
      opts.body = JSON.stringify(body)
    }
    const res = await fetch(url, opts)
    const text = await res.text()
    return { status: res.status, body: text.slice(0, 300) }
  } catch (err) {
    return { status: 0, body: String(err) }
  }
}

async function main() {
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
    // 1) Integridade dos .htaccess (raiz vs api)
    const hta = {
      raiz: await sftp.get(`${remoteRoot}/.htaccess`).then((b) => b.toString('utf8')),
      api: await sftp.get(`${remoteRoot}/api/.htaccess`).then((b) => b.toString('utf8')),
    }
    console.log('=== .htaccess: tamanhos e tópicos ===')
    console.log(`  raiz:  ${hta.raiz.length} bytes  — primeira linha: ${hta.raiz.split('\n')[0].slice(0, 80)}`)
    console.log(`  api:   ${hta.api.length} bytes  — começa em: ${hta.api.split('\n')[0].slice(0, 80)}`)

    // Procurar sinais de directivas perigosas ou esquecidas
    const checks = [
      ['raiz contém RewriteRule ^api/ - [L] (passagem directa para /api)', /RewriteRule\s+\^api\/\s+-\s+\[L\]/i.test(hta.raiz)],
      ['raiz não tem ATM_ envs (não deve)', !/ATM_[A-Z_]+/.test(hta.raiz)],
      ['raiz tem HSTS', /Strict-Transport-Security/i.test(hta.raiz)],
      ['raiz tem CSP', /Content-Security-Policy/i.test(hta.raiz)],
      ['api tem RewriteRule [E=ATM_*:...]', /RewriteRule\s+\^\s+-\s+\[E=ATM_/.test(hta.api)],
      ['api NÃO tem Supabase envs (não deve)', !/SUPABASE_/.test(hta.api)],
    ]
    console.log('\n=== Sanidade ===')
    for (const [label, ok] of checks) console.log(`  ${ok ? '✅' : '⚠️ '} ${label}`)

    // 2) Listar pasta raiz (para ver se há ficheiros novos inesperados)
    console.log('\n=== Files na raiz (topo) ===')
    const files = await sftp.list(remoteRoot)
    for (const f of files.filter((x) => !x.name.startsWith('.')).slice(0, 30)) {
      console.log(`  ${f.type === 'd' ? 'd' : '-'} ${f.name}`)
    }
    console.log('\n=== Files em /api/ (com .bak/.disabled) ===')
    const apiFiles = await sftp.list(`${remoteRoot}/api`)
    for (const f of apiFiles) {
      console.log(`  ${f.type === 'd' ? 'd' : '-'} ${f.name}  ${f.size}b`)
    }
  } finally {
    try { await sftp.end() } catch {}
  }

  // 3) Smoke-tests HTTPS ao endpoints críticos
  console.log('\n=== Smoke-tests HTTPS ===')
  const probes = [
    // Site institucional
    { name: 'Site root',                  url: 'https://navel.pt/',                    expect: [200, 301, 302, 304] },
    // Área reservada — SPA, serve index.html
    { name: 'Área reservada (SPA shell)', url: 'https://navel.pt/area-reservada',      expect: [200] },
    // Documentos API (raiz) — deve exigir Bearer
    { name: 'documentos-api sem token',   url: 'https://navel.pt/documentos-api.php',  expect: [401, 403] },
    // Taxonomy (/api/) — exige token
    { name: 'taxonomy-nodes (no token)',  url: 'https://navel.pt/api/taxonomy-nodes.php', method: 'POST', body: {}, expect: [401, 403, 400, 405] },
    // AT_Manut API — já testado, mas confirmar
    { name: 'AT_Manut data.php (login)',  url: 'https://navel.pt/api/data.php', method: 'POST', body: { r: 'auth', action: 'login', username: 'x', password: 'x' }, expect: [401] },
    // navel-documentos-upload — exige multipart; sem nada deve dar 4xx
    { name: 'navel-documentos-upload',    url: 'https://navel.pt/api/navel-documentos-upload.php', method: 'POST', body: {}, expect: [400, 401, 403, 405] },
    // OneDrive callback (área reservada)
    { name: 'onedrive-callback (sem code)', url: 'https://navel.pt/onedrive-callback.php',         expect: [200, 302, 303, 307, 308, 400, 401] },
    // Keep-alive supabase
    { name: 'keep-alive-supabase.php',    url: 'https://navel.pt/keep-alive-supabase.php',         expect: [200, 401, 403, 404] },
    // Ficheiros que DEVEM estar bloqueados
    { name: 'config.deploy-secrets.php.disabled-…',
      url: 'https://navel.pt/api/config.deploy-secrets.php.disabled-20260424-181827',
      expect: [403, 404] },
    { name: '.htaccess.bak-* bloqueado',
      url: 'https://navel.pt/api/.htaccess.bak-20260424-181816',
      expect: [403, 404] },
  ]
  for (const p of probes) {
    const r = await httpProbe(p.url, p.body, p.method === 'POST' ? {} : {})
    const ok = p.expect.includes(r.status)
    console.log(
      `  ${ok ? '✅' : '⚠️ '} ${p.name.padEnd(40)} ${String(r.status).padStart(3)}  ${r.body.replace(/\s+/g, ' ').slice(0, 90)}`,
    )
  }
}

main().catch((e) => { console.error('❌', e.message); process.exit(10) })
