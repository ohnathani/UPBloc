import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../features/auth/auth.hook'
import {
  createForumPost,
  deleteForumPost,
  listForumPosts,
  updateForumPost,
  type ForumPost,
} from '../services/forum'
import { getPersistenceErrorMessage } from '../lib/persistence'

const emptyForm = { title: '', content: '' }

export function ForumPage() {
  const { user } = useAuth()
  const [posts, setPosts] = useState<ForumPost[]>([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void listForumPosts()
      .then((nextPosts) => {
        if (!cancelled) setPosts(nextPosts)
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(getPersistenceErrorMessage(loadError, 'Unable to load forum posts.'))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [user?.id])

  function resetForm() {
    setForm(emptyForm)
    setEditingId(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.title.trim() || !form.content.trim()) {
      setError('Add a title and message before posting.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const post = editingId
        ? await updateForumPost(editingId, form)
        : await createForumPost(form)
      setPosts((current) =>
        editingId
          ? current.map((item) => (item.id === post.id ? post : item))
          : [post, ...current],
      )
      resetForm()
    } catch (saveError) {
      setError(getPersistenceErrorMessage(saveError, 'Unable to save forum post.'))
    } finally {
      setSaving(false)
    }
  }

  function editPost(post: ForumPost) {
    setEditingId(post.id)
    setForm({ title: post.title, content: post.content })
    setError(null)
  }

  async function removePost(post: ForumPost) {
    if (!window.confirm(`Delete “${post.title}”?`)) return
    setError(null)
    try {
      await deleteForumPost(post.id)
      setPosts((current) => current.filter((item) => item.id !== post.id))
    } catch (deleteError) {
      setError(getPersistenceErrorMessage(deleteError, 'Unable to delete forum post.'))
    }
  }

  return (
    <main className="page-shell app-page-shell">
      <div className="dashboard-card">
        <header className="settings-page-header">
          <h1>Forum</h1>
        </header>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="forum-title">Title</label>
          <input
            id="forum-title"
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            maxLength={160}
            required
          />
          <label htmlFor="forum-content">Message</label>
          <textarea
            id="forum-content"
            value={form.content}
            onChange={(event) => setForm({ ...form, content: event.target.value })}
            rows={5}
            required
          />
          {error && <p className="form-error" role="alert">{error}</p>}
          <div>
            <button type="submit" disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Save post' : 'Publish post'}
            </button>
            {editingId && (
              <button type="button" className="button-secondary" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {loading ? (
        <p className="status-message">Loading forum posts...</p>
      ) : posts.length === 0 ? (
        <section className="dashboard-card">
          <p className="muted">No forum posts yet. Start the conversation.</p>
        </section>
      ) : (
        <div className="dashboard-grid">
          {posts.map((post) => (
            <article className="dashboard-card" key={post.id}>
              <p className="eyebrow">{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(post.createdAt))}</p>
              <h2>{post.title}</h2>
              <p>{post.content}</p>
              {post.userId === user?.id && (
                <div>
                  <button type="button" className="button-secondary" onClick={() => editPost(post)}>Edit</button>
                  <button type="button" className="button-quiet button-danger" onClick={() => void removePost(post)}>Delete</button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </main>
  )
}
