/**
 * Cria navel-publicar.zip com TODO o conteúdo de dist/, preservando a estrutura
 * de pastas (index.html, assets/, images/catalogos/facom, etc.).
 * Usa archiver para garantir que nada fica de fora (o Compress-Archive do
 * PowerShell por vezes nao inclui todo o conteudo das subpastas).
 *
 * Executar: node scripts/make-zip.js
 */
import archiver from 'archiver'
import { createWriteStream, readdirSync, statSync, existsSync } from 'fs'
import { join, relative } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = join(__dirname, '..', 'dist')
const ZIP_PATH = join(__dirname, '..', 'navel-publicar.zip')

if (!existsSync(DIST)) {
  console.error('Erro: a pasta dist/ nao existe. Execute npm run build primeiro.')
  process.exit(1)
}

function addDir(archive, dirPath, basePath = dirPath) {
  const entries = readdirSync(dirPath, { withFileTypes: true })
  for (const entry of entries) {
    const full = join(dirPath, entry.name)
    const rel = relative(basePath, full).replace(/\\/g, '/')
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
