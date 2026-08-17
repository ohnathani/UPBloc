import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useCalendarEvents } from '../features/schedule/calendarEvents.context'
import { useTasks } from '../features/tasks/tasks.context'
import { useSettings } from '../features/settings/settings.context'
import { TimeEntryForm } from '../features/time-tracker/components/TimeEntryForm'
import { useTimeTracker } from '../features/time-tracker/timeTracker.context'
import { getElapsedSeconds } from '../features/time-tracker/timeTracker.utils'
import type {
  ActiveTimer,
  StartTimerValues,
  TimeEntry,
} from '../features/time-tracker/types'

type ReportPeriod = 'day' | 'week' | 'month' | 'year'

type PeriodBounds = {
  start: Date
  end: Date
  label: string
  days: number
}

const distributionColors = [
  '#8d1436',
  '#00563f',
  '#c28a00',
  '#536b86',
  '#80618a',
  '#a36b36',
]

function getDateKey(date: Date) {
  return (
    date.getFullYear() +
    '-' +
    String(date.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(date.getDate()).padStart(2, '0')
  )
}

function startOfDay(date: Date) {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

function addDays(date: Date, amount: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + amount)
  return result
}

function startOfWeek(date: Date) {
  const result = startOfDay(date)
  const day = result.getDay()
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1))
  return result
}

function formatDuration(seconds: number) {
  const totalMinutes = Math.max(0, Math.floor(seconds / 60))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return minutes + 'm'
  if (minutes === 0) return hours + 'h'
  return hours + 'h ' + minutes + 'm'
}

function formatClock(seconds: number) {
  const total = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const remaining = total % 60
  return (
    String(hours).padStart(2, '0') +
    ':' +
    String(minutes).padStart(2, '0') +
    ':' +
    String(remaining).padStart(2, '0')
  )
}

function formatDate(date: Date, options: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    ...options,
  }).format(date)
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function periodBounds(period: ReportPeriod, anchor: Date): PeriodBounds {
  if (period === 'day') {
    const start = startOfDay(anchor)
    return {
      start,
      end: addDays(start, 1),
      label: new Intl.DateTimeFormat(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).format(start),
      days: 1,
    }
  }
  if (period === 'week') {
    const start = startOfWeek(anchor)
    const end = addDays(start, 7)
    return {
      start,
      end,
      label:
        formatDate(start) +
        '–' +
        formatDate(addDays(end, -1)) +
        ', ' +
        start.getFullYear(),
      days: 7,
    }
  }
  if (period === 'month') {
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
    const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1)
    return {
      start,
      end,
      label: new Intl.DateTimeFormat(undefined, {
        month: 'long',
        year: 'numeric',
      }).format(start),
      days: Math.round((end.getTime() - start.getTime()) / 86_400_000),
    }
  }
  const start = new Date(anchor.getFullYear(), 0, 1)
  const end = new Date(anchor.getFullYear() + 1, 0, 1)
  return {
    start,
    end,
    label: String(start.getFullYear()),
    days: Math.round((end.getTime() - start.getTime()) / 86_400_000),
  }
}

function shiftAnchor(period: ReportPeriod, anchor: Date, amount: number) {
  const result = new Date(anchor)
  if (period === 'day') result.setDate(result.getDate() + amount)
  if (period === 'week') result.setDate(result.getDate() + amount * 7)
  if (period === 'month') result.setMonth(result.getMonth() + amount)
  if (period === 'year') result.setFullYear(result.getFullYear() + amount)
  return result
}

function getEntrySecondsInRange(entry: TimeEntry, start: Date, end: Date) {
  const entryStart = new Date(entry.startAt).getTime()
  const entryEnd = new Date(entry.endAt).getTime()
  const rangeStart = start.getTime()
  const rangeEnd = end.getTime()
  const overlapStart = Math.max(entryStart, rangeStart)
  const overlapEnd = Math.min(entryEnd, rangeEnd)
  if (overlapEnd <= overlapStart || entryEnd <= entryStart) return 0
  const wallDuration = entryEnd - entryStart
  return Math.round(
    entry.durationSeconds * ((overlapEnd - overlapStart) / wallDuration),
  )
}

