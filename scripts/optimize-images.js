/**
 * Otimiza imagens em public/images para reduzir tamanho e melhorar carregamento.
 * Usa sharp para compressão e redimensionamento.
 *
 * Executar: node scripts/optimize-images.js
 */
import sharp from 'sharp'
import { readdir, stat } from 'fs/promises'
import { join, extname } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const IMAGES_DIR = join(__dirname, '..', 'public', 'images')

const EXTENSIONS = ['.png', '.jpg', '.jpeg']

/** Dimensões máximas por tipo de imagem (largura) - hero carousel ~420px */
const MAX_WIDTH = {
  'beta-bg.png': 800,
  'kaeser-bg.png': 800,
  'og-image.png': 1200,
  'logo.png': 300,
  'beta-action-2025.png': 800,
  'magazine-telwin-2026.png': 800,
  'promo-fevereiro-2026.png': 800,
  'solucoes-industria-2025-26.png': 800,
  'slide-milwaukee_HDN_Q1.jpg': 800,
  default: 800,
}

async function getAllImages(dir, files = []) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      await getAllImages(fullPath, files)
    } else if (EXTENSIONS.includes(extname(entry.name).toLowerCase())) {
      files.push(fullPath)
    }
  }
  return files
}

function getMaxWidth(filePath) {
  if (filePath.includes('brands')) return 400
  const name = filePath.split(/[/\\]/).pop()
  return MAX_WIDTH[name] ?? MAX_WIDTH.default
}

async function optimizeImage(filePath) {
  const ext = extname(filePath).toLowerCase()
  const { size: before } = await stat(filePath)
  const maxWidth = getMaxWidth(filePath)

  const { readFile } = await import('fs/promises')
  const inputBuffer = await readFile(filePath)
  let pipeline = sharp(inputBuffer)
  const metadata = await pipeline.metadata()
  const needsResize = metadata.width > maxWidth

  if (needsResize) {
    pipeline = pipeline.resize(maxWidth, null, { withoutEnlargement: true })
  }

  if (ext === '.jpg' || ext === '.jpeg') {
    pipeline = pipeline.jpeg({ quality: 82, mozjpeg: true })
  } else if (ext === '.png') {
    pipeline = pipeline.png({ compressionLevel: 6 })
  }

  const buffer = await pipeline.toBuffer()
  if (buffer.length >= before) return null
  const { writeFile } = await import('fs/promises')
  await writeFile(filePath, buffer)
  const saved = ((before - buffer.length) / before * 100).toFixed(1)
  return { path: filePath.replace(IMAGES_DIR, ''), before, after: buffer.length, saved }
}

async function main() {
  console.log('Otimizando imagens em public/images...\n')
  const images = await getAllImages(IMAGES_DIR)
  let totalBefore = 0
  let totalAfter = 0

  for (const filePath of images) {
    try {
      const result = await optimizeImage(filePath)
      if (result) {
        totalBefore += result.before
        totalAfter += result.after
        console.log(`  ✓ ${result.path}  ${(result.before/1024).toFixed(1)} KB → ${(result.after/1024).toFixed(1)} KB (-${result.saved}%)`)
      }
    } catch (err) {
      console.error(`  ✗ ${filePath}: ${err.message}`)
    }
  }

  if (totalBefore > 0) {
    const totalSaved = ((totalBefore - totalAfter) / totalBefore * 100).toFixed(1)
    console.log(`\nTotal: ${(totalBefore/1024).toFixed(1)} KB → ${(totalAfter/1024).toFixed(1)} KB (-${totalSaved}%)`)
  }
  console.log('\nConcluído.')
}

main().catch(console.error)
