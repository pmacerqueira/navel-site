/**
 * Cria navel-publicar.zip com o conteúdo de dist/, excluindo a pasta
 * catalogos/ (PDFs já estão no cPanel — não precisam de ser re-enviados
 * a cada deploy, só quando houver novos catálogos).
 *
 * Executar: node scripts/make-zip.js
 * Para incluir catálogos: node scripts/make-zip.js --with-catalogos
 */
import archiver from 'archiver'
import { createWriteStream, readdirSync, statSync, existsSync } from 'fs'
import { join, relative } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = join(__dirname, '..', 'dist')
const ZIP_PATH = join(__dirname, '..', 'navel-publicar.zip')

const withCatalogos = process.argv.includes('--with-catalogos')

// Pastas a excluir do ZIP (relativas a dist/)
const EXCLUDE_DIRS = withCatalogos ? [] : ['catalogos']

if (!existsSync(DIST)) {
  console.error('Erro: a pasta dist/ nao existe. Execute npm run build primeiro.')
  process.exit(1)
}

function isExcluded(relPath) {
  return EXCLUDE_DIRS.some(ex => relPath === ex || relPath.startsWith(ex + '/'))
}

function addDir(archive, dirPath, basePath = dirPath) {
  const entries = readdirSync(dirPath, { withFileTypes: true })
  for (const entry of entries) {
    const full = join(dirPath, entry.name)
    const rel = relative(basePath, full).replace(/\\/g, '/')
    if (isExcluded(rel)) continue
    if (entry.isDirectory()) {
      addDir(archive, full, basePath)
    } else {
      archive.file(full, { name: rel })
    }
  }
}

const out = createWriteStream(ZIP_PATH)
const archive = archiver('zip', { zlib: { level: 6 } })

archive.pipe(out)
addDir(archive, DIST)
await archive.finalize()

await new Promise((resolve, reject) => {
  out.on('close', resolve)
  archive.on('error', reject)
})

const sizeMB = (statSync(ZIP_PATH).size / (1024 * 1024)).toFixed(2)
console.log('ZIP criado:', ZIP_PATH)
console.log('Tamanho:', sizeMB, 'MB')
if (!withCatalogos) {
  console.log('Nota: pasta catalogos/ excluida (ja esta no cPanel).')
  console.log('      Para incluir catalogos: node scripts/make-zip.js --with-catalogos')
}
