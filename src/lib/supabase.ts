import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabaseConfigError =
  !supabaseUrl || !supabasePublishableKey
    ? 'Supabase is not configured. Copy .env.example to .env.local and add your Supabase URL and publishable key.'
    : null

export const supabase = createClient(
  supabaseUrl || 'https://missing-supabase-config.supabase.co',
  supabasePublishableKey || 'missing-supabase-publishable-key',
)
