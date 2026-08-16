import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/auth.hook'

export function RegisterPage() {
  const navigate = useNavigate()
  const { signUp, loading: authLoading, authError } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setMessage(null)

    if (!email.trim() || !password || !confirmPassword) {
      setError('Complete all fields before registering.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)

    try {
      const { requiresEmailConfirmation } = await signUp(email.trim(), password)

      if (requiresEmailConfirmation) {
        setMessage(
          'Account created. Check your email to confirm your account, then log in.',
        )
      } else {
        navigate('/dashboard', { replace: true })
      }
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : 'Unable to register. Please try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const isBusy = authLoading || Boolean(authError) || isSubmitting

  return (
    <main className="page-shell">
      <section className="auth-card" aria-labelledby="register-title">
        <p className="eyebrow">UPBloc</p>
        <h1 id="register-title">Create an account</h1>
        <p className="muted">Start using UPBloc with your email address.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label htmlFor="register-email">Email</label>
          <input
            id="register-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />

          <label htmlFor="register-password">Password</label>
          <input
            id="register-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            required
          />

          <label htmlFor="register-confirm-password">Confirm password</label>
          <input
            id="register-confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
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
          {message && (
            <p className="form-success" role="status">
              {message}
            </p>
          )}

          <button type="submit" disabled={isBusy}>
            {isSubmitting ? 'Registering...' : 'Register'}
          </button>
        </form>

        <p className="form-footer">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </section>
    </main>
  )
}
