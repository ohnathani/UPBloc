import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react'
import {
  getAuthenticatedSupabase,
  getPersistenceErrorMessage,
} from '../../lib/persistence'
import { useAuth } from '../auth/auth.hook'
import type {
  ActiveTimer,
  ManualTimeEntryValues,
  SaveActiveSessionValues,
  StartTimerValues,
  TimeEntry,
} from './types'
import { getElapsedSeconds } from './timeTracker.utils'

type TimeEntryRow = {
  id: string
  user_id: string
  task_id: string | null
  event_id: string | null
  project_name: string
  course: string
  start_at: string
  end_at: string
  duration_seconds: number
  notes: string
  created_at: string
  updated_at: string
}

type TimeTrackerContextValue = {
  entries: TimeEntry[]
  activeTimer: ActiveTimer | null
  loading: boolean
  error: string | null
  startTimer: (values: StartTimerValues) => boolean
  pauseTimer: () => void
  resumeTimer: () => void
  saveActiveSession: (
    values?: SaveActiveSessionValues,
  ) => Promise<TimeEntry | null>
  addEntry: (values: ManualTimeEntryValues) => Promise<TimeEntry | null>
  updateEntry: (entryId: string, values: ManualTimeEntryValues) => Promise<void>
  deleteEntry: (entryId: string) => Promise<void>
}

const TimeTrackerContext = createContext<TimeTrackerContextValue | undefined>(
  undefined,
)

function makeId(prefix: string) {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function getStorageKey(userId: string | undefined) {
  return userId ? `upbloc:time-tracker:${userId}` : null
}

function readActiveTimer(storageKey: string | null) {
  if (!storageKey) return null

  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { activeTimer?: ActiveTimer | null }
    return parsed.activeTimer ?? null
  } catch {
    return null
  }
}

function writeActiveTimer(
  storageKey: string | null,
  activeTimer: ActiveTimer | null,
) {
  if (!storageKey) return

  try {
    window.localStorage.setItem(storageKey, JSON.stringify({ activeTimer }))
  } catch {
    // The active timer remains available in React state if storage is unavailable.
  }
}

