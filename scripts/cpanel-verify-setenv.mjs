/**
 * Verifica que o SetEnv em .htaccess chega sozinho ao PHP, sem depender de
 * config.deploy-secrets.php.
 *
 * Procedimento (atomicamente):
 *   1. Renomeia  config.deploy-secrets.php  →  .test-disabled-<ts>.
 *   2. Executa POST /api/data.php (action=login, credenciais inválidas).
 *   3a. Se 401 "Credenciais inválidas" → SetEnv OK; o ficheiro fica
 *       renomeado com o sufixo .disabled-<ts> (mantém o original para rollback).
 *   3b. Se 500 / connection refused → rollback imediato (renomear de volta).
 *
 * Uso:
 *   node scripts/cpanel-verify-setenv.mjs --yes
 */
import SftpClient from 'ssh2-sftp-client'
import { existsSync, readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { enforceProjectFence, loadCpanelEnv, requireKeys } from './cpanel-env.mjs'

function parseArgs(argv) {
  const out = { flags: new Set() }
  for (const raw of argv) if (raw.startsWith('--')) out.flags.add(raw.slice(2))
  return out
}
const args = parseArgs(process.argv.slice(2))
const commit = args.flags.has('yes')

const { env, hasFile } = loadCpanelEnv()
if (!hasFile) {
  console.error('❌ Falta .env.cpanel.')
  process.exit(1)
}
try {
  enforceProjectFence(env)
} catch (e) {
  console.error('❌', e.message)
  process.exit(3)
}
requireKeys(env, ['CPANEL_SFTP_HOST', 'CPANEL_SFTP_PORT', 'CPANEL_SFTP_USER'])

const remoteRoot = (env.CPANEL_REMOTE_ROOT || '/public_html').replace(/\\/g, '/')
const remoteApi = remoteRoot.replace(/\/+$/, '') + '/api'
const remoteSecrets = `${remoteApi}/config.deploy-secrets.php`

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

async function hit() {
  const url = 'https://navel.pt/api/data.php'
  const results = []
  // Teste 1: login inválido — força get_pdo() (ligação à BD) + JWT secret
  try {
    const r1 = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://navel.pt' },
      body: JSON.stringify({
        r: 'auth',
        action: 'login',
        username: '__setenv_probe_no_exists__',
        password: 'setenv-probe',
      }),
      redirect: 'follow',
    })
    const body = await r1.text()
    results.push({ action: 'login', status: r1.status, body: body.slice(0, 400) })
  } catch (err) {
    results.push({ action: 'login', status: 0, body: String(err) })
  }
  // Teste 2: pedido autenticado sem token (não força BD, mas confirma que o PHP arranca)
  try {
    const r2 = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://navel.pt' },
      body: JSON.stringify({ r: 'clientes', action: 'list' }),
      redirect: 'follow',
    })
    const body = await r2.text()
    results.push({ action: 'noauth', status: r2.status, body: body.slice(0, 400) })
  } catch (err) {
    results.push({ action: 'noauth', status: 0, body: String(err) })
  }
  return results
}

function classify(results) {
  const login = results.find((r) => r.action === 'login')
  const noauth = results.find((r) => r.action === 'noauth')
  // Critério:
  //   login OK = 401 com "Utilizador ou password incorretos" (BD + JWT OK)
  //   noauth OK = 401 "Sessão expirada" (PHP arranca)
  //   BAD = status 500, 502, 503, 0 OU body vazio OU erro de BD
  const bad = (r, expected) => {
    if (!r) return true
    if (r.status === 0) return true
    if (r.status >= 500) return true
    if (/internal server error/i.test(r.body)) return true
    if (/erro de base de dados|PDOException/i.test(r.body)) return true
    if (expected && !expected.test(r.body)) {
      // não bate o padrão esperado → ainda pode ser OK mas sinaliza
      return false
    }
    return false
  }
  return {
    loginOk: !bad(login, /incorretos|Credenciais|em falta/i),
    noauthOk: !bad(noauth, /Sessão expirada|Token/i),
    login,
    noauth,
  }
}

async function main() {
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

  console.log('\n=== Verificar SetEnv isolado (sem fallback) ===\n')
  if (!commit) {
    console.log('DRY-RUN: sem --yes só vejo baseline. Baselining…')
  }

  // Baseline com fallback ainda activo
  const baseline = await hit()
  console.log('Baseline (fallback activo):')
  for (const r of baseline) {
    console.log(`  ${r.action.padEnd(6)} status=${r.status}  body="${r.body.slice(0, 200)}"`)
  }
  const base = classify(baseline)
  if (!base.loginOk || !base.noauthOk) {
    console.error(
      '\n❌ Baseline anómalo — login/noauth já falham. Aborta; investiga antes de mexer no fallback.',
    )
    process.exit(4)
  }
  if (!commit) {
    console.log('\nBaseline OK. Re-corre com --yes para testar SetEnv sozinho.')
    return
  }

  await sftp.connect(connect)
  const disabled = `${remoteSecrets}.test-disabled-${timestamp()}`
  let renamed = false
  try {
    if (!(await sftp.exists(remoteSecrets))) {
      console.log('\n(info) Fallback já não existe no servidor — SetEnv só pode estar a servir.')
    } else {
      await sftp.rename(remoteSecrets, disabled)
      renamed = true
      console.log(`\nFallback movido temporariamente para: ${disabled}`)
      // Pequena pausa para Apache recarregar (opcode cache normalmente está off em PHP-FPM)
      await new Promise((r) => setTimeout(r, 1500))
    }

    const probe = await hit()
    console.log('\nCom fallback OFF:')
    for (const r of probe) {
      console.log(`  ${r.action.padEnd(6)} status=${r.status}  body="${r.body.slice(0, 200)}"`)
    }
    const q = classify(probe)

    if (q.loginOk && q.noauthOk) {
      console.log('\n✅ SetEnv chega ao PHP sem depender do fallback.')
      if (renamed) {
        const finalName = `${remoteSecrets}.disabled-${timestamp()}`
        await sftp.rename(disabled, finalName)
        renamed = false
        console.log(`Fallback arquivado definitivamente em: ${finalName}`)
        console.log('(Para rollback: renomeia esse ficheiro de volta para config.deploy-secrets.php.)')
      }
    } else {
      console.log('\n⚠️  SetEnv não está a fornecer todas as variáveis — rollback imediato.')
      if (renamed) {
        await sftp.rename(disabled, remoteSecrets)
        renamed = false
        console.log('Fallback restaurado — app deve continuar funcional.')
      }
    }
  } finally {
    if (renamed) {
      try {
        await sftp.rename(disabled, remoteSecrets)
        console.log('(cleanup) Fallback restaurado após exceção.')
      } catch {}
    }
    try {
      await sftp.end()
    } catch {}
  }
}

main().catch((err) => {
  console.error('\n❌ Falha:', err?.message || err)
  process.exit(10)
})
