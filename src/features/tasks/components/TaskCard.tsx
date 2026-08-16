import type { Task, TaskStatus } from '../types'
import { useCalendarEvents } from '../../schedule/calendarEvents.context'
import { getEventDurationMinutes } from '../../schedule/calendarEvents.utils'
import { useTimeTracker } from '../../time-tracker/timeTracker.context'

type TaskCardProps = {
  task: Task
  onToggle: (task: Task) => void
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
  onSchedule?: (task: Task) => void
  onTrack?: (task: Task) => void
  onDragStart?: (task: Task) => void
  onDragEnd?: () => void
  isDragging?: boolean
  onStatusChange?: (status: TaskStatus) => void
}

export function TaskCompletionCheckbox({
  task,
  onToggle,
}: {
  task: Task
  onToggle: (task: Task) => void
}) {
  return (
    <label className="task-check-control">
      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task)}
        aria-label={`Mark ${task.title} as ${task.completed ? 'active' : 'complete'}`}
      />
      <span className="task-checkmark" aria-hidden="true" />
    </label>
  )
}

function formatDueDate(dateValue: string) {
  const [year, month, day] = dateValue.split('-').map(Number)
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(year, month - 1, day))
}

function formatDueTime(timeValue: string) {
  const [hours, minutes] = timeValue.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (hours === 0) return `${remainingMinutes}m`
  if (remainingMinutes === 0) return `${hours}h`
  return `${hours}h ${remainingMinutes}m`
}

function formatSession(event: { startDateTime: string; endDateTime: string }) {
  const start = new Date(event.startDateTime)
  const end = new Date(event.endDateTime)
  const date = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(start)
  const time = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
  return `${date} · ${time.format(start)}–${time.format(end)}`
}

export function TaskCard({
  task,
  onToggle,
  onEdit,
  onDelete,
  onSchedule,
  onTrack,
  onDragStart,
  onDragEnd,
  isDragging = false,
  onStatusChange,
}: TaskCardProps) {
  const { events } = useCalendarEvents()
  const { entries: timeEntries, activeTimer } = useTimeTracker()
  const sessions = events.filter(
    (event) => event.taskId === task.id && event.type === 'task',
  )
  const scheduledMinutes = sessions.reduce(
    (total, event) => total + getEventDurationMinutes(event),
    0,
  )
  const trackedMinutes = Math.floor(
    timeEntries
      .filter((entry) => entry.taskId === task.id)
      .reduce((total, entry) => total + entry.durationSeconds, 0) / 60,
  )

  return (
    <article
      className={`task-card${task.completed ? ' is-completed' : ''}${isDragging ? ' is-dragging' : ''}`}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', task.id)
        onDragStart?.(task)
      }}
      onDragEnd={onDragEnd}
    >
      <TaskCompletionCheckbox task={task} onToggle={onToggle} />

      <div className="task-card-content">
        <div className="task-card-heading">
          <div>
            <h3>{task.title}</h3>
            {task.course && <p className="task-course">{task.course}</p>}
          </div>
          <span className={`priority-badge priority-${task.priority}`}>
            {task.priority}
          </span>
        </div>

        {task.description && (
          <p className="task-description">{task.description}</p>
        )}

        {sessions.length > 0 && (
          <div className="task-session-summary">
            <strong>Scheduled: {formatDuration(scheduledMinutes)}</strong>
            <span>{sessions.slice(0, 3).map(formatSession).join(' · ')}</span>
            {sessions.length > 3 && (
              <span>
                + {sessions.length - 3} more session
                {sessions.length - 3 === 1 ? '' : 's'}
              </span>
            )}
          </div>
        )}

        {trackedMinutes > 0 && (
          <p className="task-tracked-summary">
            <strong>Tracked: {formatDuration(trackedMinutes)}</strong>
            {scheduledMinutes > 0 && (
              <span> · Scheduled: {formatDuration(scheduledMinutes)}</span>
            )}
          </p>
        )}

        <div className="task-card-footer">
          <p className="task-due">
            <span aria-hidden="true">Due</span> {formatDueDate(task.dueDate)}
            {task.dueTime && ` · ${formatDueTime(task.dueTime)}`}
          </p>
          <span className={`task-status${task.completed ? ' complete' : ''}`}>
            {task.completed
              ? 'Completed'
              : task.status === 'in-progress'
                ? 'In progress'
                : 'Active'}
          </span>
          {onStatusChange && (
            <label className="task-status-select-label">
              <span>Move to</span>
              <select
                className="task-status-select"
                value={task.status}
                onChange={(event) =>
                  onStatusChange(event.target.value as TaskStatus)
                }
                aria-label={`Move ${task.title} to another column`}
              >
                <option value="todo">To do</option>
                <option value="in-progress">In progress</option>
                <option value="completed">Completed</option>
              </select>
            </label>
          )}
        </div>
      </div>

      <div className="task-card-actions">
        {onTrack && (
          <button
            type="button"
            className="button-quiet"
            onClick={() => onTrack(task)}
          >
            {activeTimer?.taskId === task.id
              ? 'View active timer'
              : 'Track time'}
          </button>
        )}
        {onSchedule && (
          <button
            type="button"
            className="button-quiet"
            onClick={() => onSchedule(task)}
          >
            Schedule time
          </button>
        )}
        <button
          type="button"
          className="button-quiet"
          onClick={() => onEdit(task)}
        >
          Edit
        </button>
        <button
          type="button"
          className="button-quiet button-danger"
          onClick={() => onDelete(task)}
        >
          Delete
        </button>
      </div>
    </article>
  )
}
