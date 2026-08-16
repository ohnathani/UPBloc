import {
  createContext,
  useCallback,
  useContext,
  useState,
  type PropsWithChildren,
} from 'react'
import type { CalendarEvent, CalendarEventDraft } from './types'

type CalendarEventsContextValue = {
  events: CalendarEvent[]
  saveEvent: (draft: CalendarEventDraft, editingId?: string) => void
  deleteEvent: (eventId: string) => void
  deleteFutureTaskEvents: (taskId: string) => void
}

const CalendarEventsContext = createContext<
  CalendarEventsContextValue | undefined
>(undefined)

export function CalendarEventsProvider({ children }: PropsWithChildren) {
  const [events, setEvents] = useState<CalendarEvent[]>([])

  const saveEvent = useCallback(
    (draft: CalendarEventDraft, editingId?: string) => {
      setEvents((current) =>
        editingId
          ? current.map((event) =>
              event.id === editingId ? { ...draft, id: editingId } : event,
            )
          : [...current, { ...draft, id: `event-${Date.now()}` }],
      )
    },
    [],
  )

  const deleteEvent = useCallback((eventId: string) => {
    setEvents((current) => current.filter((event) => event.id !== eventId))
  }, [])

  const deleteFutureTaskEvents = useCallback((taskId: string) => {
    const now = Date.now()
    setEvents((current) =>
      current.filter(
        (event) =>
          event.taskId !== taskId ||
          new Date(event.startDateTime).getTime() <= now,
      ),
    )
  }, [])

  return (
    <CalendarEventsContext.Provider
      value={{ events, saveEvent, deleteEvent, deleteFutureTaskEvents }}
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
