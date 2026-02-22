import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'favicon',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/favicon.ico' || req.url === '/favicon.ico/') {
            try {
              const logoPath = path.join(__dirname, 'public', 'images', 'logo.png')
              const data = readFileSync(logoPath)
              res.setHeader('Content-Type', 'image/png')
              res.setHeader('Cache-Control', 'public, max-age=86400')
              res.end(data)
            } catch {
              next()
            }
          } else {
            next()
          }
        })
      },
      writeBundle() {
        try {
          const logoPath = path.join(__dirname, 'public', 'images', 'logo.png')
          const outPath = path.join(__dirname, 'dist', 'favicon.ico')
          const data = readFileSync(logoPath)
          writeFileSync(outPath, data)
        } catch (_) {}
      },
    },
  ],
  appType: 'spa',
  build: {
    target: 'es2020',
    minify: 'esbuild',
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          i18n: ['i18next', 'react-i18next'],
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
    chunkSizeWarningLimit: 300,
  },
  server: {
    host: true,
    port: 3000,
    strictPort: false,
    open: '/',
  },
})
