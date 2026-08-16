import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/auth.hook'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const {
    user,
    updatePassword,
    loading: authLoading,
    authError,
  } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!password || !confirmPassword) {
      setError('Complete both password fields.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)

    try {
      await updatePassword(password)
      navigate('/dashboard', { replace: true })
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : 'Unable to update your password. Please try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const isBusy = authLoading || isSubmitting

  if (!authLoading && !user) {
    return (
      <main className="page-shell">
        <section className="auth-card" aria-labelledby="reset-password-title">
          <p className="eyebrow">UPBloc</p>
          <h1 id="reset-password-title">Reset link unavailable</h1>
          <p className="muted">
            This password reset link is invalid or expired. Request a new one to
            continue.
          </p>
          <p className="form-footer">
            <Link to="/forgot-password">Request a new reset link</Link>
          </p>
        </section>
      </main>
    )
  }

  return (
    <main className="page-shell">
      <section className="auth-card" aria-labelledby="reset-password-title">
        <p className="eyebrow">UPBloc</p>
        <h1 id="reset-password-title">Choose a new password</h1>
        <p className="muted">Set a new password for your UPBloc account.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label htmlFor="reset-password">New password</label>
          <input
            id="reset-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            required
          />

          <label htmlFor="reset-password-confirm">Confirm new password</label>
          <input
            id="reset-password-confirm"
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

          <button type="submit" disabled={isBusy}>
            {isSubmitting ? 'Updating password...' : 'Update password'}
          </button>
        </form>
      </section>
    </main>
  )
}