function getBreakdown(entries: TimeEntry[], start: Date, end: Date) {
  const totals = new Map<string, number>()
  entries.forEach((entry) => {
    const seconds = getEntrySecondsInRange(entry, start, end)
    if (seconds <= 0) return
    const name = entry.projectName || entry.course || 'Other'
    totals.set(name, (totals.get(name) ?? 0) + seconds)
  })
  return [...totals.entries()]
    .map(([name, seconds]) => ({ name, seconds }))
    .sort((first, second) => second.seconds - first.seconds)
}

function getReportRows(
  period: ReportPeriod,
  bounds: PeriodBounds,
  entries: TimeEntry[],
) {
  if (period === 'day') return []
  const rows: Array<{ label: string; date: Date; seconds: number }> = []
  if (period === 'year') {
    for (let month = 0; month < 12; month += 1) {
      const start = new Date(bounds.start.getFullYear(), month, 1)
      const end = new Date(bounds.start.getFullYear(), month + 1, 1)
      rows.push({
        label: new Intl.DateTimeFormat(undefined, { month: 'short' }).format(
          start,
        ),
        date: start,
        seconds: entries.reduce(
          (total, entry) => total + getEntrySecondsInRange(entry, start, end),
          0,
        ),
      })
    }
    return rows
  }
  const count = period === 'week' ? 7 : bounds.days
  for (let index = 0; index < count; index += 1) {
    const start = addDays(bounds.start, index)
    const end = addDays(start, 1)
    rows.push({
      label:
        period === 'week'
          ? new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(
              start,
            )
          : formatDate(start),
      date: start,
      seconds: entries.reduce(
        (total, entry) => total + getEntrySecondsInRange(entry, start, end),
        0,
      ),
    })
  }
  return rows
}

function TimerStartForm({
  tasks,
  values,
  onChange,
  onStart,
  onClose,
}: {
  tasks: Array<{ id: string; title: string; course: string }>
  values: StartTimerValues
  onChange: (values: StartTimerValues) => void
  onStart: () => void
  onClose: () => void
}) {
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
        aria-labelledby="start-timer-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="task-modal-heading">
          <div>
            <p className="eyebrow">Time tracker</p>
            <h2 id="start-timer-title">Start timer</h2>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close start timer form"
          >
            ×
          </button>
        </div>
        <form
          className="task-form"
          onSubmit={(event) => {
            event.preventDefault()
            onStart()
          }}
        >
          <div className="form-field">
            <label htmlFor="start-timer-project">Project / task</label>
            <input
              id="start-timer-project"
              value={values.projectName}
              onChange={(event) =>
                onChange({ ...values, projectName: event.target.value })
              }
              autoFocus
            />
          </div>
          <div className="task-form-grid">
            <div className="form-field">
              <label htmlFor="start-timer-task">Existing task</label>
              <select
                id="start-timer-task"
                value={values.taskId}
                onChange={(event) => {
                  const task = tasks.find(
                    (item) => item.id === event.target.value,
                  )
                  onChange({
                    ...values,
                    taskId: event.target.value,
                    course: task?.course ?? values.course,
                    projectName: task?.title ?? values.projectName,
                  })
                }}
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
              <label htmlFor="start-timer-course">Course</label>
              <input
                id="start-timer-course"
                value={values.course}
                onChange={(event) =>
                  onChange({ ...values, course: event.target.value })
                }
                placeholder="Optional"
              />
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="start-timer-notes">
              Notes <span className="label-optional">Optional</span>
            </label>
            <textarea
              id="start-timer-notes"
              rows={3}
              value={values.notes}
              onChange={(event) =>
                onChange({ ...values, notes: event.target.value })
              }
            />
          </div>
          <div className="task-form-actions">
            <button
              type="button"
              className="button-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit">Start</button>
          </div>
        </form>
      </section>
    </div>
  )
}

