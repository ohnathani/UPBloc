import type { ScheduleEntry } from '../types'

type ScheduleEntryDetailsProps = {
  entry: ScheduleEntry
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
}

function formatTime(value: string) {
  const [hours, minutes] = value.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export function ScheduleEntryDetails({
  entry,
  onEdit,
  onDelete,
  onClose,
}: ScheduleEntryDetailsProps) {
  return (
    <div
      className="schedule-details-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="schedule-details"
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-details-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="schedule-details-heading">
          <div>
            <p className="eyebrow">Class details</p>
            <h2 id="schedule-details-title">{entry.courseCode}</h2>
            <p>{entry.courseTitle || 'Course title not set'}</p>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close class details"
          >
            ×
          </button>
        </div>

        <dl className="schedule-details-list">
          {entry.classCode && (
            <div>
              <dt>Class code</dt>
              <dd>{entry.classCode}</dd>
            </div>
          )}
          <div>
            <dt>Days</dt>
            <dd>{entry.days.join(' / ') || 'Not set'}</dd>
          </div>
          <div>
            <dt>Time</dt>
            <dd>
              {formatTime(entry.startTime)} – {formatTime(entry.endTime)}
            </dd>
          </div>
          <div>
            <dt>Room</dt>
            <dd>{entry.room || 'Not set'}</dd>
          </div>
          <div>
            <dt>Section</dt>
            <dd>{entry.section || 'Not set'}</dd>
          </div>
          <div>
            <dt>Instructor</dt>
            <dd>{entry.instructor || 'Not set'}</dd>
          </div>
          <div>
            <dt>Units</dt>
            <dd>{entry.units ?? 'Not set'}</dd>
          </div>
        </dl>

        <div className="schedule-details-actions">
          <button type="button" className="button-secondary" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="button-quiet button-danger"
            onClick={onDelete}
          >
            Delete
          </button>
          <button type="button" onClick={onEdit}>
            Edit
          </button>
        </div>
      </section>
    </div>
  )
}
