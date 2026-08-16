import type { Session, User } from '@supabase/supabase-js'

export type AppUser = User

export type AuthContextValue = {
  session: Session | null
  user: AppUser | null
  isAuthenticated: boolean
  loading: boolean
  authError: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<{ requiresEmailConfirmation: boolean }>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  sendPasswordReset: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  updateUserMetadata: (metadata: Record<string, string>) => Promise<AppUser>
}