function FinishTimerForm({
  timer,
  seconds,
  notes,
  setNotes,
  onSave,
  onClose,
}: {
  timer: ActiveTimer
  seconds: number
  notes: string
  setNotes: (value: string) => void
  onSave: () => void
  onClose: () => void
}) {
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
        aria-labelledby="finish-timer-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="task-modal-heading">
          <div>
            <p className="eyebrow">Finish session</p>
            <h2 id="finish-timer-title">{timer.projectName}</h2>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close finish session form"
          >
            ×
          </button>
        </div>
        <dl className="time-finish-summary">
          <div>
            <dt>Duration</dt>
            <dd>{formatDuration(seconds)}</dd>
          </div>
          <div>
            <dt>Started</dt>
            <dd>{formatDateTime(timer.startedAt)}</dd>
          </div>
          <div>
            <dt>State</dt>
            <dd>{timer.status === 'paused' ? 'Paused' : 'Running'}</dd>
          </div>
        </dl>
        <div className="form-field">
          <label htmlFor="finish-timer-notes">
            Notes <span className="label-optional">Optional</span>
          </label>
          <textarea
            id="finish-timer-notes"
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>
        <div className="task-form-actions">
          <button type="button" className="button-secondary" onClick={onClose}>
            Keep running
          </button>
          <button type="button" onClick={onSave}>
            Save session
          </button>
        </div>
      </section>
    </div>
  )
}

