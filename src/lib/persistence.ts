import type { SupabaseClient, User } from '@supabase/supabase-js'
import { getSupabaseClient } from './supabase'

export type AuthenticatedSupabase = {
  client: SupabaseClient
  user: User
}

export async function getAuthenticatedSupabase(): Promise<AuthenticatedSupabase> {
  const client = getSupabaseClient()
  const {
    data: { user },
    error,
  } = await client.auth.getUser()

  if (error) throw error
  if (!user) throw new Error('You must be logged in to access your data.')

  return { client, user }
}

export function getPersistenceErrorMessage(
  error: unknown,
  fallback = 'Unable to save your data. Please try again.',
) {
  const message =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message?: unknown }).message ?? '')
      : error instanceof Error
        ? error.message
        : ''

  const normalizedMessage = message.toLowerCase()
  if (
    normalizedMessage.includes('failed to fetch') ||
    normalizedMessage.includes('network')
  ) {
    return 'Unable to reach Supabase. Check your connection and try again.'
  }
  if (
    normalizedMessage.includes('jwt') ||
    normalizedMessage.includes('session')
  ) {
    return 'Your session has expired. Please sign in again.'
  }

  return message || fallback
}
