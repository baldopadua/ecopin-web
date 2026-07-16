import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabaseConfig = {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
}

// Only add storage config on client side
if (typeof window !== 'undefined') {
  supabaseConfig.auth.storage = window.localStorage
}

export const supabase = createClient(supabaseUrl, supabaseKey, supabaseConfig)