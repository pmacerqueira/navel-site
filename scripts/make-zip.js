/**
 * Cria ZIP com o conteúdo de dist/ para upload no cPanel.
 *
 * Estrutura: ficheiros na **raiz** do ZIP (index.html, assets/..., .htaccess),
 * para extrair directamente para public_html sem pasta intermédia.
 *
 * Por defeito **exclui catalogos/** (PDFs pesados — já no servidor).
 *   node scripts/make-zip.js
 *   node scripts/make-zip.js --out deploy-navel.zip
 *
 * Incluir catálogos:
 *   node scripts/make-zip.js --with-catalogos
 *
 * Método: `tar -acf` com `-T` (lista de caminhos relativos). Isto evita o `./`
 * que `tar -C dist .` colocava na raiz e que no cPanel criava uma pasta extra.
 * Fallback: archiver com compressão STORE (nível 0), mais compatível que DEFLATE
 * agressivo com alguns unzip.
 */
import archiver from 'archiver'
import { spawnSync } from 'child_process'
import {
  createWriteStream,
  readdirSync,
  statSync,
  existsSync,
  unlinkSync,
  writeFileSync,
} from 'fs'
import { join, relative, dirname } from 'path'
import { tmpdir } from 'os'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = join(__dirname, '..', 'dist')

const withCatalogos = process.argv.includes('--with-catalogos')

let ZIP_PATH = join(__dirname, '..', 'navel-publicar.zip')
const outEq = process.argv.find((a) => a.startsWith('--out='))
const outIdx = process.argv.indexOf('--out')
if (outEq) {
  ZIP_PATH = join(
    __dirname,
    '..',
    outEq.slice('--out='.length).replace(/^["']|["']$/g, ''),
  )
} else if (outIdx !== -1 && process.argv[outIdx + 1] && !process.argv[outIdx + 1].startsWith('-')) {
  ZIP_PATH = join(__dirname, '..', process.argv[outIdx + 1])
}

const EXCLUDE_DIRS = withCatalogos ? [] : ['catalogos']

if (!existsSync(DIST)) {
  console.error('Erro: a pasta dist/ nao existe. Execute npm run build primeiro.')
  process.exit(1)
}

function isExcluded(relPath) {
  return EXCLUDE_DIRS.some((ex) => relPath === ex || relPath.startsWith(ex + '/'))
}

/** Lista todos os ficheiros sob `dirPath`, caminhos relativos a `basePath`, POSIX. */
function collectRelativeFiles(dirPath, basePath = dirPath) {
  /** @type {string[]} */
  const out = []
  const entries = readdirSync(dirPath, { withFileTypes: true })
  for (const entry of entries) {
    const full = join(dirPath, entry.name)
    const rel = relative(basePath, full).replace(/\\/g, '/')
    if (isExcluded(rel)) continue
    if (entry.isDirectory()) {
      out.push(...collectRelativeFiles(full, basePath))
    } else {
      out.push(rel)
    }
  }
  return out
}

function zipWithSystemTar() {
  const files = collectRelativeFiles(DIST).sort()
  if (files.length === 0) {
    console.error('[make-zip] Nenhum ficheiro em dist/ (apos exclusoes).')
    return false
  }
  const listPath = join(tmpdir(), `navel-zip-list-${Date.now()}-${process.pid}.txt`)
  writeFileSync(listPath, files.join('\n'), 'utf8')
  const r = spawnSync('tar', ['-acf', ZIP_PATH, '-C', DIST, '-T', listPath], {
    stdio: 'inherit',
    shell: false,
    windowsHide: true,
  })
  try {
    unlinkSync(listPath)
  } catch {
    /* ignore */
  }
  return r.status === 0
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

async function zipWithArchiverStore() {
  if (existsSync(ZIP_PATH)) {
    try {
      unlinkSync(ZIP_PATH)
    } catch {
      /* ignore */
    }
  }
  const out = createWriteStream(ZIP_PATH)
  const archive = archiver('zip', { zlib: { level: 0 } })
  archive.pipe(out)
  addDir(archive, DIST)
  await archive.finalize()
  await new Promise((resolve, reject) => {
    out.on('close', resolve)
    archive.on('error', reject)
  })
}

console.log('[make-zip] Destino:', ZIP_PATH)
console.log('[make-zip] catalogos:', withCatalogos ? 'incluidos' : 'excluidos')

let ok = false
try {
  ok = zipWithSystemTar()
} catch (e) {
  console.warn('[make-zip] tar:', e.message)
  ok = false
}

if (!ok) {
  console.warn('[make-zip] tar -T falhou ou nao disponivel — fallback archiver (STORE, nivel 0).')
  await zipWithArchiverStore()
}

const sizeMB = (statSync(ZIP_PATH).size / (1024 * 1024)).toFixed(2)
console.log('ZIP criado:', ZIP_PATH)
console.log('Tamanho:', sizeMB, 'MB')
if (!withCatalogos) {
  console.log('Nota: pasta catalogos/ excluida (use --with-catalogos para incluir).')
}
