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
  ensureCurrentProfile,
  updateCurrentProfile,
} from '../../services/profiles'
import { getPersistenceErrorMessage } from '../../lib/persistence'
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

function getUserKey(userId: string | undefined) {
  return userId || null
}

function getPreferencesStorageKey(userId: string | undefined) {
  const key = getUserKey(userId)
  return key ? preferencesStoragePrefix + key : null
}

function readPreferences(userId: string | undefined) {
  try {
    const storageKey = getPreferencesStorageKey(userId)
    const raw = storageKey ? window.localStorage.getItem(storageKey) : null
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

function getWorkspaceName(user: unknown) {
  const metadataName = getMetadataValue(user, 'workspace_name')
  return metadataName || 'UPBloc'
}

export function SettingsProvider({ children }: PropsWithChildren) {
  const { user, updateUserMetadata: updateAuthUserMetadata } = useAuth()
  const userKey = getUserKey(user?.id)
  const [preferences, setPreferences] = useState<SettingsPreferences>(() =>
    readPreferences(user?.id),
  )
  const [workspaceName, setWorkspaceName] = useState('UPBloc')
  const [displayName, setDisplayName] = useState('')
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [settingsError, setSettingsError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setPreferences(readPreferences(user?.id))
    setWorkspaceName(getWorkspaceName(user))
    setDisplayName(getDisplayName(user))
    setSettingsError(null)
    setSettingsLoading(Boolean(user))

    if (!user) {
      setSettingsLoading(false)
      return () => {
        cancelled = true
      }
    }

    void (async () => {
      try {
        const profile = await ensureCurrentProfile(getDisplayName(user))
        if (cancelled) return
        setDisplayName(profile.fullName || getDisplayName(user))
      } catch (loadError) {
        if (cancelled) return
        console.error('Failed to load profile:', loadError)
        setSettingsError(
          getPersistenceErrorMessage(
            loadError,
            'Unable to load your profile settings.',
          ),
        )
      } finally {
        if (!cancelled) setSettingsLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user, userKey])

  useEffect(() => {
    const storageKey = getPreferencesStorageKey(user?.id)
    if (!storageKey) return

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(preferences))
    } catch {
      // Preferences remain available for the current session if storage is unavailable.
    }
  }, [preferences, user?.id])

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
      try {
        await updateAuthUserMetadata({ ...currentMetadata, ...metadata })
      } catch (metadataError) {
        const message =
          metadataError instanceof Error
            ? metadataError.message
            : 'Unable to save your settings. Please try again.'
        setSettingsError(message)
        throw metadataError
      }

      if (metadata.workspace_name) {
        setWorkspaceName(metadata.workspace_name)
      }
      if (metadata.full_name !== undefined) {
        setDisplayName(metadata.full_name)
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
      setSettingsError(null)
      try {
        const profile = await updateCurrentProfile({ fullName: trimmedName })
        setDisplayName(profile.fullName)
        await updateUserMetadata({ full_name: trimmedName })
      } catch (saveError) {
        const message = getPersistenceErrorMessage(
          saveError,
          'Unable to save your display name.',
        )
        setSettingsError(message)
        throw saveError
      }
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