export function TimeTrackerPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { tasks, loading: tasksLoading } = useTasks()
  const { preferences } = useSettings()
  const { events, loading: calendarLoading } = useCalendarEvents()
  const {
    entries,
    activeTimer,
    loading: timeEntriesLoading,
    startTimer,
    pauseTimer,
    resumeTimer,
    saveActiveSession,
    addEntry,
    updateEntry,
    deleteEntry,
  } = useTimeTracker()
  const [now, setNow] = useState(() => new Date())
  const [isStartOpen, setIsStartOpen] = useState(false)
  const [isFinishOpen, setIsFinishOpen] = useState(false)
  const [isManualOpen, setIsManualOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
  const [finishNotes, setFinishNotes] = useState('')
  const [startValues, setStartValues] = useState<StartTimerValues>({
    projectName: '',
    taskId: '',
    eventId: '',
    course: '',
    notes: '',
  })
  const [startError, setStartError] = useState<string | null>(null)
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('week')
  const [reportAnchor, setReportAnchor] = useState(() => new Date())

  useEffect(() => {
    if (!activeTimer) return
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [activeTimer])

  useEffect(() => {
    const taskId = searchParams.get('task')
    const eventId = searchParams.get('event')
    if (!taskId && !eventId) return
    const task = taskId ? tasks.find((item) => item.id === taskId) : undefined
    const event = eventId
      ? events.find((item) => item.id === eventId)
      : undefined
    if (!activeTimer) {
      setStartValues({
        projectName: task?.title ?? event?.title ?? '',
        taskId: task?.id ?? event?.taskId ?? '',
        eventId: event?.id ?? '',
        course: task?.course ?? event?.course ?? '',
        notes: '',
      })
      setIsStartOpen(true)
    } else if (task && activeTimer.taskId !== task.id) {
      setStartError(
        "You're already tracking time. Open the active timer below before starting another session.",
      )
    }
    setSearchParams({}, { replace: true })
  }, [activeTimer, events, searchParams, setSearchParams, tasks])

  const activeSeconds = activeTimer
    ? getElapsedSeconds(activeTimer, now.getTime())
    : 0
  const todayKey = getDateKey(now)
  const todayBounds = periodBounds('day', now)
  const todayEntries = useMemo(
    () =>
      entries.filter(
        (entry) => getDateKey(new Date(entry.startAt)) === todayKey,
      ),
    [entries, todayKey],
  )
  const todayBreakdown = useMemo(
    () => getBreakdown(entries, todayBounds.start, todayBounds.end),
    [entries, todayBounds.end, todayBounds.start],
  )
  const todayTotal =
    todayBreakdown.reduce((total, item) => total + item.seconds, 0) +
    (activeTimer && getDateKey(new Date(activeTimer.startedAt)) === todayKey
      ? activeSeconds
      : 0)
  const bounds = periodBounds(reportPeriod, reportAnchor)
  const reportBreakdown = useMemo(
    () => getBreakdown(entries, bounds.start, bounds.end),
    [bounds.end, bounds.start, entries],
  )
  const reportTotal = reportBreakdown.reduce(
    (total, item) => total + item.seconds,
    0,
  )
  const reportRows = useMemo(
    () => getReportRows(reportPeriod, bounds, entries),
    [bounds, entries, reportPeriod],
  )
  const maxRowSeconds = Math.max(1, ...reportRows.map((row) => row.seconds))
  const historyGroups = useMemo(() => {
    const groups = new Map<string, TimeEntry[]>()
    entries.forEach((entry) => {
      const key = getDateKey(new Date(entry.startAt))
      groups.set(key, [...(groups.get(key) ?? []), entry])
    })
    return [...groups.entries()].sort((first, second) =>
      second[0].localeCompare(first[0]),
    )
  }, [entries])
  const recentTimers = useMemo(() => {
    const seen = new Set<string>()
    return entries
      .slice()
      .sort(
        (first, second) =>
          new Date(second.endAt).getTime() - new Date(first.endAt).getTime(),
      )
      .filter((entry) => {
        const key = `${entry.taskId}|${entry.eventId}|${entry.projectName}|${entry.course}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .slice(0, 5)
  }, [entries])
  const pieTotal = reportBreakdown.reduce(
    (total, item) => total + item.seconds,
    0,
  )
  let pieOffset = 0
  const pieSegments = reportBreakdown
    .map((item, index) => {
      const start = pieOffset
      pieOffset += (item.seconds / Math.max(1, pieTotal)) * 360
      return (
        distributionColors[index % distributionColors.length] +
        ' ' +
        start +
        'deg ' +
        pieOffset +
        'deg'
      )
    })
    .join(', ')
  const taskOptions = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    course: task.course,
  }))

  function openStartTimer(values?: Partial<StartTimerValues>) {
    setStartValues((current) => ({ ...current, ...values }))
    setStartError(null)
    setIsStartOpen(true)
  }

  function handleStart() {
    if (!startValues.projectName.trim()) {
      setStartError('Choose a task or add a project name.')
      return
    }
    if (
      !startTimer({
        ...startValues,
        projectName: startValues.projectName.trim(),
      })
    ) {
      setStartError('A timer is already active in another tab.')
      return
    }
    setIsStartOpen(false)
    setStartError(null)
  }

  async function openFinishTimer() {
    if (!activeTimer) return
    if (!preferences.confirmBeforeStopping) {
      try {
        const entry = await saveActiveSession()
        if (entry) setFinishNotes('')
      } catch {
        // The provider exposes the persistent error through the app toast.
      }
      return
    }
    setFinishNotes(activeTimer.notes)
    setStartError(null)
    setIsFinishOpen(true)
  }

  async function handleSaveFinished() {
    try {
      const entry = await saveActiveSession({ notes: finishNotes })
      if (!entry) return
      setFinishNotes('')
      setIsFinishOpen(false)
    } catch {
      // The provider exposes the persistent error through the app toast.
    }
  }

  async function handleDelete(entry: TimeEntry) {
    if (!window.confirm('Delete this time entry?')) return
    try {
      await deleteEntry(entry.id)
    } catch {
      // The provider exposes the persistent error through the app toast.
    }
  }

  function moveReport(amount: number) {
    setReportAnchor((current) => shiftAnchor(reportPeriod, current, amount))
  }

  function editEntry(entry: TimeEntry) {
    setEditingEntry(entry)
    setIsManualOpen(true)
  }

  if (tasksLoading || calendarLoading || timeEntriesLoading) {
    return (
      <main className="page-shell app-page-shell time-tracker-page">
        <p className="status-message">Loading time tracker...</p>
      </main>
    )
  }

  return (
    <main className="page-shell app-page-shell time-tracker-page">
      <div className="time-tracker-inner">
        <header className="time-tracker-header">
          <div>
            <h1>Time Tracker</h1>
            <p className="muted">
              Record actual time spent, separately from scheduled study time.
            </p>
          </div>
          <button
            type="button"
            className="button-secondary"
            onClick={() => {
              setEditingEntry(null)
              setIsManualOpen(true)
            }}
          >
            + Add time
          </button>
        </header>

        <div className="time-tracker-layout">
          <div className="time-tracker-main-column">
            <section
              className="time-tracker-active-panel"
              aria-labelledby="active-timer-title"
            >
              <div className="time-panel-label">Active timer</div>
              {activeTimer ? (
                <>
                  <div className="active-timer-heading">
                    <div>
                      <h2 id="active-timer-title">{activeTimer.projectName}</h2>
                      <p>{activeTimer.course || 'Actual work session'}</p>
                    </div>
                    <strong className="active-timer-clock">
                      {formatClock(activeSeconds)}
                    </strong>
                  </div>
                  <div className="active-timer-status">
                    {activeTimer.status === 'paused' ? 'Paused' : 'Running'}
                  </div>
                  <div className="active-timer-actions">
                    {activeTimer.status === 'running' ? (
                      <button
                        type="button"
                        className="button-secondary"
                        onClick={pauseTimer}
                      >
                        Pause
                      </button>
                    ) : (
                      <button type="button" onClick={resumeTimer}>
                        Resume
                      </button>
                    )}
                    <button
                      type="button"
                      className="button-quiet button-danger"
                      onClick={openFinishTimer}
                    >
                      Stop
                    </button>
                  </div>
                </>
              ) : (
                <div className="time-tracker-empty-active">
                  <h2 id="active-timer-title">No timer running.</h2>
                  <p>
                    Start a timer when you begin actual work. Scheduled time is
                    not counted automatically.
                  </p>
                  <button type="button" onClick={() => openStartTimer()}>
                    Start timer
                  </button>
                </div>
              )}
            </section>

            <section
              className="time-tracker-panel"
              aria-labelledby="today-time-title"
            >
              <div className="time-panel-heading">
                <div>
                  <div className="time-panel-label">Today</div>
                  <h2 id="today-time-title">
                    {formatDuration(todayTotal)} tracked
                  </h2>
                </div>
                <span>
                  {todayEntries.length} saved{' '}
                  {todayEntries.length === 1 ? 'session' : 'sessions'}
                </span>
              </div>
              {todayBreakdown.length === 0 ? (
                <p className="time-empty">
                  No time tracked yet. Start your first timer to begin.
                </p>
              ) : (
                <div className="time-breakdown-list">
                  {todayBreakdown.map((item) => (
                    <div className="time-breakdown-row" key={item.name}>
                      <strong>{item.name}</strong>
                      <span>{formatDuration(item.seconds)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section
              className="time-tracker-panel"
              aria-labelledby="time-history-title"
            >
              <div className="time-panel-heading">
                <div>
                  <div className="time-panel-label">History</div>
                  <h2 id="time-history-title">Saved sessions</h2>
                </div>
              </div>
              {recentTimers.length > 0 && (
                <div className="time-recent-list" aria-label="Recent timers">
                  <div className="time-panel-label">Recent timers</div>
                  {recentTimers.map((entry) => (
                    <div className="time-recent-row" key={entry.id}>
                      <div>
                        <strong>{entry.projectName}</strong>
                        <span>
                          {entry.course || 'No course'} ·{' '}
                          {formatDuration(entry.durationSeconds)}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="button-quiet"
                        onClick={() => {
                          openStartTimer({
                            taskId: entry.taskId,
                            eventId: entry.eventId,
                            projectName: entry.projectName,
                            course: entry.course,
                            notes: entry.notes,
                          })
                        }}
                      >
                        Start
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {historyGroups.length === 0 ? (
                <p className="time-empty">No time entries yet.</p>
              ) : (
                <div className="time-history-list">
                  {historyGroups.map(([dateKey, group]) => (
                    <div className="time-history-group" key={dateKey}>
                      <h3>
                        {formatDate(new Date(dateKey + 'T12:00:00'), {
                          weekday: 'long',
                          year: 'numeric',
                        })}
                      </h3>
                      {group.map((entry) => (
                        <article className="time-history-row" key={entry.id}>
                          <div>
                            <strong>{entry.projectName}</strong>
                            <span>
                              {formatDateTime(entry.startAt)}–
                              {new Intl.DateTimeFormat(undefined, {
                                hour: 'numeric',
                                minute: '2-digit',
                              }).format(new Date(entry.endAt))}
                            </span>
                            {entry.notes && <small>{entry.notes}</small>}
                          </div>
                          <div className="time-history-row-actions">
                            <b>{formatDuration(entry.durationSeconds)}</b>
                            <button
                              type="button"
                              className="button-quiet"
                              onClick={() => editEntry(entry)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="button-quiet button-danger"
                              onClick={() => handleDelete(entry)}
                            >
                              Delete
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="time-tracker-side-column">
            <section
              className="time-tracker-panel"
              aria-labelledby="time-report-title"
            >
              <div className="time-panel-heading">
                <div>
                  <div className="time-panel-label">Report</div>
                  <h2 id="time-report-title">{bounds.label}</h2>
                </div>
              </div>
              <div
                className="time-report-tabs"
                role="tablist"
                aria-label="Time report period"
              >
                {(['day', 'week', 'month', 'year'] as ReportPeriod[]).map(
                  (period) => (
                    <button
                      type="button"
                      role="tab"
                      aria-selected={reportPeriod === period}
                      className={reportPeriod === period ? 'active' : ''}
                      onClick={() => {
                        setReportPeriod(period)
                        setReportAnchor(new Date())
                      }}
                      key={period}
                    >
                      {period}
                    </button>
                  ),
                )}
              </div>
              <div className="time-report-navigation">
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => moveReport(-1)}
                  aria-label="Previous report period"
                >
                  ←
                </button>
                <span>{bounds.label}</span>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => moveReport(1)}
                  aria-label="Next report period"
                >
                  →
                </button>
              </div>
              <div className="time-report-metrics">
                <div>
                  <span>Total</span>
                  <strong>{formatDuration(reportTotal)}</strong>
                </div>
                <div>
                  <span>Average / calendar day</span>
                  <strong>{formatDuration(reportTotal / bounds.days)}</strong>
                </div>
              </div>
              {reportTotal === 0 ? (
                <p className="time-empty">No tracked time for this period.</p>
              ) : reportPeriod === 'day' ? (
                <div className="time-breakdown-list">
                  {reportBreakdown.map((item) => (
                    <div className="time-breakdown-row" key={item.name}>
                      <strong>{item.name}</strong>
                      <span>{formatDuration(item.seconds)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="time-report-bars">
                  {reportRows.map((row) => (
                    <div
                      className="time-report-bar-row"
                      key={row.label + row.date.toISOString()}
                    >
                      <span>{row.label}</span>
                      <div>
                        <i
                          style={{
                            width: row.seconds
                              ? (row.seconds / maxRowSeconds) * 100 + '%'
                              : '0%',
                          }}
                        />
                      </div>
                      <b>{formatDuration(row.seconds)}</b>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section
              className="time-tracker-panel"
              aria-labelledby="distribution-title"
            >
              <div className="time-panel-heading">
                <div>
                  <div className="time-panel-label">Actual tracked time</div>
                  <h2 id="distribution-title">Project distribution</h2>
                </div>
              </div>
              {reportTotal === 0 ? (
                <p className="time-empty">No distribution to show yet.</p>
              ) : (
                <div className="time-distribution">
                  <div
                    className="time-pie-chart"
                    style={{
                      background: 'conic-gradient(' + pieSegments + ')',
                    }}
                    aria-label="Project distribution chart"
                  />
                  <div className="time-distribution-legend">
                    {reportBreakdown.map((item, index) => (
                      <div key={item.name}>
                        <i
                          style={{
                            background:
                              distributionColors[
                                index % distributionColors.length
                              ],
                          }}
                        />
                        <span>{item.name}</span>
                        <b>{Math.round((item.seconds / reportTotal) * 100)}%</b>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section
              className="time-tracker-panel time-schedule-note"
              aria-labelledby="scheduled-time-title"
            >
              <div className="time-panel-label">Scheduled vs actual</div>
              <h2 id="scheduled-time-title">Planned time stays separate.</h2>
              <p>
                Study blocks and classes do not become tracked time unless you
                start a timer.
              </p>
              <Link to="/schedule">View schedule →</Link>
            </section>
          </div>
        </div>
      </div>

      {isStartOpen && (
        <TimerStartForm
          tasks={taskOptions}
          values={startValues}
          onChange={setStartValues}
          onStart={handleStart}
          onClose={() => setIsStartOpen(false)}
        />
      )}
      {startError && (
        <div className="time-tracker-toast" role="alert">
          {startError}
        </div>
      )}
      {isFinishOpen && activeTimer && (
        <FinishTimerForm
          timer={activeTimer}
          seconds={activeSeconds}
          notes={finishNotes}
          setNotes={setFinishNotes}
          onSave={handleSaveFinished}
          onClose={() => setIsFinishOpen(false)}
        />
      )}
      {isManualOpen && (
        <TimeEntryForm
          entry={editingEntry}
          tasks={tasks}
          onSubmit={async (values) => {
            try {
              if (editingEntry) await updateEntry(editingEntry.id, values)
              else if (!(await addEntry(values))) return
              setEditingEntry(null)
              setIsManualOpen(false)
            } catch {
              // The provider exposes the persistent error through the app toast.
            }
          }}
          onClose={() => {
            setEditingEntry(null)
            setIsManualOpen(false)
          }}
        />
      )}
    </main>
  )
}
