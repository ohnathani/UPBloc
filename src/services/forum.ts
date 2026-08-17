import { getAuthenticatedSupabase } from '../lib/persistence'

export type ForumPost = {
  id: string
  userId: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

type ForumPostRow = {
  id: string
  user_id: string
  title: string
  content: string
  created_at: string
  updated_at: string
}

const postSelect = 'id,user_id,title,content,created_at,updated_at'

function mapPost(row: ForumPostRow): ForumPost {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function listForumPosts() {
  const { client } = await getAuthenticatedSupabase()
  const { data, error } = await client
    .from('forum_posts')
    .select(postSelect)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as ForumPostRow[]).map(mapPost)
}

export async function createForumPost(values: { title: string; content: string }) {
  const { client, user } = await getAuthenticatedSupabase()
  const { data, error } = await client
    .from('forum_posts')
    .insert({
      user_id: user.id,
      title: values.title.trim(),
      content: values.content.trim(),
    })
    .select(postSelect)
    .single()

  if (error) throw error
  if (!data) throw new Error('The forum post was not returned by Supabase.')
  return mapPost(data as ForumPostRow)
}

export async function updateForumPost(
  postId: string,
  values: { title: string; content: string },
) {
  const { client, user } = await getAuthenticatedSupabase()
  const { data, error } = await client
    .from('forum_posts')
    .update({
      title: values.title.trim(),
      content: values.content.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', postId)
    .eq('user_id', user.id)
    .select(postSelect)
    .single()

  if (error) throw error
  if (!data) throw new Error('The forum post was not returned by Supabase.')
  return mapPost(data as ForumPostRow)
}

export async function deleteForumPost(postId: string) {
  const { client, user } = await getAuthenticatedSupabase()
  const { data, error } = await client
    .from('forum_posts')
    .delete()
    .eq('id', postId)
    .eq('user_id', user.id)
    .select('id')

  if (error) throw error
  if (!data?.some((row) => row.id === postId)) {
    throw new Error('The forum post was not found in Supabase.')
  }
}
