/**
 * Mata processos que estejam a escutar nas portas típicas do Vite preview (4173-4176).
 * Windows: usa netstat + taskkill. Evita "Port in use" ao reiniciar o servidor.
 */
import { execSync } from 'child_process'
const ports = [4173, 4174, 4175, 4176]
const isWin = process.platform === 'win32'

for (const port of ports) {
  try {
    if (isWin) {
      const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
      const lines = out.trim().split(/\r?\n/).filter((l) => l.includes('LISTENING'))
      const pids = new Set()
      for (const line of lines) {
        const match = line.trim().split(/\s+/)
        const pid = match[match.length - 1]
        if (pid && /^\d+$/.test(pid)) pids.add(pid)
      }
      for (const pid of pids) {
        try {
          execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' })
          console.log(`Porta ${port}: processo ${pid} terminado.`)
        } catch (_) {}
      }
    } else {
      execSync(`lsof -ti:${port} | xargs -r kill -9`, { stdio: 'ignore' })
      console.log(`Porta ${port} libertada.`)
    }
  } catch (_) {
    // Nenhum processo na porta
  }
}
console.log('Portas de preview verificadas.')
