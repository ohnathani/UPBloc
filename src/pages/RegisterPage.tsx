import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/auth.hook'
import { getPasswordValidationError } from '../features/auth/passwordValidation'

const passwordRequirements = [
  'At least 8 characters',
  'At least 1 uppercase letter',
  'At least 1 lowercase letter',
  'At least 1 number',
  'At least 1 special character',
]

export function RegisterPage() {
  const navigate = useNavigate()
  const { signUp, loading: authLoading, authError } = useAuth()
  const [displayName, setDisplayName] = useState('')
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

    if (!displayName.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Complete all fields before registering.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    const passwordValidationError = getPasswordValidationError(password)
    if (passwordValidationError) {
      setError(passwordValidationError)
      return
    }

    setIsSubmitting(true)

    try {
      const { requiresEmailConfirmation } = await signUp(
        email.trim(),
        password,
        displayName.trim(),
      )

      if (requiresEmailConfirmation) {
        setMessage(
          'Account created. A verification email has been sent. Check your email to confirm your account, then log in.',
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

  const isBusy = authLoading || isSubmitting

  return (
    <main className="page-shell">
      <section className="auth-card" aria-labelledby="register-title">
        <p className="eyebrow">UPBloc</p>
        <h1 id="register-title">Create an account</h1>

        <form onSubmit={handleSubmit} className="auth-form">
          <label htmlFor="register-display-name">Display name</label>
          <input
            id="register-display-name"
            type="text"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            autoComplete="name"
            maxLength={80}
            required
          />

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
            minLength={8}
            required
          />
          <div className="muted" aria-live="polite">
            <strong>Password must contain:</strong>
            <ul>
              {passwordRequirements.map((requirement) => (
                <li key={requirement}>{requirement}</li>
              ))}
            </ul>
          </div>

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
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="form-footer">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </section>
    </main>
  )
}
