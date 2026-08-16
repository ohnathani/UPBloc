import { useEffect, useState, type FormEvent } from 'react'
import type { Task } from '../../tasks/types'
import {
  calendarEventTypes,
  type CalendarEvent,
  type CalendarEventDraft,
  type CalendarEventType,
} from '../types'

type CalendarEventFormProps = {
  event: CalendarEvent | null
  initialValues?: Partial<CalendarEventDraft>
  tasks: Task[]
  onSubmit: (values: CalendarEventDraft) => void
  onClose: () => void
}

const emptyValues: CalendarEventDraft = {
  title: '',
  description: '',
  type: 'study',
  startDateTime: '',
  endDateTime: '',
  location: '',
  course: '',
  taskId: '',
}

function valuesFromEvent(
  event: CalendarEvent | null,
  initialValues: Partial<CalendarEventDraft> | undefined,
) {
  return { ...emptyValues, ...initialValues, ...(event ?? {}) }
}

function eventTypeLabel(type: CalendarEventType) {
  return {
    study: 'Study block',
    task: 'Task session',
    exam: 'Exam',
    personal: 'Personal event',
    other: 'Other',
  }[type]
}

export function CalendarEventForm({
  event,
  initialValues,
  tasks,
  onSubmit,
  onClose,
}: CalendarEventFormProps) {
  const [values, setValues] = useState<CalendarEventDraft>(() =>
    valuesFromEvent(event, initialValues),
  )
  const [error, setError] = useState<string | null>(null)
  const isEditing = Boolean(event)

  useEffect(() => {
    setValues(valuesFromEvent(event, initialValues))
    setError(null)
  }, [event, initialValues])

  function updateValue<Key extends keyof CalendarEventDraft>(
    key: Key,
    value: CalendarEventDraft[Key],
  ) {
    setValues((current) => ({ ...current, [key]: value }))
    setError(null)
  }

  function handleSubmit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault()

    if (!values.title.trim()) {
      setError('Add a title for this event.')
      return
    }
    if (!values.startDateTime || !values.endDateTime) {
      setError('Choose a date and time range.')
      return
    }
    if (new Date(values.endDateTime) <= new Date(values.startDateTime)) {
      setError('End time must be after the start time.')
      return
    }
    if (values.type === 'task' && !values.taskId) {
      setError('Choose the task this session is for.')
      return
    }

    onSubmit({
      ...values,
      title: values.title.trim(),
      description: values.description.trim(),
      location: values.location.trim(),
      course: values.course.trim(),
    })
  }

  return (
    <div
      className="task-modal-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="task-modal calendar-event-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-event-form-title"
        onMouseDown={(formEvent) => formEvent.stopPropagation()}
      >
        <div className="task-modal-heading">
          <div>
            <p className="eyebrow">Calendar event</p>
            <h2 id="calendar-event-form-title">
              {isEditing ? 'Edit event' : 'Create event'}
            </h2>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close event form"
          >
            ×
          </button>
        </div>

        <form className="task-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="calendar-event-title">Title</label>
            <input
              id="calendar-event-title"
              value={values.title}
              onChange={(event) => updateValue('title', event.target.value)}
              autoFocus
            />
          </div>

          <div className="task-form-grid">
            <div className="form-field">
              <label htmlFor="calendar-event-type">Type</label>
              <select
                id="calendar-event-type"
                value={values.type}
                onChange={(event) => {
                  const type = event.target.value as CalendarEventType
                  setValues((current) => ({
                    ...current,
                    type,
                    taskId: type === 'task' ? current.taskId : '',
                  }))
                }}
              >
                {calendarEventTypes.map((type) => (
                  <option value={type} key={type}>
                    {eventTypeLabel(type)}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="calendar-event-course">Course</label>
              <input
                id="calendar-event-course"
                value={values.course}
                onChange={(event) => updateValue('course', event.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="task-form-grid">
            <div className="form-field">
              <label htmlFor="calendar-event-start">Starts</label>
              <input
                id="calendar-event-start"
                type="datetime-local"
                value={values.startDateTime}
                onChange={(event) =>
                  updateValue('startDateTime', event.target.value)
                }
              />
            </div>
            <div className="form-field">
              <label htmlFor="calendar-event-end">Ends</label>
              <input
                id="calendar-event-end"
                type="datetime-local"
                value={values.endDateTime}
                onChange={(event) =>
                  updateValue('endDateTime', event.target.value)
                }
              />
            </div>
          </div>

          {values.type === 'task' && (
            <div className="form-field">
              <label htmlFor="calendar-event-task">Task</label>
              <select
                id="calendar-event-task"
                value={values.taskId}
                onChange={(event) => updateValue('taskId', event.target.value)}
              >
                <option value="">Select a task</option>
                {tasks
                  .filter((task) => !task.completed)
                  .map((task) => (
                    <option value={task.id} key={task.id}>
                      {task.title}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div className="form-field">
            <label htmlFor="calendar-event-location">Location</label>
            <input
              id="calendar-event-location"
              value={values.location}
              onChange={(event) => updateValue('location', event.target.value)}
              placeholder="Optional"
            />
          </div>

          <div className="form-field">
            <label htmlFor="calendar-event-description">Description</label>
            <textarea
              id="calendar-event-description"
              rows={3}
              value={values.description}
              onChange={(event) =>
                updateValue('description', event.target.value)
              }
            />
          </div>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <div className="task-form-actions">
            <button
              type="button"
              className="button-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit">
              {isEditing ? 'Save changes' : 'Create event'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
