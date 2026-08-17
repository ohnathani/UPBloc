import type { AuthError, User } from '@supabase/supabase-js'
import {
  getSupabaseClient,
  supabaseConfigError,
} from '../../lib/supabase'

function ensureSupabaseConfigured() {
  return getSupabaseClient()
}

export function getAuthErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
) {
  if (supabaseConfigError && error instanceof Error) {
    return error.message
  }

  const message =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message?: unknown }).message ?? '')
      : error instanceof Error
        ? error.message
        : ''

  const normalizedMessage = message.toLowerCase()

  if (normalizedMessage === 'invalid login credentials') {
    return 'The email or password is incorrect.'
  }

  if (
    normalizedMessage.includes('user already registered') ||
    normalizedMessage.includes('already been registered')
  ) {
    return 'An account with this email already exists.'
  }

  if (normalizedMessage.includes('password')) {
    if (
      normalizedMessage.includes('at least 8') ||
      normalizedMessage.includes('8 characters') ||
      normalizedMessage.includes('minimum 8') ||
      normalizedMessage.includes('too short')
    ) {
      return 'Password must contain at least 8 characters.'
    }

    if (
      normalizedMessage.includes('uppercase') ||
      normalizedMessage.includes('capital') ||
      normalizedMessage.includes('one uppercase')
    ) {
      return 'Password must contain at least 1 uppercase letter.'
    }

    if (
      normalizedMessage.includes('lowercase') ||
      normalizedMessage.includes('one lowercase')
    ) {
      return 'Password must contain at least 1 lowercase letter.'
    }

    if (
      normalizedMessage.includes('number') ||
      normalizedMessage.includes('digit') ||
      normalizedMessage.includes('numeric')
    ) {
      return 'Password must contain at least 1 number.'
    }

    if (
      normalizedMessage.includes('special character') ||
      normalizedMessage.includes('symbol') ||
      normalizedMessage.includes('non-alphanumeric') ||
      normalizedMessage.includes('special')
    ) {
      return 'Password must contain at least 1 special character.'
    }

    return 'Password must contain at least 8 characters, 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character.'
  }

  if (normalizedMessage.includes('email')) {
    if (normalizedMessage.includes('invalid')) {
      return 'Enter a valid email address.'
    }
    if (normalizedMessage.includes('rate limit')) {
      return 'Too many email requests. Please wait a moment and try again.'
    }
  }

  if (
    normalizedMessage.includes('failed to fetch') ||
    normalizedMessage.includes('network')
  ) {
    return 'Unable to reach Supabase. Check your connection and try again.'
  }

  if (normalizedMessage.includes('session')) {
    return 'Your authentication session is no longer valid. Please sign in again.'
  }

  return fallback
}

function throwAuthError(error: AuthError, fallback: string): never {
  throw new Error(getAuthErrorMessage(error, fallback))
}

export async function signIn(email: string, password: string) {
  const client = ensureSupabaseConfigured()

  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throwAuthError(error, 'Unable to log in. Please try again.')
}

export async function signUp(
  email: string,
  password: string,
  displayName: string,
) {
  const client = ensureSupabaseConfigured()

  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: displayName },
    },
  })

  if (error) throwAuthError(error, 'Unable to create your account.')

  return { requiresEmailConfirmation: data.session === null }
}

export async function signInWithGoogle() {
  const client = ensureSupabaseConfigured()

  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/dashboard`,
    },
  })

  if (error) throwAuthError(error, 'Unable to connect to Google.')
}

export async function signOut() {
  const client = ensureSupabaseConfigured()

  const { error } = await client.auth.signOut()
  if (error) throwAuthError(error, 'Unable to sign out. Please try again.')
}

export async function sendPasswordReset(email: string) {
  const client = ensureSupabaseConfigured()

  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })

  if (error) {
    throwAuthError(error, 'Unable to send the password reset email.')
  }
}

export async function updatePassword(password: string) {
  const client = ensureSupabaseConfigured()

  const { error } = await client.auth.updateUser({ password })
  if (error) throwAuthError(error, 'Unable to update your password.')
}

export async function updateUserMetadata(metadata: Record<string, string>) {
  const client = ensureSupabaseConfigured()

  const { data, error } = await client.auth.updateUser({ data: metadata })
  if (error) throwAuthError(error, 'Unable to update your profile.')
  return data.user as User
}
