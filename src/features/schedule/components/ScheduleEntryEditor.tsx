import { useEffect, useState, type FormEvent } from 'react'
import type { ScheduleEntry, ScheduleEntryDraft, ScheduleDay } from '../types'
import { scheduleDays } from '../types'

type ScheduleEntryEditorProps = {
  entry: ScheduleEntry | null
  onSave: (entry: ScheduleEntryDraft) => void
  onCancel: () => void
}

type EditorErrors = Partial<Record<keyof ScheduleEntryDraft, string>>

const emptyEntry: ScheduleEntryDraft = {
  classCode: '',
  scheduleGroupId: '',
  courseCode: '',
  courseTitle: '',
  section: '',
  instructor: '',
  room: '',
  days: [],
  startTime: '',
  endTime: '',
  units: null,
}

function getEntryDraft(entry: ScheduleEntry | null): ScheduleEntryDraft {
  if (!entry) return emptyEntry
  return {
    classCode: entry.classCode ?? '',
    scheduleGroupId: entry.scheduleGroupId ?? '',
    courseCode: entry.courseCode,
    courseTitle: entry.courseTitle,
    section: entry.section,
    instructor: entry.instructor,
    room: entry.room,
    days: entry.days,
    startTime: entry.startTime,
    endTime: entry.endTime,
    units: entry.units,
  }
}

export function ScheduleEntryEditor({
  entry,
  onSave,
  onCancel,
}: ScheduleEntryEditorProps) {
  const [values, setValues] = useState<ScheduleEntryDraft>(() =>
    getEntryDraft(entry),
  )
  const [errors, setErrors] = useState<EditorErrors>({})

  useEffect(() => {
    setValues(getEntryDraft(entry))
    setErrors({})
  }, [entry])

  function updateValue<Key extends keyof ScheduleEntryDraft>(
    key: Key,
    value: ScheduleEntryDraft[Key],
  ) {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  function toggleDay(day: ScheduleDay) {
    const days = values.days.includes(day)
      ? values.days.filter((item) => item !== day)
      : [...values.days, day]
    updateValue('days', days)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: EditorErrors = {}
    if (!values.courseCode.trim())
      nextErrors.courseCode = 'Course code is required.'
    if (values.days.length === 0) nextErrors.days = 'Choose at least one day.'
    if (!values.startTime) nextErrors.startTime = 'Start time is required.'
    if (!values.endTime) nextErrors.endTime = 'End time is required.'
    if (
      values.startTime &&
      values.endTime &&
      values.startTime >= values.endTime
    ) {
      nextErrors.endTime = 'End time must be after start time.'
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    onSave({
      ...values,
      courseCode: values.courseCode.trim().toUpperCase(),
      courseTitle: values.courseTitle.trim(),
      section: values.section.trim(),
      instructor: values.instructor.trim(),
      room: values.room.trim(),
    })
  }

  return (
    <div
      className="schedule-editor-backdrop"
      role="presentation"
      onMouseDown={onCancel}
    >
      <section
        className="schedule-editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-editor-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="schedule-editor-heading">
          <div>
            <p className="eyebrow">Class details</p>
            <h2 id="schedule-editor-title">
              {entry ? 'Edit class' : 'Add a class'}
            </h2>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onCancel}
            aria-label="Close class editor"
          >
            ×
          </button>
        </div>

        <form className="schedule-entry-form" onSubmit={handleSubmit}>
          <div className="schedule-entry-grid">
            <div className="form-field">
              <label htmlFor="schedule-class-code">
                Class code <span className="label-optional">Optional</span>
              </label>
              <input
                id="schedule-class-code"
                value={values.classCode ?? ''}
                onChange={(event) =>
                  updateValue('classCode', event.target.value)
                }
              />
            </div>
            <div className="form-field">
              <label htmlFor="schedule-course-code">Course code *</label>
              <input
                id="schedule-course-code"
                value={values.courseCode}
                onChange={(event) =>
                  updateValue('courseCode', event.target.value)
                }
                aria-invalid={Boolean(errors.courseCode)}
              />
              {errors.courseCode && (
                <p className="field-error">{errors.courseCode}</p>
              )}
            </div>
            <div className="form-field">
              <label htmlFor="schedule-section">Section</label>
              <input
                id="schedule-section"
                value={values.section}
                onChange={(event) => updateValue('section', event.target.value)}
              />
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="schedule-course-title">Course title</label>
            <input
              id="schedule-course-title"
              value={values.courseTitle}
              onChange={(event) =>
                updateValue('courseTitle', event.target.value)
              }
            />
          </div>

          <div className="schedule-entry-grid">
            <div className="form-field">
              <label htmlFor="schedule-instructor">Instructor</label>
              <input
                id="schedule-instructor"
                value={values.instructor}
                onChange={(event) =>
                  updateValue('instructor', event.target.value)
                }
              />
            </div>
            <div className="form-field">
              <label htmlFor="schedule-room">Room</label>
              <input
                id="schedule-room"
                value={values.room}
                onChange={(event) => updateValue('room', event.target.value)}
              />
            </div>
          </div>

          <fieldset className="schedule-days-fieldset">
            <legend>Days *</legend>
            <div className="schedule-day-options">
              {scheduleDays.map((day) => (
                <label key={day}>
                  <input
                    type="checkbox"
                    checked={values.days.includes(day)}
                    onChange={() => toggleDay(day)}
                  />
                  <span>{day.slice(0, 2)}</span>
                </label>
              ))}
            </div>
            {errors.days && <p className="field-error">{errors.days}</p>}
          </fieldset>

          <div className="schedule-entry-grid">
            <div className="form-field">
              <label htmlFor="schedule-start-time">Start time *</label>
              <input
                id="schedule-start-time"
                type="time"
                value={values.startTime}
                onChange={(event) =>
                  updateValue('startTime', event.target.value)
                }
                aria-invalid={Boolean(errors.startTime)}
              />
              {errors.startTime && (
                <p className="field-error">{errors.startTime}</p>
              )}
            </div>
            <div className="form-field">
              <label htmlFor="schedule-end-time">End time *</label>
              <input
                id="schedule-end-time"
                type="time"
                value={values.endTime}
                onChange={(event) => updateValue('endTime', event.target.value)}
                aria-invalid={Boolean(errors.endTime)}
              />
              {errors.endTime && (
                <p className="field-error">{errors.endTime}</p>
              )}
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="schedule-units">
              Units <span className="label-optional">Optional</span>
            </label>
            <input
              id="schedule-units"
              type="number"
              min="0"
              step="0.5"
              value={values.units ?? ''}
              onChange={(event) =>
                updateValue(
                  'units',
                  event.target.value ? Number(event.target.value) : null,
                )
              }
            />
          </div>

          <div className="schedule-editor-actions">
            <button
              type="button"
              className="button-secondary"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button type="submit">Save class</button>
          </div>
        </form>
      </section>
    </div>
  )
}
