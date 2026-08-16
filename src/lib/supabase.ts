import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

function isPlaceholder(value: string) {
  return (
    value === 'your-publishable-key' ||
    value.includes('your-project.supabase.co')
  )
}

function hasValidSupabaseUrl(value: string | undefined) {
  if (!value) return false

  try {
    const url = new URL(value)
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      (url.pathname === '' || url.pathname === '/') &&
      !url.search &&
      !url.hash
    )
  } catch {
    return false
  }
}

export const supabaseConfigError =
  !supabaseUrl || !supabasePublishableKey
    ? 'Supabase is not configured. Copy .env.example to .env.local and add your Supabase URL and publishable key.'
    : isPlaceholder(supabaseUrl) || isPlaceholder(supabasePublishableKey)
      ? 'Supabase is still using the example configuration. Replace the values in .env.local with your project URL and publishable key.'
      : !hasValidSupabaseUrl(supabaseUrl)
        ? 'Supabase URL is invalid. Set VITE_SUPABASE_URL to your project URL in .env.local.'
        : null

export const supabase: SupabaseClient | null = supabaseConfigError
  ? null
  : createClient(supabaseUrl, supabasePublishableKey)

export function getSupabaseClient() {
  if (!supabase) {
    throw new Error(
      supabaseConfigError ??
        'Supabase is not configured. Add the required environment variables and restart the dev server.',
    )
  }

  return supabase
}
