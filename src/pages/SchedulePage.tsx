import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CalendarEventDetails } from '../features/schedule/components/CalendarEventDetails'
import { CalendarEventForm } from '../features/schedule/components/CalendarEventForm'
import { ScheduleEntryDetails } from '../features/schedule/components/ScheduleEntryDetails'
import { ScheduleEntryEditor } from '../features/schedule/components/ScheduleEntryEditor'
import { ScheduleImporter } from '../features/schedule/components/ScheduleImporter'
import { ScheduleTimetable } from '../features/schedule/components/ScheduleTimetable'
import { useCalendarEvents } from '../features/schedule/calendarEvents.context'
import { useSchedule } from '../features/schedule/schedule.context'
import { useTasks } from '../features/tasks/tasks.context'
import { useSettings } from '../features/settings/settings.context'
import type {
  CalendarEvent,
  CalendarEventDraft,
  ScheduleEntry,
  ScheduleEntryDraft,
} from '../features/schedule/types'

export function SchedulePage() {
  const { preferences } = useSettings()
  const navigate = useNavigate()
  const {
    entries,
    loading: scheduleLoading,
    importEntries,
    saveEntry: persistEntry,
    deleteEntry: removeEntry,
  } = useSchedule()
  const {
    events,
    loading: calendarLoading,
    saveEvent,
    deleteEvent,
  } = useCalendarEvents()
  const { tasks } = useTasks()
  const [isImporterOpen, setIsImporterOpen] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<ScheduleEntry | null>(null)
  const [editingEntry, setEditingEntry] = useState<ScheduleEntry | null>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [eventFormInitial, setEventFormInitial] = useState<
    Partial<CalendarEventDraft> | undefined
  >()
  const [isEventFormOpen, setIsEventFormOpen] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    const action = searchParams.get('action')
    const entryId = searchParams.get('entry')
    const eventId = searchParams.get('event')
    const taskId = searchParams.get('task')

    if (action === 'add') {
      setEditingEntry(null)
      setIsEditorOpen(true)
      setSearchParams({}, { replace: true })
    } else if (action === 'import') {
      setIsImporterOpen(true)
      setSearchParams({}, { replace: true })
    } else if (entryId) {
      const entry = entries.find((item) => item.id === entryId)
      if (entry) setSelectedEntry(entry)
      setSearchParams({}, { replace: true })
    } else if (eventId) {
      const event = events.find((item) => item.id === eventId)
      if (event) setSelectedEvent(event)
      setSearchParams({}, { replace: true })
    } else if (action === 'event' || taskId) {
      const task = taskId ? tasks.find((item) => item.id === taskId) : null
      setEditingEvent(null)
      setEventFormInitial(
        task
          ? {
              title: `Work on ${task.title}`,
              type: 'task',
              taskId: task.id,
              course: task.course,
            }
          : undefined,
      )
      setIsEventFormOpen(true)
      setSearchParams({}, { replace: true })
    }
  }, [entries, events, searchParams, setSearchParams, tasks])

  async function handleImport(importedEntries: ScheduleEntry[]) {
    try {
      await importEntries(importedEntries)
      setIsImporterOpen(false)
    } catch {
      // The provider exposes the persistent error through the app toast.
    }
  }

  if (scheduleLoading || calendarLoading) {
    return (
      <main className="page-shell app-page-shell schedule-page">
        <p className="status-message">Loading your schedule...</p>
      </main>
    )
  }

  function openNewEntryEditor() {
    setEditingEntry(null)
    setIsEditorOpen(true)
  }

  function openEditEntry(entry: ScheduleEntry) {
    setSelectedEntry(null)
    setEditingEntry(entry)
    setIsEditorOpen(true)
  }

  async function saveEntry(draft: ScheduleEntryDraft) {
    try {
      await persistEntry(draft, editingEntry?.id)
      setIsEditorOpen(false)
      setEditingEntry(null)
    } catch {
      // The provider exposes the persistent error through the app toast.
    }
  }

  async function deleteEntry(entry: ScheduleEntry) {
    if (!window.confirm(`Delete ${entry.courseCode} from your schedule?`))
      return
    try {
      await removeEntry(entry.id)
      setSelectedEntry(null)
    } catch {
      // The provider exposes the persistent error through the app toast.
    }
  }

  function openCreateEvent(values?: Partial<CalendarEventDraft>) {
    setSelectedEvent(null)
    setEditingEvent(null)
    setEventFormInitial(values)
    setIsEventFormOpen(true)
  }

  function openEditEvent(event: CalendarEvent) {
    setSelectedEvent(null)
    setEditingEvent(event)
    setEventFormInitial(undefined)
    setIsEventFormOpen(true)
  }

  async function handleSaveEvent(values: CalendarEventDraft) {
    try {
      await saveEvent(values, editingEvent?.id)
      setIsEventFormOpen(false)
      setEditingEvent(null)
      setEventFormInitial(undefined)
    } catch {
      // The provider exposes the persistent error through the app toast.
    }
  }

  async function handleDeleteEvent(event: CalendarEvent) {
    if (!window.confirm(`Delete "${event.title}" from your calendar?`)) return
    try {
      await deleteEvent(event.id)
      setSelectedEvent(null)
    } catch {
      // The provider exposes the persistent error through the app toast.
    }
  }

  function getEventConflicts(event: CalendarEvent) {
    const start = new Date(event.startDateTime).getTime()
    const end = new Date(event.endDateTime).getTime()
    const messages: string[] = []
    const eventDate = new Date(event.startDateTime)
    const day = eventDate.toLocaleDateString('en-US', { weekday: 'long' })

    entries.forEach((entry) => {
      if (!entry.days.includes(day as (typeof entry.days)[number])) return
      const classStart = new Date(eventDate)
      const classEnd = new Date(eventDate)
      const [startHour, startMinute] = entry.startTime.split(':').map(Number)
      const [endHour, endMinute] = entry.endTime.split(':').map(Number)
      classStart.setHours(startHour, startMinute, 0, 0)
      classEnd.setHours(endHour, endMinute, 0, 0)
      if (classEnd <= classStart) classEnd.setDate(classEnd.getDate() + 1)
      if (start < classEnd.getTime() && end > classStart.getTime()) {
        messages.push(`${event.title} overlaps with ${entry.courseCode}.`)
      }
    })

    events.forEach((other) => {
      if (other.id === event.id) return
      if (
        new Date(other.startDateTime).toDateString() !==
        eventDate.toDateString()
      )
        return
      const otherStart = new Date(other.startDateTime).getTime()
      const otherEnd = new Date(other.endDateTime).getTime()
      if (start < otherEnd && end > otherStart) {
        messages.push(`${event.title} overlaps with ${other.title}.`)
      }
    })

    return messages
  }

  return (
    <main className="page-shell app-page-shell schedule-page">
      <div className="schedule-page-inner">
        <header className="schedule-page-header">
          <div>
            <h1>Schedule</h1>
            <p className="muted">
              Keep classes, study time, task sessions, and personal commitments
              visible together. Import a CRS screenshot when you need a head
              start.
            </p>
          </div>
          <div className="schedule-page-actions">
            <button
              type="button"
              className="button-secondary"
              onClick={openNewEntryEditor}
            >
              Add class
            </button>
            <button type="button" onClick={() => setIsImporterOpen(true)}>
              Import CRS / Form 5
            </button>
            <button
              type="button"
              className="button-secondary"
              onClick={() => openCreateEvent()}
            >
              Add event
            </button>
          </div>
        </header>

        {entries.length > 0 || events.length > 0 ? (
          <ScheduleTimetable
            entries={entries}
            events={events}
            tasks={tasks}
            onSelectEntry={setSelectedEntry}
            onSelectEvent={setSelectedEvent}
            onCreateEvent={(values) =>
              openCreateEvent({
                startDateTime: `${values.date}T${values.startTime}`,
                endDateTime: `${values.date}T${values.endTime}`,
              })
            }
            weekStartsOn={preferences.weekStartsOn}
            timeFormat={preferences.timeFormat}
            defaultCalendarView={preferences.defaultCalendarView}
          />
        ) : (
          <section className="schedule-empty-state">
            <p className="eyebrow">Your week</p>
            <h2>No scheduled events yet.</h2>
            <p className="muted">
              Add a class, create a study block, or import your CRS schedule.
            </p>
            <div className="schedule-empty-actions">
              <button
                type="button"
                className="button-secondary"
                onClick={openNewEntryEditor}
              >
                Add class
              </button>
              <button type="button" onClick={() => setIsImporterOpen(true)}>
                Import CRS / Form 5
              </button>
              <button type="button" onClick={() => openCreateEvent()}>
                Add event
              </button>
            </div>
          </section>
        )}

        {isImporterOpen && (
          <div className="schedule-importer-backdrop" role="presentation">
            <div className="schedule-importer-dialog">
              <ScheduleImporter
                existingEntries={entries}
                onConfirm={handleImport}
                onClose={() => setIsImporterOpen(false)}
              />
            </div>
          </div>
        )}

        {selectedEntry && (
          <ScheduleEntryDetails
            entry={selectedEntry}
            onEdit={() => openEditEntry(selectedEntry)}
            onDelete={() => deleteEntry(selectedEntry)}
            onClose={() => setSelectedEntry(null)}
          />
        )}

        {selectedEvent && (
          <CalendarEventDetails
            event={selectedEvent}
            taskTitle={
              tasks.find((task) => task.id === selectedEvent.taskId)?.title
            }
            conflicts={getEventConflicts(selectedEvent)}
            onEdit={() => openEditEvent(selectedEvent)}
            onDelete={() => handleDeleteEvent(selectedEvent)}
            onClose={() => setSelectedEvent(null)}
            onStartTimer={() =>
              navigate(
                `/time-tracker?event=${encodeURIComponent(selectedEvent.id)}`,
              )
            }
          />
        )}

        {isEditorOpen && (
          <ScheduleEntryEditor
            entry={editingEntry}
            onSave={saveEntry}
            onCancel={() => {
              setIsEditorOpen(false)
              setEditingEntry(null)
            }}
          />
        )}

        {isEventFormOpen && (
          <CalendarEventForm
            event={editingEvent}
            initialValues={eventFormInitial}
            tasks={tasks}
            onSubmit={(values) => {
              const conflicts = getEventConflicts({
                ...values,
                id: editingEvent?.id ?? 'new-event',
              })
              if (
                conflicts.length > 0 &&
                !window.confirm(`${conflicts.join('\n')}\n\nSave anyway?`)
              )
                return
              handleSaveEvent(values)
            }}
            onClose={() => {
              setIsEventFormOpen(false)
              setEditingEvent(null)
              setEventFormInitial(undefined)
            }}
          />
        )}
      </div>
    </main>
  )
}
