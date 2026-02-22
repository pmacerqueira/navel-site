/**
 * Cria o utilizador admin (comercial@navel.pt) no Supabase.
 * Requer SUPABASE_SERVICE_ROLE_KEY em .env (Supabase → Settings → API → service_role).
 *
 * Executar: node scripts/create-admin.js
 * Ou: node --env-file=.env scripts/create-admin.js
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Carregar .env manualmente (Node não carrega por defeito)
function loadEnv() {
  const envPath = join(__dirname, '..', '.env')
  if (!existsSync(envPath)) return
  const content = readFileSync(envPath, 'utf8')
  for (const line of content.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const val = match[2].trim().replace(/^["']|["']$/g, '')
      process.env[key] = val
    }
  }
}
loadEnv()

const ADMIN_EMAIL = 'comercial@navel.pt'
const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const password = process.env.SUPABASE_ADMIN_PASSWORD || generatePassword()

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%'
  let p = ''
  for (let i = 0; i < 16; i++) p += chars[Math.floor(Math.random() * chars.length)]
  return p
}

async function main() {
  if (!url || !serviceKey) {
    console.error('Erro: Defina VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env')
    console.error('Obtenha a service_role em: Supabase → Settings → API → service_role')
    process.exit(1)
  }

  const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

  const { data, error } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password,
    email_confirm: true,
  })

  if (error) {
    if (error.message?.includes('already been registered')) {
      console.log('O utilizador comercial@navel.pt já existe. Nada a fazer.')
      return
    }
    console.error('Erro ao criar admin:', error.message)
    process.exit(1)
  }

  console.log('Admin criado com sucesso.')
  console.log('Email:', ADMIN_EMAIL)
  console.log('Password:', password)
  console.log('\nGuarde a password em local seguro. Pode alterá-la em Supabase → Authentication → Users.')
}

main()
