import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/auth.hook'

export function LoginPage() {
  const navigate = useNavigate()
  const {
    signIn,
    signInWithGoogle,
    loading: authLoading,
    authError,
  } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState<'password' | 'google' | null>(
    null,
  )

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!email.trim() || !password) {
      setError('Enter both your email and password.')
      return
    }

    setSubmitting('password')

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
      setSubmitting(null)
    }
  }

  async function handleGoogleSignIn() {
    setError(null)
    setSubmitting('google')

    try {
      await signInWithGoogle()
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : 'Unable to connect to Google. Please try again.',
      )
      setSubmitting(null)
    }
  }

  const isBusy = authLoading || submitting !== null

  return (
    <main className="page-shell">
      <section className="auth-card" aria-labelledby="login-title">
        <p className="eyebrow">UPBloc</p>
        <h1 id="login-title">Log in</h1>

        <form onSubmit={handleSubmit} className="auth-form">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
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
            {submitting === 'password' ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <div className="auth-divider" aria-hidden="true">
          <span>or</span>
        </div>

        <button
          type="button"
          className="button-secondary auth-provider-button"
          onClick={handleGoogleSignIn}
          disabled={isBusy}
        >
          {submitting === 'google'
            ? 'Connecting to Google...'
            : 'Continue with Google'}
        </button>

        <p className="form-footer">
          <Link to="/forgot-password">Forgot password?</Link>
        </p>
        <p className="form-footer">
          Don&apos;t have an account? <Link to="/signup">Create account</Link>
        </p>
      </section>
    </main>
  )
}
