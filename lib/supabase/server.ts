import { createClient } from '@supabase/supabase-js'

export function supabaseServer() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Supabase server env vars missing')
  }

  return createClient(url, key)
}


