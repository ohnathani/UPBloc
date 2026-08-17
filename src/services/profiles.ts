import { getAuthenticatedSupabase } from '../lib/persistence'

export type Profile = {
  id: string
  fullName: string
  username: string
  avatarUrl: string
  createdAt: string
  updatedAt?: string
}

type ProfileRow = {
  id: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
  created_at: string
  updated_at?: string
}

const profileSelect = 'id,full_name,username,avatar_url,created_at,updated_at'

function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    fullName: row.full_name ?? '',
    username: row.username ?? '',
    avatarUrl: row.avatar_url ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function profilePayload(userId: string, fullName: string) {
  return { id: userId, full_name: fullName || null }
}

/**
 * Loads the current user's profile and creates it when an older account does
 * not have the trigger-created row yet. The user id always comes from the
 * authenticated Supabase session, never from a caller.
 */
export async function ensureCurrentProfile(fallbackFullName = '') {
  const { client, user } = await getAuthenticatedSupabase()

  const { error: upsertError } = await client
    .from('profiles')
    .upsert(profilePayload(user.id, fallbackFullName.trim()), {
      onConflict: 'id',
      ignoreDuplicates: true,
    })

  if (upsertError) throw upsertError

  const { data, error } = await client
    .from('profiles')
    .select(profileSelect)
    .eq('id', user.id)
    .single()

  if (error) throw error
  if (!data) throw new Error('Your profile was not returned by Supabase.')
  return mapProfile(data as ProfileRow)
}

export async function updateCurrentProfile(values: { fullName: string }) {
  const { client, user } = await getAuthenticatedSupabase()
  const { data, error } = await client
    .from('profiles')
    .update({ full_name: values.fullName.trim() || null })
    .eq('id', user.id)
    .select(profileSelect)
    .single()

  if (error) throw error
  if (!data) throw new Error('Your profile was not returned by Supabase.')
  return mapProfile(data as ProfileRow)
}
