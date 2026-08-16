import type { CalendarEvent } from '../types'

type CalendarEventDetailsProps = {
  event: CalendarEvent
  taskTitle?: string
  conflicts: string[]
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
  onStartTimer?: () => void
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export function CalendarEventDetails({
  event,
  taskTitle,
  conflicts,
  onEdit,
  onDelete,
  onClose,
  onStartTimer,
}: CalendarEventDetailsProps) {
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
        aria-labelledby="calendar-event-details-title"
        onMouseDown={(mouseEvent) => mouseEvent.stopPropagation()}
      >
        <div className="schedule-details-heading">
          <div>
            <p className="eyebrow">
              {event.type === 'task' ? 'Task session' : 'Calendar event'}
            </p>
            <h2 id="calendar-event-details-title">{event.title}</h2>
            <p>
              {event.course || event.location || 'No course or location set'}
            </p>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close event details"
          >
            ×
          </button>
        </div>

        <dl className="schedule-details-list">
          <div>
            <dt>When</dt>
            <dd>
              {formatDateTime(event.startDateTime)} –{' '}
              {formatDateTime(event.endDateTime)}
            </dd>
          </div>
          <div>
            <dt>Location</dt>
            <dd>{event.location || 'Not set'}</dd>
          </div>
          {taskTitle && (
            <div>
              <dt>Task</dt>
              <dd>{taskTitle}</dd>
            </div>
          )}
        </dl>

        {event.description && (
          <p className="schedule-event-description">{event.description}</p>
        )}
        {conflicts.length > 0 && (
          <div className="schedule-conflict-panel" role="alert">
            <strong>Schedule conflict</strong>
            {conflicts.map((conflict) => (
              <p key={conflict}>{conflict}</p>
            ))}
          </div>
        )}

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
          {onStartTimer && (
            <button
              type="button"
              className="button-secondary"
              onClick={onStartTimer}
            >
              Start timer
            </button>
          )}
          <button type="button" onClick={onEdit}>
            Edit
          </button>
        </div>
      </section>
    </div>
  )
}
