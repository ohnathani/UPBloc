import type { Session, User } from '@supabase/supabase-js'

export type AppUser = User | { email: string }

export type AuthContextValue = {
  session: Session | null
  user: AppUser | null
  loading: boolean
  authError: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (
    email: string,
    password: string,
  ) => Promise<{ requiresEmailConfirmation: boolean }>
  signOut: () => Promise<void>
}
