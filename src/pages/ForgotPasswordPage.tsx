import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../features/auth/auth.hook'

export function ForgotPasswordPage() {
  const { sendPasswordReset, loading: authLoading, authError } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setMessage(null)

    if (!email.trim()) {
      setError('Enter your email address.')
      return
    }

    setIsSubmitting(true)

    try {
      await sendPasswordReset(email.trim())
      setMessage(
        'If an account exists for this email, you will receive a password reset link shortly.',
      )
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : 'Unable to send the password reset email. Please try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const isBusy = authLoading || isSubmitting

  return (
    <main className="page-shell">
      <section className="auth-card" aria-labelledby="forgot-password-title">
        <p className="eyebrow">UPBloc</p>
        <h1 id="forgot-password-title">Reset your password</h1>

        <form onSubmit={handleSubmit} className="auth-form">
          <label htmlFor="forgot-password-email">Email</label>
          <input
            id="forgot-password-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
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
            {isSubmitting ? 'Sending email...' : 'Send reset link'}
          </button>
        </form>

        <p className="form-footer">
          Remembered your password? <Link to="/login">Log in</Link>
        </p>
      </section>
    </main>
  )
}
