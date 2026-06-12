/**
 * Remove no servidor ficheiros em public_html/manut/ que já não existem no
 * AT_Manut/dist local (chunks Vite antigos acumulados por deploys incrementais).
 *
 * Não apaga pastas com ficheiros — primeiro apaga só ficheiros órfãos; depois
 * remove directórios vazios (de baixo para cima).
 *
 * Uso:
 *   node scripts/cpanel-prune-at-manut.mjs           # dry-run (lista órfãos)
 *   node scripts/cpanel-prune-at-manut.mjs --yes     # executa
 *
 * Pré-requisitos (ORDEM IMPORTA — deploy primeiro, prune depois):
 *   1. npm run build em ../AT_Manut (dist/ actualizado)
 *   2. deploy:at-manut já executado com esse dist
 * O script recusa-se a apagar se o index.html remoto diferir do local, porque
 * nesse caso o HTML em produção ainda referencia chunks que seriam apagados
 * (o site ficaria com 404s até ao próximo deploy).
 */
import SftpClient from 'ssh2-sftp-client'
import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { join, relative, posix, dirname } from 'path'
import { fileURLToPath } from 'url'
import { enforceProjectFence, loadCpanelEnv, requireKeys } from './cpanel-env.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const NAVEL_SITE = join(__dirname, '..')
const NAVEL_ROOT = join(NAVEL_SITE, '..')
const AT_MANUT_DIST = join(NAVEL_ROOT, 'AT_Manut', 'dist')

const argv = process.argv.slice(2)
const commit = argv.includes('--yes')

function walkLocalFiles(dir, base) {
  /** @type {string[]} */
  const out = []
  for (const name of readdirSync(dir)) {
    if (name === '.' || name === '..') continue
    const full = join(dir, name)
    const st = statSync(full)
    const rel = relative(base, full).replace(/\\/g, '/')
    if (st.isDirectory()) {
      out.push(...walkLocalFiles(full, base))
    } else {
      out.push(rel)
    }
  }
  return out
}

/**
 * @param {SftpClient} sftp
 * @param {string} dir absolute remote path
 * @param {string} remoteManut absolute remote path to manut/
 */
async function walkRemote(sftp, dir, remoteManut) {
  /** @type {{ rel: string, full: string, isDir: boolean }[]} */
  const out = []
  let entries
  try {
    entries = await sftp.list(dir)
  } catch {
    return out
  }
  for (const e of entries) {
    if (e.name === '.' || e.name === '..') continue
    const full = `${dir.replace(/\/$/, '')}/${e.name}`
    const isDir = e.type === 'd'
    const rel = full.slice(remoteManut.length + 1)
    out.push({ rel, full, isDir })
    if (isDir) {
      out.push(...(await walkRemote(sftp, full, remoteManut)))
    }
  }
  return out
}

