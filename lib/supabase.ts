import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// True only when real credentials are present (not the .env.local placeholders).
export const isSupabaseConfigured = Boolean(
  url && anonKey && !url.startsWith('your_') && !anonKey.startsWith('your_')
)

// When credentials are still the .env.local placeholders, fall back to a
// syntactically-valid dummy so createClient() doesn't throw at import. Real
// network calls are gated on isSupabaseConfigured, so the dummy is never hit.
export const supabase = createClient(
  isSupabaseConfigured ? url! : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? anonKey! : 'placeholder-anon-key'
)