function mapTimeEntry(row: TimeEntryRow): TimeEntry {
  return {
    id: row.id,
    taskId: row.task_id ?? '',
    eventId: row.event_id ?? '',
    projectName: row.project_name,
    course: row.course,
    startAt: row.start_at,
    endAt: row.end_at,
    durationSeconds: row.duration_seconds,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function timeEntryPayload(values: ManualTimeEntryValues) {
  return {
    task_id: values.taskId || null,
    event_id: values.eventId || null,
    project_name: values.projectName,
    course: values.course,
    start_at: values.startAt,
    end_at: values.endAt,
    duration_seconds: Math.max(
      0,
      Math.round(
        (new Date(values.endAt).getTime() -
          new Date(values.startAt).getTime()) /
          1000,
      ),
    ),
    notes: values.notes,
  }
}

const entrySelect =
  'id,user_id,task_id,event_id,project_name,course,start_at,end_at,duration_seconds,notes,created_at,updated_at'

type TrackerState = {
  entries: TimeEntry[]
  activeTimer: ActiveTimer | null
}

export function TimeTrackerProvider({ children }: PropsWithChildren) {
  const { user } = useAuth()
  const storageKey = getStorageKey(user?.id)
  const previousUserId = useRef<string | undefined>(user?.id)
  const [state, setState] = useState<TrackerState>(() => ({
    entries: [],
    activeTimer: readActiveTimer(storageKey),
  }))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const previousKey = getStorageKey(previousUserId.current)
    if (previousKey && previousKey !== storageKey) {
      window.localStorage.removeItem(previousKey)
      window.localStorage.removeItem(`${previousKey}:start-lock`)
    }
    previousUserId.current = user?.id

    let cancelled = false
    setState({ entries: [], activeTimer: readActiveTimer(storageKey) })
    setLoading(Boolean(user))
    setError(null)

    if (!user) {
      setLoading(false)
      return () => undefined
    }

    void (async () => {
      try {
        const { client, user: authenticatedUser } =
          await getAuthenticatedSupabase()
        if (authenticatedUser.id !== user.id) return

        const { data, error: responseError } = await client
          .from('time_entries')
          .select(entrySelect)
          .eq('user_id', authenticatedUser.id)
          .order('start_at', { ascending: false })

        if (responseError) throw responseError
        if (!cancelled) {
          setState((current) => ({
            ...current,
            entries: (data as TimeEntryRow[]).map(mapTimeEntry),
          }))
        }
      } catch (loadError) {
        if (cancelled) return
        console.error('Failed to load time entries:', loadError)
        setError(
          getPersistenceErrorMessage(loadError, 'Unable to load time entries.'),
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [storageKey, user])

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== storageKey) return
      setState((current) => ({
        ...current,
        activeTimer: readActiveTimer(storageKey),
      }))
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [storageKey])

  const persistActiveTimer = useCallback(
    (activeTimer: ActiveTimer | null) => {
      setState((current) => ({ ...current, activeTimer }))
      writeActiveTimer(storageKey, activeTimer)
    },
    [storageKey],
  )

  const startTimer = useCallback(
    (values: StartTimerValues) => {
      if (!user || !storageKey) return false
      const lockKey = `${storageKey}:start-lock`
      const now = Date.now()
      const existing = Number(window.localStorage.getItem(lockKey) ?? 0)
      if (existing && now - existing < 3000) return false

      const token = String(now)
      window.localStorage.setItem(lockKey, token)
      if (window.localStorage.getItem(lockKey) !== token) return false

      const currentTimer = readActiveTimer(storageKey)
      if (currentTimer) {
        window.localStorage.removeItem(lockKey)
        return false
      }

      const startedAt = new Date().toISOString()
      persistActiveTimer({
        ...values,
        id: makeId('timer'),
        startedAt,
        accumulatedSeconds: 0,
        lastResumedAt: startedAt,
        status: 'running',
      })
      window.localStorage.removeItem(lockKey)
      return true
    },
    [persistActiveTimer, storageKey, user],
  )

  const pauseTimer = useCallback(() => {
    if (!storageKey) return
    const currentTimer = readActiveTimer(storageKey)
    if (!currentTimer || currentTimer.status !== 'running') return

    persistActiveTimer({
      ...currentTimer,
      accumulatedSeconds: getElapsedSeconds(currentTimer),
      lastResumedAt: null,
      status: 'paused',
    })
  }, [persistActiveTimer, storageKey])

  const resumeTimer = useCallback(() => {
    if (!storageKey) return
    const currentTimer = readActiveTimer(storageKey)
    if (!currentTimer || currentTimer.status !== 'paused') return

    persistActiveTimer({
      ...currentTimer,
      lastResumedAt: new Date().toISOString(),
      status: 'running',
    })
  }, [persistActiveTimer, storageKey])

  const saveActiveSession = useCallback(
    async (values?: SaveActiveSessionValues) => {
      setError(null)
      try {
        if (!user || !storageKey) {
          throw new Error('You must be logged in to save tracked time.')
        }
        const timer = readActiveTimer(storageKey)
        if (!timer) return null
        const { client, user: authenticatedUser } =
          await getAuthenticatedSupabase()
        if (authenticatedUser.id !== user.id) {
          throw new Error('Your session changed. Please try again.')
        }

        const startAt = timer.startedAt
        const endAt = new Date().toISOString()
        const valuesForEntry: ManualTimeEntryValues = {
          taskId: timer.taskId,
          eventId: timer.eventId,
          projectName: timer.projectName,
          course: timer.course,
          startAt,
          endAt,
          notes: values?.notes?.trim() ?? timer.notes,
        }
        const durationSeconds = Math.max(
          0,
          Math.floor(getElapsedSeconds(timer)),
        )

        const { data, error: responseError } = await client
          .from('time_entries')
          .insert({
            user_id: authenticatedUser.id,
            ...timeEntryPayload(valuesForEntry),
            duration_seconds: durationSeconds,
          })
          .select(entrySelect)
          .single()

        if (responseError) throw responseError
        if (!data) {
          throw new Error('The tracked session was not returned by Supabase.')
        }
        const entry = mapTimeEntry(data as TimeEntryRow)
        persistActiveTimer(null)
        setState((current) => ({
          entries: [entry, ...current.entries],
          activeTimer: null,
        }))
        return entry
      } catch (saveError) {
        console.error('Failed to save active time session:', saveError)
        setError(
          getPersistenceErrorMessage(saveError, 'Unable to save tracked time.'),
        )
        throw saveError
      }
    },
    [persistActiveTimer, storageKey, user],
  )

  const addEntry = useCallback(
    async (values: ManualTimeEntryValues) => {
      setError(null)
      try {
        if (!user)
          throw new Error('You must be logged in to save tracked time.')
        const { client, user: authenticatedUser } =
          await getAuthenticatedSupabase()
        if (authenticatedUser.id !== user.id) {
          throw new Error('Your session changed. Please try again.')
        }

        const { data, error: responseError } = await client
          .from('time_entries')
          .insert({
            user_id: authenticatedUser.id,
            ...timeEntryPayload(values),
          })
          .select(entrySelect)
          .single()

        if (responseError) throw responseError
        if (!data)
          throw new Error('The time entry was not returned by Supabase.')
        const entry = mapTimeEntry(data as TimeEntryRow)
        setState((current) => ({
          ...current,
          entries: [entry, ...current.entries],
        }))
        return entry
      } catch (addError) {
        console.error('Failed to add time entry:', addError)
        setError(
          getPersistenceErrorMessage(addError, 'Unable to save time entry.'),
        )
        throw addError
      }
    },
    [user],
  )

  const updateEntry = useCallback(
    async (entryId: string, values: ManualTimeEntryValues) => {
      setError(null)
      try {
        if (!user)
          throw new Error('You must be logged in to update tracked time.')
        const { client, user: authenticatedUser } =
          await getAuthenticatedSupabase()
        if (authenticatedUser.id !== user.id) {
          throw new Error('Your session changed. Please try again.')
        }

        const { data, error: responseError } = await client
          .from('time_entries')
          .update({
            ...timeEntryPayload(values),
            updated_at: new Date().toISOString(),
          })
          .eq('id', entryId)
          .eq('user_id', authenticatedUser.id)
          .select(entrySelect)
          .single()

        if (responseError) throw responseError
        if (!data)
          throw new Error('The time entry was not returned by Supabase.')
        setState((current) => ({
          ...current,
          entries: current.entries.map((entry) =>
            entry.id === entryId ? mapTimeEntry(data as TimeEntryRow) : entry,
          ),
        }))
      } catch (updateError) {
        console.error('Failed to update time entry:', updateError)
        setError(
          getPersistenceErrorMessage(
            updateError,
            'Unable to update time entry.',
          ),
        )
        throw updateError
      }
    },
    [user],
  )

  const deleteEntry = useCallback(
    async (entryId: string) => {
      setError(null)
      try {
        if (!user)
          throw new Error('You must be logged in to delete tracked time.')
        const { client, user: authenticatedUser } =
          await getAuthenticatedSupabase()
        if (authenticatedUser.id !== user.id) {
          throw new Error('Your session changed. Please try again.')
        }

        const { data, error: responseError } = await client
          .from('time_entries')
          .delete()
          .eq('id', entryId)
          .eq('user_id', authenticatedUser.id)
          .select('id')

        if (responseError) throw responseError
        if (!data?.some((row) => row.id === entryId)) {
          throw new Error('The time entry was not found in Supabase.')
        }
        setState((current) => ({
          ...current,
          entries: current.entries.filter((entry) => entry.id !== entryId),
        }))
      } catch (deleteError) {
        console.error('Failed to delete time entry:', deleteError)
        setError(
          getPersistenceErrorMessage(
            deleteError,
            'Unable to delete time entry.',
          ),
        )
        throw deleteError
      }
    },
    [user],
  )

  const value = useMemo(
    () => ({
      entries: state.entries,
      activeTimer: state.activeTimer,
      loading,
      error,
      startTimer,
      pauseTimer,
      resumeTimer,
      saveActiveSession,
      addEntry,
      updateEntry,
      deleteEntry,
    }),
    [
      addEntry,
      deleteEntry,
      error,
      loading,
      pauseTimer,
      resumeTimer,
      saveActiveSession,
      startTimer,
      state,
      updateEntry,
    ],
  )

  return (
    <TimeTrackerContext.Provider value={value}>
      {children}
    </TimeTrackerContext.Provider>
  )
}

// This hook intentionally lives beside its provider so the feature has one public entry point.
// eslint-disable-next-line react-refresh/only-export-components
export function useTimeTracker() {
  const context = useContext(TimeTrackerContext)
  if (!context) {
    throw new Error('useTimeTracker must be used inside a TimeTrackerProvider')
  }
  return context
}
