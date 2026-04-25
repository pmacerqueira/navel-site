/**
 * Pós-build: HTML estático por rota pública (PT, sem ?lng) para melhor rastreio.
 * Usa vite preview + Puppeteer. Requer: npm install (devDependency puppeteer).
 */
import { mkdirSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const dist = join(root, 'dist')
const PORT = process.env.PRERENDER_PORT || '4188'

const ROUTES = [
  '/',
  '/sobre',
  '/produtos',
  '/marcas',
  '/milwaukee',
  '/istobal',
  '/servicos',
  '/catalogos',
  '/contacto',
  '/privacidade',
  '/rgpd',
  '/condicoes-gerais',
]

if (!existsSync(dist)) {
  console.error('[prerender] dist/ não existe. Corra vite build primeiro.')
  process.exit(1)
}

const viteJs = join(root, 'node_modules', 'vite', 'bin', 'vite.js')
if (!existsSync(viteJs)) {
  console.error('[prerender] node_modules/vite não encontrado.')
  process.exit(1)
}

const child = spawn(process.execPath, [viteJs, 'preview', '--port', PORT, '--strictPort'], {
  cwd: root,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env },
})

function killPreview() {
  try {
    child.kill('SIGTERM')
  } catch {
    /* ignore */
  }
}

async function waitForHttp(ms = 120000) {
  const deadline = Date.now() + ms
  const url = `http://127.0.0.1:${PORT}/`
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {
      /* servidor ainda a subir */
    }
    await new Promise((r) => setTimeout(r, 400))
  }
  throw new Error('Timeout à espera do vite preview em ' + url)
}

process.on('SIGINT', () => {
  killPreview()
  process.exit(1)
})

let exitCode = 0
try {
  await waitForHttp()
  const { default: puppeteer } = await import('puppeteer')
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })

  for (const route of ROUTES) {
    const url = `http://127.0.0.1:${PORT}${route}`
    process.stdout.write(`[prerender] ${url}\n`)
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 })
    await page.waitForFunction(
      () => {
        const m = document.querySelector('main#main-content')
        return m && m.innerText && m.innerText.trim().length > 40
      },
      { timeout: 90000 },
    )
    const html = await page.content()
    if (route === '/') {
      writeFileSync(join(dist, 'index.html'), html)
    } else {
      const dir = join(dist, route.slice(1))
      mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, 'index.html'), html)
    }
  }

  await browser.close()
  process.stdout.write(`[prerender] OK (${ROUTES.length} rotas, idioma default PT)\n`)
} catch (err) {
  console.error('[prerender] Falhou:', err.message || err)
  exitCode = 1
} finally {
  killPreview()
}

process.exit(exitCode)
