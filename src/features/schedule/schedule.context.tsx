import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react'
import {
  getAuthenticatedSupabase,
  getPersistenceErrorMessage,
} from '../../lib/persistence'
import { useAuth } from '../auth/auth.hook'
import type { ScheduleEntry, ScheduleEntryDraft } from './types'

type ScheduleEntryRow = {
  id: string
  user_id: string
  class_code: string
  schedule_group_id: string | null
  course_code: string
  course_title: string
  section: string
  instructor: string
  room: string
  days: ScheduleEntry['days']
  start_time: string
  end_time: string
  units: number | null
}

type ScheduleContextValue = {
  entries: ScheduleEntry[]
  loading: boolean
  error: string | null
  importEntries: (entries: ScheduleEntry[]) => Promise<void>
  saveEntry: (draft: ScheduleEntryDraft, editingId?: string) => Promise<void>
  deleteEntry: (entryId: string) => Promise<void>
}

const ScheduleContext = createContext<ScheduleContextValue | undefined>(
  undefined,
)

function mapEntry(row: ScheduleEntryRow): ScheduleEntry {
  return {
    id: row.id,
    classCode: row.class_code,
    scheduleGroupId: row.schedule_group_id ?? undefined,
    courseCode: row.course_code,
    courseTitle: row.course_title,
    section: row.section,
    instructor: row.instructor,
    room: row.room,
    days: row.days,
    startTime: row.start_time,
    endTime: row.end_time,
    units: row.units,
  }
}

function entryPayload(entry: ScheduleEntryDraft) {
  return {
    class_code: entry.classCode ?? '',
    schedule_group_id: entry.scheduleGroupId ?? null,
    course_code: entry.courseCode,
    course_title: entry.courseTitle,
    section: entry.section,
    instructor: entry.instructor,
    room: entry.room,
    days: entry.days,
    start_time: entry.startTime,
    end_time: entry.endTime,
    units: entry.units,
  }
}

const entrySelect =
  'id,user_id,class_code,schedule_group_id,course_code,course_title,section,instructor,room,days,start_time,end_time,units'

export function ScheduleProvider({ children }: PropsWithChildren) {
  const { user } = useAuth()
  const [entries, setEntries] = useState<ScheduleEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setEntries([])
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
          .from('schedule_entries')
          .select(entrySelect)
          .eq('user_id', authenticatedUser.id)
          .order('created_at', { ascending: true })

        if (responseError) throw responseError
        if (!cancelled) setEntries((data as ScheduleEntryRow[]).map(mapEntry))
      } catch (loadError) {
        if (cancelled) return
        console.error('Failed to load schedule entries:', loadError)
        setError(
          getPersistenceErrorMessage(
            loadError,
            'Unable to load your schedule.',
          ),
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user])

  const importEntries = useCallback(
    async (importedEntries: ScheduleEntry[]) => {
      setError(null)
      try {
        if (!user)
          throw new Error('You must be logged in to save your schedule.')
        if (importedEntries.length === 0) return
        const { client, user: authenticatedUser } =
          await getAuthenticatedSupabase()
        if (authenticatedUser.id !== user.id) {
          throw new Error('Your session changed. Please try again.')
        }

        const { data, error: responseError } = await client
          .from('schedule_entries')
          .insert(
            importedEntries.map((entry) => ({
              user_id: authenticatedUser.id,
              ...entryPayload(entry),
            })),
          )
          .select(entrySelect)

        if (responseError) throw responseError
        if (!data)
          throw new Error('The imported schedule was not returned by Supabase.')
        setEntries((current) => [
          ...current,
          ...(data as ScheduleEntryRow[]).map(mapEntry),
        ])
      } catch (importError) {
        console.error('Failed to import schedule:', importError)
        setError(
          getPersistenceErrorMessage(
            importError,
            'Unable to import your schedule.',
          ),
        )
        throw importError
      }
    },
    [user],
  )

  const saveEntry = useCallback(
    async (draft: ScheduleEntryDraft, editingId?: string) => {
      setError(null)
      try {
        if (!user)
          throw new Error('You must be logged in to save your schedule.')
        const { client, user: authenticatedUser } =
          await getAuthenticatedSupabase()
        if (authenticatedUser.id !== user.id) {
          throw new Error('Your session changed. Please try again.')
        }

        if (editingId) {
          const { data, error: responseError } = await client
            .from('schedule_entries')
            .update({
              ...entryPayload(draft),
              updated_at: new Date().toISOString(),
            })
            .eq('id', editingId)
            .eq('user_id', authenticatedUser.id)
            .select(entrySelect)
            .single()

          if (responseError) throw responseError
          if (!data)
            throw new Error('The schedule entry was not returned by Supabase.')
          setEntries((current) =>
            current.map((entry) =>
              entry.id === editingId
                ? mapEntry(data as ScheduleEntryRow)
                : entry,
            ),
          )
          return
        }

        const { data, error: responseError } = await client
          .from('schedule_entries')
          .insert({ user_id: authenticatedUser.id, ...entryPayload(draft) })
          .select(entrySelect)
          .single()

        if (responseError) throw responseError
        if (!data)
          throw new Error('The schedule entry was not returned by Supabase.')
        setEntries((current) => [
          ...current,
          mapEntry(data as ScheduleEntryRow),
        ])
      } catch (saveError) {
        console.error('Failed to save schedule entry:', saveError)
        setError(
          getPersistenceErrorMessage(
            saveError,
            'Unable to save your schedule.',
          ),
        )
        throw saveError
      }
    },
    [user],
  )

  const deleteEntry = useCallback(
    async (entryId: string) => {
      setError(null)
      try {
        if (!user)
          throw new Error('You must be logged in to delete schedule entries.')
        const { client, user: authenticatedUser } =
          await getAuthenticatedSupabase()
        if (authenticatedUser.id !== user.id) {
          throw new Error('Your session changed. Please try again.')
        }

        const { data, error: responseError } = await client
          .from('schedule_entries')
          .delete()
          .eq('id', entryId)
          .eq('user_id', authenticatedUser.id)
          .select('id')

        if (responseError) throw responseError
        if (!data?.some((row) => row.id === entryId)) {
          throw new Error('The schedule entry was not found in Supabase.')
        }
        setEntries((current) => current.filter((entry) => entry.id !== entryId))
      } catch (deleteError) {
        console.error('Failed to delete schedule entry:', deleteError)
        setError(
          getPersistenceErrorMessage(
            deleteError,
            'Unable to delete your schedule entry.',
          ),
        )
        throw deleteError
      }
    },
    [user],
  )

  return (
    <ScheduleContext.Provider
      value={{ entries, loading, error, importEntries, saveEntry, deleteEntry }}
    >
      {children}
    </ScheduleContext.Provider>
  )
}

// This hook intentionally lives beside its provider so the feature has one public entry point.
// eslint-disable-next-line react-refresh/only-export-components
export function useSchedule() {
  const context = useContext(ScheduleContext)

  if (!context) {
    throw new Error('useSchedule must be used inside a ScheduleProvider')
  }

  return context
}
