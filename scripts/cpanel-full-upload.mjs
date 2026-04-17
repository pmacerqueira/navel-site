/**
 * Pacote completo para cPanel: build NAVEL + zip site, build AT_Manut + zip,
 * ZIPs PHP (documentos + API biblioteca) com segredos alinhados.
 *
 * Executar: npm run cpanel:pack
 * Saída: pasta irmã do navel-site, ex.: ../cpanel-upload/
 */
import { execSync } from 'child_process'
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
  copyFileSync,
} from 'fs'
import { join, dirname, relative } from 'path'
import { fileURLToPath } from 'url'
import archiver from 'archiver'

const __dirname = dirname(fileURLToPath(import.meta.url))
const navelSite = join(__dirname, '..')
const navelRoot = join(navelSite, '..')
const atManut = join(navelRoot, 'AT_Manut')
const outDir = join(navelRoot, 'cpanel-upload')

function extractAtIntegrationBearer(php) {
  const m = php.match(/'at_integration_bearer'\s*=>\s*'([^']*)'/)
  return m ? m[1].replace(/\\'/g, "'") : ''
}

function injectAtConfigToken(configPhp, token) {
  if (!token) return configPhp
  return configPhp.replace(
    /define\('ATM_NAVEL_DOC_INTEGRATION_TOKEN',\s*getenv\('ATM_NAVEL_DOC_INTEGRATION_TOKEN'\)\s*\?:\s*''\);/,
    `define('ATM_NAVEL_DOC_INTEGRATION_TOKEN', getenv('ATM_NAVEL_DOC_INTEGRATION_TOKEN') ?: '${token}');`,
  )
}

function addDirSync(archive, dirPath, basePath = dirPath) {
  for (const name of readdirSync(dirPath)) {
    const full = join(dirPath, name)
    const rel = relative(basePath, full).replace(/\\/g, '/')
    if (statSync(full).isDirectory()) {
      addDirSync(archive, full, basePath)
    } else {
      archive.file(full, { name: rel })
    }
  }
}

async function zipDirectory(sourceDir, zipPath) {
  const out = createWriteStream(zipPath)
  const archive = archiver('zip', { zlib: { level: 6 } })
  archive.pipe(out)
  addDirSync(archive, sourceDir, sourceDir)
  await archive.finalize()
  await new Promise((resolve, reject) => {
    out.on('close', resolve)
    archive.on('error', reject)
  })
}

const LEIA_ME_NAVEL = `NAVEL — PHP biblioteca de documentos
=====================================

Ficheiros: documentos-api.php, documentos-api-config.php

Colocar na raiz do site (junto ao index.html).

Se já tens documentos-api-config.php no servidor com Supabase/OneDrive,
faz merge: mantém as tuas chaves e confirma supabase_url / supabase_anon_key.

Gerado por: npm run cpanel:pack
`

const LEIA_ME_AT = `AT_Manut — API biblioteca NAVEL
==============================

Ficheiros na pasta public_html/api/

Se o teu config.php já está personalizado, faz merge das linhas
ATM_NAVEL_DOCUMENTOS_API_URL e ATM_NAVEL_DOC_INTEGRATION_TOKEN.

Gerado por: npm run cpanel:pack
`

const INDICE = `Pacote cPanel (NAVEL + AT_Manut)
================================

Ficheiros:
  • navel-documentos-php-cpanel.zip  — PHP biblioteca (public_html/)
  • navel-publicar.zip               — Site NAVEL (dist; sem catalogos por defeito)
  • atmanut-biblioteca-api-cpanel.zip — PHP API AT (public_html/api/)
  • atmanut-dist_upload.zip          — Frontend AT (public_html/manut/)

Ordem sugerida: site NAVEL → PHP NAVEL → manut AT → PHP API AT.

Gerado por npm run cpanel:pack na pasta navel-site.
`

