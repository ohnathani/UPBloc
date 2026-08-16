import {
  createContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react'
import type { AuthError, Session } from '@supabase/supabase-js'
import { supabase, supabaseConfigError } from '../../lib/supabase'
import type { AppUser, AuthContextValue } from './auth.types'

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function getAuthErrorMessage(error: AuthError | Error): string {
  if (error.message === 'Invalid login credentials') {
    return 'The email or password is incorrect.'
  }

  return error.message
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null)
  const [demoUser, setDemoUser] = useState<AppUser | null>(null)
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

    supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return

      if (error) {
        setAuthError(getAuthErrorMessage(error))
      } else {
        setSession(data.session)
      }
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (isMounted) {
        setSession(nextSession)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function signIn(email: string, password: string) {
    if (import.meta.env.DEV && email.trim().toLowerCase() === 'admin') {
      if (password === 'admin') {
        setAuthError(null)
        setDemoUser({ email: 'admin' })
        return
      }

      throw new Error('For the development admin account, use password admin.')
    }

    if (supabaseConfigError) {
      throw new Error(supabaseConfigError)
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      throw new Error(getAuthErrorMessage(error))
    }
  }

  async function signUp(email: string, password: string) {
    if (supabaseConfigError) {
      throw new Error(supabaseConfigError)
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      throw new Error(getAuthErrorMessage(error))
    }

    return { requiresEmailConfirmation: data.session === null }
  }

  async function signOut() {
    if (demoUser) {
      setDemoUser(null)
      return
    }

    if (supabaseConfigError) {
      throw new Error(supabaseConfigError)
    }

    const { error } = await supabase.auth.signOut()

    if (error) {
      throw new Error(getAuthErrorMessage(error))
    }
  }

  const value: AuthContextValue = {
    session,
    user: demoUser ?? session?.user ?? null,
    loading,
    authError,
    signIn,
    signUp,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { AuthContext }
