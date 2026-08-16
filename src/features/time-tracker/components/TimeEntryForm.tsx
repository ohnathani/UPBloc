import { useEffect, useState, type FormEvent } from 'react'
import type { Task } from '../../tasks/types'
import type { ManualTimeEntryValues, TimeEntry } from '../types'

type TimeEntryFormProps = {
  entry: TimeEntry | null
  tasks: Task[]
  initialValues?: Partial<ManualTimeEntryValues>
  onSubmit: (values: ManualTimeEntryValues) => void
  onClose: () => void
}

function localInputValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function defaultValues(): ManualTimeEntryValues {
  const end = new Date()
  const start = new Date(end.getTime() - 60 * 60_000)
  return {
    projectName: '',
    taskId: '',
    eventId: '',
    course: '',
    startAt: localInputValue(start),
    endAt: localInputValue(end),
    notes: '',
  }
}

function valuesFromEntry(
  entry: TimeEntry | null,
  initialValues?: Partial<ManualTimeEntryValues>,
) {
  if (entry) {
    return {
      projectName: entry.projectName,
      taskId: entry.taskId,
      eventId: entry.eventId,
      course: entry.course,
      startAt: localInputValue(new Date(entry.startAt)),
      endAt: localInputValue(new Date(entry.endAt)),
      notes: entry.notes,
    }
  }
  return { ...defaultValues(), ...initialValues }
}

export function TimeEntryForm({
  entry,
  tasks,
  initialValues,
  onSubmit,
  onClose,
}: TimeEntryFormProps) {
  const [values, setValues] = useState<ManualTimeEntryValues>(() =>
    valuesFromEntry(entry, initialValues),
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setValues(valuesFromEntry(entry, initialValues))
    setError(null)
  }, [entry, initialValues])

  function updateValue<Key extends keyof ManualTimeEntryValues>(
    key: Key,
    value: ManualTimeEntryValues[Key],
  ) {
    setValues((current) => ({ ...current, [key]: value }))
    setError(null)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!values.projectName.trim()) {
      setError('Add a project or task name.')
      return
    }
    if (!values.startAt || !values.endAt) {
      setError('Choose a start and end time.')
      return
    }
    const start = new Date(values.startAt)
    const end = new Date(values.endAt)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setError('Choose valid start and end times.')
      return
    }
    if (end <= start) {
      setError('End time must be after the start time.')
      return
    }
    onSubmit({
      ...values,
      projectName: values.projectName.trim(),
      course: values.course.trim(),
      notes: values.notes.trim(),
    })
  }

  return (
    <div
      className="task-modal-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="task-modal time-entry-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="time-entry-form-title"
        onMouseDown={(mouseEvent) => mouseEvent.stopPropagation()}
      >
        <div className="task-modal-heading">
          <div>
            <p className="eyebrow">Time tracker</p>
            <h2 id="time-entry-form-title">
              {entry ? 'Edit time entry' : 'Add time'}
            </h2>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close time entry form"
          >
            ×
          </button>
        </div>

        <form className="task-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="time-entry-project">Project / task</label>
            <input
              id="time-entry-project"
              value={values.projectName}
              onChange={(event) =>
                updateValue('projectName', event.target.value)
              }
              autoFocus
            />
          </div>

          <div className="task-form-grid">
            <div className="form-field">
              <label htmlFor="time-entry-task">Existing task</label>
              <select
                id="time-entry-task"
                value={values.taskId}
                onChange={(event) => updateValue('taskId', event.target.value)}
              >
                <option value="">No linked task</option>
                {tasks.map((task) => (
                  <option value={task.id} key={task.id}>
                    {task.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="time-entry-course">Course</label>
              <input
                id="time-entry-course"
                value={values.course}
                onChange={(event) => updateValue('course', event.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="task-form-grid">
            <div className="form-field">
              <label htmlFor="time-entry-start">Start</label>
              <input
                id="time-entry-start"
                type="datetime-local"
                value={values.startAt}
                onChange={(event) => updateValue('startAt', event.target.value)}
              />
            </div>
            <div className="form-field">
              <label htmlFor="time-entry-end">End</label>
              <input
                id="time-entry-end"
                type="datetime-local"
                value={values.endAt}
                onChange={(event) => updateValue('endAt', event.target.value)}
              />
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="time-entry-notes">
              Notes <span className="label-optional">Optional</span>
            </label>
            <textarea
              id="time-entry-notes"
              rows={3}
              value={values.notes}
              onChange={(event) => updateValue('notes', event.target.value)}
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
              {entry ? 'Save changes' : 'Save entry'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