async function main() {
  console.log('=== cPanel: build NAVEL (navel-site) ===\n')
  execSync('npm run build', { cwd: navelSite, stdio: 'inherit' })
  console.log('\n=== cPanel: navel-publicar.zip ===\n')
  execSync('npm run make-zip', { cwd: navelSite, stdio: 'inherit' })

  let atOk = existsSync(atManut)
  if (!atOk) {
    console.warn('\n[cpanel:pack] Pasta AT_Manut não encontrada — a saltar build AT.\n')
  } else {
    console.log('\n=== cPanel: build AT_Manut ===\n')
    execSync('npm run build:zip', { cwd: atManut, stdio: 'inherit' })
  }

  mkdirSync(outDir, { recursive: true })

  const stagingNavel = join(outDir, '_staging_navel_php')
  const stagingAt = join(outDir, '_staging_at_api')
  if (existsSync(stagingNavel)) rmSync(stagingNavel, { recursive: true })
  if (existsSync(stagingAt)) rmSync(stagingAt, { recursive: true })
  mkdirSync(stagingNavel, { recursive: true })

  const docPhp = join(navelSite, 'public', 'documentos-api.php')
  const docCfg = join(navelSite, 'public', 'documentos-api-config.php')
  if (!existsSync(docPhp) || !existsSync(docCfg)) {
    console.error('Falta documentos-api.php ou documentos-api-config.php em public/')
    process.exit(1)
  }
  copyFileSync(docPhp, join(stagingNavel, 'documentos-api.php'))
  copyFileSync(docCfg, join(stagingNavel, 'documentos-api-config.php'))
  writeFileSync(join(stagingNavel, 'LEIA-ME.txt'), LEIA_ME_NAVEL, 'utf8')

  const cfgText = readFileSync(docCfg, 'utf8')
  const atBearer = extractAtIntegrationBearer(cfgText)

  const zipNavelPhp = join(outDir, 'navel-documentos-php-cpanel.zip')
  await zipDirectory(stagingNavel, zipNavelPhp)
  rmSync(stagingNavel, { recursive: true })

  if (atOk) {
    mkdirSync(stagingAt, { recursive: true })
    const atApiDir = join(atManut, 'servidor-cpanel', 'api')
    for (const f of [
      'atm-taxonomy-normalize.php',
      'data.php',
      'taxonomy-nodes.php',
      'navel-doc-lib.php',
      'navel-documentos-upload.php',
      'navel-documentos-download.php',
    ]) {
      const p = join(atApiDir, f)
      if (!existsSync(p)) {
        console.error('Falta', p)
        process.exit(1)
      }
      copyFileSync(p, join(stagingAt, f))
    }
    const atConfigSrc = join(atApiDir, 'config.php')
    let atConfigBody = readFileSync(atConfigSrc, 'utf8')
    atConfigBody = injectAtConfigToken(atConfigBody, atBearer)
    writeFileSync(join(stagingAt, 'config.php'), atConfigBody, 'utf8')
    writeFileSync(join(stagingAt, 'LEIA-ME.txt'), LEIA_ME_AT, 'utf8')

    const zipAtApi = join(outDir, 'atmanut-biblioteca-api-cpanel.zip')
    await zipDirectory(stagingAt, zipAtApi)
    rmSync(stagingAt, { recursive: true })
  }

  const navelZip = join(navelSite, 'navel-publicar.zip')
  if (existsSync(navelZip)) {
    copyFileSync(navelZip, join(outDir, 'navel-publicar.zip'))
  }

  const atZip = join(atManut, 'dist_upload.zip')
  if (atOk && existsSync(atZip)) {
    copyFileSync(atZip, join(outDir, 'atmanut-dist_upload.zip'))
  }

  writeFileSync(join(outDir, 'INDICE.txt'), INDICE, 'utf8')

  console.log('\n=== Pronto ===')
  console.log('Pasta para enviares / publicares no cPanel:\n  ', outDir)
  const listed = ['INDICE.txt', 'navel-publicar.zip', 'navel-documentos-php-cpanel.zip']
  if (atOk) listed.push('atmanut-dist_upload.zip', 'atmanut-biblioteca-api-cpanel.zip')
  console.log('\nConteúdo:', listed.join(', '))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
