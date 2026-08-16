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
import type {
  ActiveTimer,
  ManualTimeEntryValues,
  SaveActiveSessionValues,
  StartTimerValues,
  TimeEntry,
} from './types'
import { getElapsedSeconds } from './timeTracker.utils'

type TimeTrackerContextValue = {
  entries: TimeEntry[]
  activeTimer: ActiveTimer | null
  startTimer: (values: StartTimerValues) => boolean
  pauseTimer: () => void
  resumeTimer: () => void
  saveActiveSession: (values?: SaveActiveSessionValues) => TimeEntry | null
  addEntry: (values: ManualTimeEntryValues) => TimeEntry
  updateEntry: (entryId: string, values: ManualTimeEntryValues) => void
  deleteEntry: (entryId: string) => void
}

const TimeTrackerContext = createContext<TimeTrackerContextValue | undefined>(
  undefined,
)

function makeId(prefix: string) {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function getStorageKey(email: string | undefined) {
  return `upbloc:time-tracker:${email || 'anonymous'}`
}

type StoredTrackerState = {
  entries: TimeEntry[]
  activeTimer: ActiveTimer | null
}

function readState(key: string): StoredTrackerState {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return { entries: [], activeTimer: null }
    const parsed = JSON.parse(raw) as Partial<StoredTrackerState>
    return {
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      activeTimer: parsed.activeTimer ?? null,
    }
  } catch {
    return { entries: [], activeTimer: null }
  }
}

function acquireStartLock(key: string) {
  const lockKey = `${key}:start-lock`
  const now = Date.now()
  const existing = Number(window.localStorage.getItem(lockKey) ?? 0)

  // localStorage has no transaction primitive. A short-lived write/verify
  // lock closes the race where two tabs try to start at the same time.
  if (existing && now - existing < 3000) return null

  const token = String(now)
  window.localStorage.setItem(lockKey, token)
  return window.localStorage.getItem(lockKey) === token ? { lockKey, token } : null
}

function releaseStartLock(lock: { lockKey: string; token: string } | null) {
  if (lock && window.localStorage.getItem(lock.lockKey) === lock.token) {
    window.localStorage.removeItem(lock.lockKey)
  }
}

export function TimeTrackerProvider({ children }: PropsWithChildren) {
  const { user } = useAuth()
  const storageKey = getStorageKey(user?.email)
  const [state, setState] = useState<StoredTrackerState>(() =>
    readState(storageKey),
  )

  useEffect(() => {
    setState(readState(storageKey))
  }, [storageKey])

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key === storageKey) setState(readState(storageKey))
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [storageKey])

  const persist = useCallback(
    (nextState: StoredTrackerState) => {
      setState(nextState)
      window.localStorage.setItem(storageKey, JSON.stringify(nextState))
    },
    [storageKey],
  )

  const startTimer = useCallback(
    (values: StartTimerValues) => {
      const lock = acquireStartLock(storageKey)
      if (!lock) return false

      const current = readState(storageKey)
      if (current.activeTimer) {
        setState(current)
        releaseStartLock(lock)
        return false
      }
      const now = new Date().toISOString()
      persist({
        ...current,
        activeTimer: {
          ...values,
          id: makeId('timer'),
          startedAt: now,
          accumulatedSeconds: 0,
          lastResumedAt: now,
          status: 'running',
        },
      })
      releaseStartLock(lock)
      return true
    },
    [persist, storageKey],
  )

  const pauseTimer = useCallback(() => {
    const current = readState(storageKey)
    if (!current.activeTimer || current.activeTimer.status !== 'running') return
    const elapsed = getElapsedSeconds(current.activeTimer)
    persist({
      ...current,
      activeTimer: {
        ...current.activeTimer,
        accumulatedSeconds: elapsed,
        lastResumedAt: null,
        status: 'paused',
      },
    })
  }, [persist, storageKey])

  const resumeTimer = useCallback(() => {
    const current = readState(storageKey)
    if (!current.activeTimer || current.activeTimer.status !== 'paused') return
    persist({
      ...current,
      activeTimer: {
        ...current.activeTimer,
        lastResumedAt: new Date().toISOString(),
        status: 'running',
      },
    })
  }, [persist, storageKey])

  const saveActiveSession = useCallback(
    (values?: SaveActiveSessionValues) => {
      const current = readState(storageKey)
      if (!current.activeTimer) return null
      const timer = current.activeTimer
      const startAt = timer.startedAt
      const durationSeconds = Math.max(0, Math.floor(getElapsedSeconds(timer)))
      // endAt is the wall-clock stop time. durationSeconds is the separate
      // accumulated active-work total, so pauses remain visible in the range.
      const endAt = new Date().toISOString()
      const entry: TimeEntry = {
        id: makeId('time'),
        taskId: timer.taskId,
        eventId: timer.eventId,
        projectName: timer.projectName,
        course: timer.course,
        startAt,
        endAt,
        durationSeconds,
        notes: values?.notes?.trim() ?? timer.notes,
        createdAt: endAt,
        updatedAt: endAt,
      }
      persist({ entries: [entry, ...current.entries], activeTimer: null })
      return entry
    },
    [persist, storageKey],
  )

  const addEntry = useCallback(
    (values: ManualTimeEntryValues) => {
      const current = readState(storageKey)
      const now = new Date().toISOString()
      const entry: TimeEntry = {
        ...values,
        id: makeId('time'),
        durationSeconds: Math.max(
          0,
          Math.round(
            (new Date(values.endAt).getTime() -
              new Date(values.startAt).getTime()) /
              1000,
          ),
        ),
        createdAt: now,
        updatedAt: now,
      }
      persist({
        entries: [entry, ...current.entries],
        activeTimer: current.activeTimer,
      })
      return entry
    },
    [persist, storageKey],
  )

  const updateEntry = useCallback(
    (entryId: string, values: ManualTimeEntryValues) => {
      const current = readState(storageKey)
      const updatedAt = new Date().toISOString()
      persist({
        ...current,
        entries: current.entries.map((entry) =>
          entry.id === entryId
            ? {
                ...entry,
                ...values,
                durationSeconds: Math.max(
                  0,
                  Math.round(
                    (new Date(values.endAt).getTime() -
                      new Date(values.startAt).getTime()) /
                      1000,
                  ),
                ),
                updatedAt,
              }
            : entry,
        ),
      })
    },
    [persist, storageKey],
  )

  const deleteEntry = useCallback(
    (entryId: string) => {
      const current = readState(storageKey)
      persist({
        ...current,
        entries: current.entries.filter((entry) => entry.id !== entryId),
      })
    },
    [persist, storageKey],
  )

  const value = useMemo(
    () => ({
      entries: state.entries,
      activeTimer: state.activeTimer,
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
