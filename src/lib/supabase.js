/**
 * Cliente Supabase para autenticação e área reservada.
 * Configurar VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em .env
 */
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  console.warn('[Navel] Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em .env')
}

export const supabase = url && anonKey ? createClient(url, anonKey) : null
