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
import type { CalendarEvent, CalendarEventDraft } from './types'

type CalendarEventRow = {
  id: string
  user_id: string
  title: string
  description: string
  type: CalendarEvent['type']
  start_datetime: string
  end_datetime: string
  location: string
  course: string
  task_id: string | null
}

type CalendarEventsContextValue = {
  events: CalendarEvent[]
  loading: boolean
  error: string | null
  saveEvent: (draft: CalendarEventDraft, editingId?: string) => Promise<void>
  deleteEvent: (eventId: string) => Promise<void>
  deleteFutureTaskEvents: (taskId: string) => Promise<void>
}

const CalendarEventsContext = createContext<
  CalendarEventsContextValue | undefined
>(undefined)

function mapEvent(row: CalendarEventRow): CalendarEvent {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type,
    startDateTime: row.start_datetime,
    endDateTime: row.end_datetime,
    location: row.location,
    course: row.course,
    taskId: row.task_id ?? '',
  }
}

function eventPayload(event: CalendarEventDraft) {
  return {
    title: event.title,
    description: event.description,
    type: event.type,
    start_datetime: event.startDateTime,
    end_datetime: event.endDateTime,
    location: event.location,
    course: event.course,
    task_id: event.taskId || null,
  }
}

const eventSelect =
  'id,user_id,title,description,type,start_datetime,end_datetime,location,course,task_id'

export function CalendarEventsProvider({ children }: PropsWithChildren) {
  const { user } = useAuth()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setEvents([])
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
          .from('calendar_events')
          .select(eventSelect)
          .eq('user_id', authenticatedUser.id)
          .order('start_datetime', { ascending: true })

        if (responseError) throw responseError
        if (!cancelled) setEvents((data as CalendarEventRow[]).map(mapEvent))
      } catch (loadError) {
        if (cancelled) return
        console.error('Failed to load calendar events:', loadError)
        setError(
          getPersistenceErrorMessage(
            loadError,
            'Unable to load calendar events.',
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

  const saveEvent = useCallback(
    async (draft: CalendarEventDraft, editingId?: string) => {
      setError(null)
      try {
        if (!user)
          throw new Error('You must be logged in to save calendar events.')
        const { client, user: authenticatedUser } =
          await getAuthenticatedSupabase()
        if (authenticatedUser.id !== user.id) {
          throw new Error('Your session changed. Please try again.')
        }

        if (editingId) {
          const { data, error: responseError } = await client
            .from('calendar_events')
            .update({
              ...eventPayload(draft),
              updated_at: new Date().toISOString(),
            })
            .eq('id', editingId)
            .eq('user_id', authenticatedUser.id)
            .select(eventSelect)
            .single()

          if (responseError) throw responseError
          if (!data)
            throw new Error('The calendar event was not returned by Supabase.')
          setEvents((current) =>
            current.map((event) =>
              event.id === editingId
                ? mapEvent(data as CalendarEventRow)
                : event,
            ),
          )
          return
        }

        const { data, error: responseError } = await client
          .from('calendar_events')
          .insert({ user_id: authenticatedUser.id, ...eventPayload(draft) })
          .select(eventSelect)
          .single()

        if (responseError) throw responseError
        if (!data)
          throw new Error('The calendar event was not returned by Supabase.')
        setEvents((current) => [...current, mapEvent(data as CalendarEventRow)])
      } catch (saveError) {
        console.error('Failed to save calendar event:', saveError)
        setError(
          getPersistenceErrorMessage(
            saveError,
            'Unable to save calendar event.',
          ),
        )
        throw saveError
      }
    },
    [user],
  )

  const deleteEvent = useCallback(
    async (eventId: string) => {
      setError(null)
      try {
        if (!user)
          throw new Error('You must be logged in to delete calendar events.')
        const { client, user: authenticatedUser } =
          await getAuthenticatedSupabase()
        if (authenticatedUser.id !== user.id) {
          throw new Error('Your session changed. Please try again.')
        }

        const { data, error: responseError } = await client
          .from('calendar_events')
          .delete()
          .eq('id', eventId)
          .eq('user_id', authenticatedUser.id)
          .select('id')

        if (responseError) throw responseError
        if (!data?.some((row) => row.id === eventId)) {
          throw new Error('The calendar event was not found in Supabase.')
        }
        setEvents((current) => current.filter((event) => event.id !== eventId))
      } catch (deleteError) {
        console.error('Failed to delete calendar event:', deleteError)
        setError(
          getPersistenceErrorMessage(
            deleteError,
            'Unable to delete calendar event.',
          ),
        )
        throw deleteError
      }
    },
    [user],
  )

  const deleteFutureTaskEvents = useCallback(
    async (taskId: string) => {
      setError(null)
      try {
        if (!user)
          throw new Error('You must be logged in to update calendar events.')
        const { client, user: authenticatedUser } =
          await getAuthenticatedSupabase()
        if (authenticatedUser.id !== user.id) {
          throw new Error('Your session changed. Please try again.')
        }
        const now = new Date().toISOString()
        const { error: responseError } = await client
          .from('calendar_events')
          .delete()
          .eq('task_id', taskId)
          .eq('user_id', authenticatedUser.id)
          .gt('start_datetime', now)

        if (responseError) throw responseError
        setEvents((current) =>
          current.filter(
            (event) =>
              event.taskId !== taskId ||
              new Date(event.startDateTime).getTime() <= Date.now(),
          ),
        )
      } catch (deleteError) {
        console.error('Failed to delete future task events:', deleteError)
        setError(
          getPersistenceErrorMessage(
            deleteError,
            'Unable to remove future task events.',
          ),
        )
        throw deleteError
      }
    },
    [user],
  )

  return (
    <CalendarEventsContext.Provider
      value={{
        events,
        loading,
        error,
        saveEvent,
        deleteEvent,
        deleteFutureTaskEvents,
      }}
    >
      {children}
    </CalendarEventsContext.Provider>
  )
}

// This hook intentionally lives beside its provider so the feature has one public entry point.
// eslint-disable-next-line react-refresh/only-export-components
export function useCalendarEvents() {
  const context = useContext(CalendarEventsContext)

  if (!context) {
    throw new Error(
      'useCalendarEvents must be used inside a CalendarEventsProvider',
    )
  }

  return context
}
