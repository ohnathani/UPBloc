import {
  createContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  getSupabaseClient,
  supabaseConfigError,
} from '../../lib/supabase'
import type { AuthContextValue } from './auth.types'
import {
  getAuthErrorMessage,
  sendPasswordReset,
  signIn,
  signInWithGoogle,
  signOut,
  signUp,
  updatePassword,
  updateUserMetadata,
} from './auth.service'

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    if (supabaseConfigError) {
      setAuthError(supabaseConfigError)
      setLoading(false)
      return () => {
        isMounted = false
      }
    }

    const client = getSupabaseClient()

    client.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return

      if (error) {
        setAuthError(
          getAuthErrorMessage(
            error,
            'Unable to restore your session. Please refresh and try again.',
          ),
        )
      } else {
        setSession(data.session)
      }
      setLoading(false)
    })

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (isMounted) {
        setSession(nextSession)
        setAuthError(null)
        setLoading(false)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    isAuthenticated: Boolean(session?.user),
    loading,
    authError,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    sendPasswordReset,
    updatePassword,
    updateUserMetadata,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { AuthContext }
