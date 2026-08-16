import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import { useAuth } from '../auth/auth.hook'
import {
  defaultSettingsPreferences,
  type SettingsPreferences,
} from './settings.types'

type SettingsContextValue = {
  preferences: SettingsPreferences
  setPreference: <K extends keyof SettingsPreferences>(
    key: K,
    value: SettingsPreferences[K],
  ) => void
  workspaceName: string
  displayName: string
  settingsLoading: boolean
  settingsError: string | null
  updateWorkspaceName: (name: string) => Promise<void>
  updateDisplayName: (name: string) => Promise<void>
}

const SettingsContext = createContext<SettingsContextValue | undefined>(
  undefined,
)

const preferencesStoragePrefix = 'upbloc:settings:'
const workspaceFallbackPrefix = 'upbloc:workspace-name:'

function getUserKey(email: string | undefined) {
  return email?.trim().toLowerCase() || 'anonymous'
}

function getPreferencesStorageKey(email: string | undefined) {
  return preferencesStoragePrefix + getUserKey(email)
}

function getWorkspaceFallbackKey(email: string | undefined) {
  return workspaceFallbackPrefix + getUserKey(email)
}

function readPreferences(email: string | undefined) {
  try {
    const raw = window.localStorage.getItem(getPreferencesStorageKey(email))
    if (!raw) {
      const legacySidebarState = window.localStorage.getItem(
        'upbloc-sidebar-collapsed',
      )
      return {
        ...defaultSettingsPreferences,
        ...(legacySidebarState === null
          ? {}
          : { sidebarDefaultCollapsed: legacySidebarState === 'true' }),
      }
    }
    const parsed = JSON.parse(raw) as Partial<SettingsPreferences>
    return { ...defaultSettingsPreferences, ...parsed }
  } catch {
    return defaultSettingsPreferences
  }
}

function getMetadataValue(user: unknown, key: string) {
  if (!user || typeof user !== 'object' || !('user_metadata' in user)) {
    return ''
  }
  const metadata = (user as { user_metadata?: Record<string, unknown> })
    .user_metadata
  const value = metadata?.[key]
  return typeof value === 'string' ? value.trim() : ''
}

function getDisplayName(user: unknown) {
  return (
    getMetadataValue(user, 'full_name') || getMetadataValue(user, 'name') || ''
  )
}

function getWorkspaceName(user: unknown, email: string | undefined) {
  const metadataName = getMetadataValue(user, 'workspace_name')
  if (metadataName) return metadataName

  try {
    return (
      window.localStorage.getItem(getWorkspaceFallbackKey(email)) || 'UPBloc'
    )
  } catch {
    return 'UPBloc'
  }
}

export function SettingsProvider({ children }: PropsWithChildren) {
  const { user, updateUserMetadata: updateAuthUserMetadata } = useAuth()
  const userKey = getUserKey(user?.email)
  const [preferences, setPreferences] = useState<SettingsPreferences>(() =>
    readPreferences(user?.email),
  )
  const [workspaceName, setWorkspaceName] = useState('UPBloc')
  const [displayName, setDisplayName] = useState('')
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [settingsError, setSettingsError] = useState<string | null>(null)

  useEffect(() => {
    setPreferences(readPreferences(user?.email))
    setWorkspaceName(getWorkspaceName(user, user?.email))
    setDisplayName(getDisplayName(user))
    setSettingsError(null)
    setSettingsLoading(false)
  }, [user, userKey])

  useEffect(() => {
    try {
      window.localStorage.setItem(
        getPreferencesStorageKey(user?.email),
        JSON.stringify(preferences),
      )
    } catch {
      // Preferences remain available for the current session if storage is unavailable.
    }
  }, [preferences, user?.email])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = preferences.theme
  }, [preferences.theme])

  const setPreference = useCallback(
    <K extends keyof SettingsPreferences>(
      key: K,
      value: SettingsPreferences[K],
    ) => {
      setPreferences((current) => ({ ...current, [key]: value }))
    },
    [],
  )

  const updateUserMetadata = useCallback(
    async (metadata: Record<string, string>) => {
      setSettingsError(null)

      if (!user) throw new Error('You must be logged in to update settings.')

      const currentMetadata = user.user_metadata ?? {}
      await updateAuthUserMetadata({ ...currentMetadata, ...metadata })

      if (metadata.workspace_name) {
        setWorkspaceName(metadata.workspace_name)
      }
      if (metadata.full_name !== undefined) {
        setDisplayName(metadata.full_name)
      }
      if (metadata.workspace_name) {
        try {
          window.localStorage.removeItem(getWorkspaceFallbackKey(user.email))
        } catch {
          // Ignore cleanup errors after a successful Supabase update.
        }
      }
    },
    [updateAuthUserMetadata, user],
  )

  const saveWorkspaceName = useCallback(
    async (name: string) => {
      const trimmedName = name.trim()
      if (!trimmedName) throw new Error('Workspace name cannot be empty.')
      if (trimmedName.length > 80) {
        throw new Error('Workspace name must be 80 characters or fewer.')
      }
      await updateUserMetadata({ workspace_name: trimmedName })
      setWorkspaceName(trimmedName)
    },
    [updateUserMetadata],
  )

  const saveDisplayName = useCallback(
    async (name: string) => {
      const trimmedName = name.trim()
      if (trimmedName.length > 80) {
        throw new Error('Display name must be 80 characters or fewer.')
      }
      await updateUserMetadata({ full_name: trimmedName })
      setDisplayName(trimmedName)
    },
    [updateUserMetadata],
  )

  const value = useMemo(
    () => ({
      preferences,
      setPreference,
      workspaceName,
      displayName,
      settingsLoading,
      settingsError,
      updateWorkspaceName: saveWorkspaceName,
      updateDisplayName: saveDisplayName,
    }),
    [
      displayName,
      preferences,
      saveDisplayName,
      saveWorkspaceName,
      setPreference,
      settingsError,
      settingsLoading,
      workspaceName,
    ],
  )

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  )
}

// This hook intentionally lives beside its provider so settings has one public entry point.
// eslint-disable-next-line react-refresh/only-export-components
export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context)
    throw new Error('useSettings must be used inside a SettingsProvider')
  return context
}
