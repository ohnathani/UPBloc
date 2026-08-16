import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/auth.hook'

export function LoginPage() {
  const navigate = useNavigate()
  const { signIn, loading: authLoading, authError } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!email.trim() || !password) {
      setError('Enter both your email and password.')
      return
    }

    setIsSubmitting(true)

    try {
      await signIn(email.trim(), password)
      navigate('/dashboard', { replace: true })
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : 'Unable to log in. Please try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const isBusy = authLoading || Boolean(authError) || isSubmitting

  return (
    <main className="page-shell">
      <section className="auth-card" aria-labelledby="login-title">
        <p className="eyebrow">UPBloc</p>
        <h1 id="login-title">Log in</h1>
        <p className="muted">Use your UPBloc account to continue.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label htmlFor="login-email">Email or username</label>
          <input
            id="login-email"
            type="text"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />

          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />

          {authError && (
            <p className="form-error" role="alert">
              {authError}
            </p>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={isBusy}>
            {isSubmitting ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        {import.meta.env.DEV && (
          <p className="form-footer">
            Development admin: <code>admin</code> / <code>admin</code>
          </p>
        )}

        <p className="form-footer">
          Don&apos;t have an account? <Link to="/register">Register</Link>
        </p>
      </section>
    </main>
  )
}