async function main() {
  if (!existsSync(AT_MANUT_DIST)) {
    console.error(`❌ Falta ${AT_MANUT_DIST}. Corre "npm run build" em AT_Manut primeiro.`)
    process.exit(2)
  }

  const localRel = walkLocalFiles(AT_MANUT_DIST, AT_MANUT_DIST).sort()
  if (localRel.length < 15) {
    console.error(`❌ dist local tem poucos ficheiros (${localRel.length}) — recusa por segurança.`)
    process.exit(3)
  }

  const localSet = new Set(localRel)
  const { env, hasFile } = loadCpanelEnv()
  if (!hasFile) {
    console.error('❌ Falta .env.cpanel')
    process.exit(1)
  }
  enforceProjectFence(env)
  requireKeys(env, ['CPANEL_SFTP_HOST', 'CPANEL_SFTP_PORT', 'CPANEL_SFTP_USER'])

  const remoteRoot = (env.CPANEL_REMOTE_ROOT || '/public_html').replace(/\\/g, '/')
  const remoteManut = posix.join(remoteRoot.replace(/\/$/, ''), 'manut')

  if (!remoteManut.endsWith('/manut') || remoteManut.length < 12) {
    console.error(`❌ Caminho remoto inválido (deve terminar em /manut): ${remoteManut}`)
    process.exit(4)
  }

  console.log('\n=== Prune AT_Manut (manut/) ===\n')
  console.log(`Dist local:    ${AT_MANUT_DIST}`)
  console.log(`Ficheiros locais: ${localRel.length}`)
  console.log(`Remoto:        ${remoteManut}`)
  console.log(`Modo:          ${commit ? 'EXECUÇÃO' : 'DRY-RUN'}\n`)

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
    readyTimeout: 60000,
  })

  try {
    const exists = await sftp.exists(remoteManut)
    if (!exists) {
      console.log('Pasta manut/ não existe no servidor — nada a podar.')
      return
    }

    // Guarda de segurança: só podar depois do deploy. Se o index.html remoto
    // não for idêntico ao local, o HTML publicado ainda usa chunks antigos.
    const localIndexPath = join(AT_MANUT_DIST, 'index.html')
    if (existsSync(localIndexPath)) {
      const remoteIndexPath = posix.join(remoteManut, 'index.html')
      let remoteIndex = null
      try {
        remoteIndex = await sftp.get(remoteIndexPath)
      } catch {
        /* não existe no servidor — tratado abaixo */
      }
      const localIndex = readFileSync(localIndexPath)
      if (!remoteIndex || !Buffer.from(remoteIndex).equals(localIndex)) {
        console.error('❌ index.html remoto difere do dist local (ou não existe).')
        console.error('   Faz primeiro o deploy (deploy:at-manut --yes) e só depois o prune;')
        console.error('   podar antes do deploy deixava /manut/ com 404s nos JS/CSS antigos.')
        process.exit(5)
      }
    }

    const remoteEntries = await walkRemote(sftp, remoteManut, remoteManut)
    const remoteFiles = remoteEntries.filter((x) => !x.isDir)
    const orphans = remoteFiles.filter((x) => !localSet.has(x.rel))

    let bytes = 0
    for (const x of orphans) {
      try {
        const st = await sftp.stat(x.full)
        bytes += Number(st.size) || 0
      } catch {
        /* ignora */
      }
    }

    console.log(`Ficheiros remotos: ${remoteFiles.length}`)
    console.log(`Órfãos (não estão no dist actual): ${orphans.length} (~${(bytes / 1024 / 1024).toFixed(2)} MiB)\n`)

    if (orphans.length === 0) {
      console.log('Nada a remover — árvore já alinhada com dist local.')
      return
    }

    if (!commit) {
      console.log('Primeiros 25 órfãos:')
      for (const o of orphans.slice(0, 25)) console.log(`  - ${o.rel}`)
      if (orphans.length > 25) console.log(`  … +${orphans.length - 25} mais`)
      console.log('\n(DRY-RUN) Corre com --yes para apagar.')
      return
    }

    let deleted = 0
    for (const o of orphans) {
      try {
        await sftp.delete(o.full)
        deleted++
      } catch (e) {
        console.error('❌ Falha a apagar', o.rel, String(e.message || e))
      }
    }
    console.log(`\nApagados ${deleted}/${orphans.length} ficheiros.`)

    // Remover directórios vazios (mais profundos primeiro)
    const dirs = [...new Set(remoteEntries.filter((x) => x.isDir).map((x) => x.full))].sort(
      (a, b) => b.length - a.length,
    )
    let rmd = 0
    for (const d of dirs) {
      if (d === remoteManut) continue
      try {
        await sftp.rmdir(d)
        rmd++
      } catch {
        /* ainda tem ficheiros ou não vazio */
      }
    }
    if (rmd) console.log(`Directórios vazios removidos: ${rmd}`)
    console.log('\n✅ Prune concluído. Árvore remota alinhada com o build já publicado.\n')
  } finally {
    try {
      await sftp.end()
    } catch {}
  }
}

main().catch((e) => {
  console.error('❌', e?.message || e)
  process.exit(10)
})
