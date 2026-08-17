import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/auth.hook'
import type { AppUser } from '../features/auth/auth.types'
import { useCalendarEvents } from '../features/schedule/calendarEvents.context'
import { TaskCompletionCheckbox } from '../features/tasks/components/TaskCard'
import { useSchedule } from '../features/schedule/schedule.context'
import { getCourseColor } from '../features/schedule/courseColors'
import {
  type ScheduleDay,
  type CalendarEvent,
  type ScheduleEntry,
} from '../features/schedule/types'
import { useTasks } from '../features/tasks/tasks.context'
import type { Task } from '../features/tasks/types'
import { useTimeTracker } from '../features/time-tracker/timeTracker.context'
import { getElapsedSeconds } from '../features/time-tracker/timeTracker.utils'

type ScheduleOccurrence = {
  entry: ScheduleEntry
  date: Date
  start: Date
  end: Date
}

type UpcomingItem = {
  id: string
  date: Date
  title: string
  detail: string
  kind: 'task' | 'class' | 'event'
  eventId?: string
}

const weekdayNames: ScheduleDay[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

function getDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function setTime(date: Date, time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  const result = new Date(date)
  result.setHours(hours, minutes, 0, 0)
  return result
}

function getDayName(date: Date) {
  return weekdayNames[date.getDay()]
}

function addDays(date: Date, amount: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + amount)
  return result
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

function formatFullDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function localDateFromKey(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}

function formatRelativeDay(date: Date, today: Date) {
  const difference = Math.round(
    (localDateFromKey(getDateKey(date)).getTime() -
      localDateFromKey(getDateKey(today)).getTime()) /
      86_400_000,
  )

  if (difference === 0) return 'Today'
  if (difference === 1) return 'Tomorrow'
  return formatDate(date)
}

function getOccurrence(entry: ScheduleEntry, date: Date): ScheduleOccurrence {
  const start = setTime(date, entry.startTime)
  const end = setTime(date, entry.endTime)
  if (end <= start) end.setDate(end.getDate() + 1)
  return { entry, date, start, end }
}

function getCalendarEventOccurrence(event: CalendarEvent) {
  return {
    event,
    start: new Date(event.startDateTime),
    end: new Date(event.endDateTime),
  }
}

function getCalendarEventBorder(event: CalendarEvent) {
  if (event.type === 'task' && event.course) {
    const courseCode =
      event.course.match(/^[A-Za-z]+\s*\d+/)?.[0] ?? event.course
    return getCourseColor(courseCode).border
  }

  return {
    study: '#00563f',
    task: '#536b86',
    exam: '#c28a00',
    personal: '#667085',
    other: '#a36b36',
  }[event.type]
}

function getCalendarEventLabel(event: CalendarEvent) {
  return {
    study: 'Study block',
    task: 'Task session',
    exam: 'Exam',
    personal: 'Personal event',
    other: 'Other event',
  }[event.type]
}

function getOccurrencesForDate(entries: ScheduleEntry[], date: Date) {
  const day = getDayName(date)
  return entries
    .filter((entry) => entry.days.includes(day))
    .map((entry) => getOccurrence(entry, date))
    .sort((first, second) => first.start.getTime() - second.start.getTime())
}

function getGreeting(date: Date) {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function getUserName(user: AppUser | null) {
  if (!user || !('user_metadata' in user)) return null
  const metadata = user.user_metadata as Record<string, unknown>
  const name = metadata.full_name ?? metadata.name
  return typeof name === 'string' && name.trim() ? name.trim() : null
}

function getTaskGroup(task: Task, today: string) {
  if (task.dueDate < today) return 0
  if (task.dueDate === today) return 1

  const tomorrow = new Date(`${today}T12:00:00`)
  tomorrow.setDate(tomorrow.getDate() + 1)
  return task.dueDate === getDateKey(tomorrow) ? 2 : 3
}

function formatTaskDue(task: Task, today: string) {
  const group = getTaskGroup(task, today)
  const due = task.dueTime
    ? ` · ${formatTime(setTime(new Date(), task.dueTime))}`
    : ''
  if (group === 0) {
    return `Overdue · ${formatDate(new Date(`${task.dueDate}T12:00:00`))}${due}`
  }
  if (group === 1) return `Due today${due}`
  if (group === 2) return `Due tomorrow${due}`
  return `Due ${formatDate(new Date(`${task.dueDate}T12:00:00`))}${due}`
}

function formatTrackedDuration(seconds: number) {
  const totalMinutes = Math.max(0, Math.floor(seconds / 60))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

function sortDashboardTasks(tasks: Task[], today: string) {
  const priorityRank = { high: 0, medium: 1, low: 2 }
  return [...tasks]
    .filter((task) => !task.completed)
    .sort((first, second) => {
      const groupDifference =
        getTaskGroup(first, today) - getTaskGroup(second, today)
      if (groupDifference !== 0) return groupDifference
      const dateDifference =
        `${first.dueDate}T${first.dueTime || '23:59'}`.localeCompare(
          `${second.dueDate}T${second.dueTime || '23:59'}`,
        )
      if (dateDifference !== 0) return dateDifference
      return priorityRank[first.priority] - priorityRank[second.priority]
    })
}

function getNextOccurrence(entries: ScheduleEntry[], now: Date) {
  const todayOccurrences = getOccurrencesForDate(entries, now)
  const current = todayOccurrences.find(
    (occurrence) => now >= occurrence.start && now < occurrence.end,
  )
  if (current) return { occurrence: current, isCurrent: true }

  const laterToday = todayOccurrences.find(
    (occurrence) => occurrence.start > now,
  )
  if (laterToday) return { occurrence: laterToday, isCurrent: false }

  for (let offset = 1; offset <= 7; offset += 1) {
    const date = addDays(now, offset)
    const next = getOccurrencesForDate(entries, date)[0]
    if (next) return { occurrence: next, isCurrent: false }
  }

  return null
}

function getCountdown(start: Date, now: Date) {
  const minutes = Math.max(
    1,
    Math.ceil((start.getTime() - now.getTime()) / 60_000),
  )
  return `Starts in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`
}

function getNextClassLabel(date: Date, now: Date) {
  const isTomorrow = getDateKey(date) === getDateKey(addDays(now, 1))
  return `Next class: ${isTomorrow ? 'Tomorrow' : formatDate(date)} at ${formatTime(date)}`
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { entries } = useSchedule()
  const { events, deleteFutureTaskEvents } = useCalendarEvents()
  const { tasks, toggleTask } = useTasks()
  const {
    entries: timeEntries,
    activeTimer,
    pauseTimer,
    resumeTimer,
    saveActiveSession,
  } = useTimeTracker()
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const today = getDateKey(now)
  const todayTrackedSeconds = useMemo(
    () =>
      timeEntries
        .filter((entry) => getDateKey(new Date(entry.startAt)) === today)
        .reduce((total, entry) => total + entry.durationSeconds, 0),
    [timeEntries, today],
  )
  const activeSeconds = activeTimer
    ? getElapsedSeconds(activeTimer, now.getTime())
    : 0
  const todayTotalTrackedSeconds =
    todayTrackedSeconds +
    (activeTimer && getDateKey(new Date(activeTimer.startedAt)) === today
      ? activeSeconds
      : 0)
  const todayClasses = useMemo(
    () => getOccurrencesForDate(entries, now),
    [entries, now],
  )
  const todayItems = useMemo(() => {
    const classItems = todayClasses.map((occurrence) => ({
      kind: 'class' as const,
      id: `class-${occurrence.entry.id}`,
      entry: occurrence.entry,
      start: occurrence.start,
      end: occurrence.end,
    }))
    const eventItems = events
      .map(getCalendarEventOccurrence)
      .filter((occurrence) => getDateKey(occurrence.start) === today)
      .map((occurrence) => ({
        kind: 'event' as const,
        id: `event-${occurrence.event.id}`,
        event: occurrence.event,
        start: occurrence.start,
        end: occurrence.end,
      }))
    return [...classItems, ...eventItems].sort(
      (first, second) => first.start.getTime() - second.start.getTime(),
    )
  }, [events, today, todayClasses])
  const nextClass = useMemo(
    () => getNextOccurrence(entries, now),
    [entries, now],
  )
  const nextScheduledEvent = useMemo(
    () =>
      events
        .map(getCalendarEventOccurrence)
        .filter((occurrence) => occurrence.start > now)
        .sort(
          (first, second) => first.start.getTime() - second.start.getTime(),
        )[0] ?? null,
    [events, now],
  )
  const dashboardTasks = useMemo(
    () => sortDashboardTasks(tasks, today).slice(0, 5),
    [tasks, today],
  )
  const upcoming = useMemo<UpcomingItem[]>(() => {
    const taskItems = tasks
      .filter((task) => !task.completed && task.dueDate > today)
      .map((task) => ({
        id: `task-${task.id}`,
        date: new Date(`${task.dueDate}T12:00:00`),
        title: task.title,
        detail: `${task.course || 'Task'} · Due ${task.dueTime ? formatTime(setTime(new Date(), task.dueTime)) : '11:59 PM'}`,
        kind: 'task' as const,
      }))

    const classItems = Array.from({ length: 7 }, (_, offset) =>
      addDays(now, offset),
    )
      .flatMap((date) => getOccurrencesForDate(entries, date))
      .filter((occurrence) => occurrence.start > now)
      .map((occurrence) => ({
        id: `class-${occurrence.entry.id}-${getDateKey(occurrence.date)}`,
        date: occurrence.date,
        title: occurrence.entry.courseCode,
        detail: `${occurrence.entry.courseTitle} · ${formatTime(occurrence.start)}`,
        kind: 'class' as const,
      }))

    const eventItems = events
      .map(getCalendarEventOccurrence)
      .filter((occurrence) => occurrence.start > now)
      .map((occurrence) => ({
        id: `event-${occurrence.event.id}`,
        date: occurrence.start,
        title: occurrence.event.title,
        detail: `${getCalendarEventLabel(occurrence.event)} · ${formatTime(occurrence.start)}`,
        kind: 'event' as const,
        eventId: occurrence.event.id,
      }))

    return [...taskItems, ...classItems, ...eventItems]
      .sort((first, second) => first.date.getTime() - second.date.getTime())
      .slice(0, 5)
  }, [entries, events, now, tasks, today])

  const name = getUserName(user)
  const greeting = getGreeting(now)
  const currentClassId = nextClass?.isCurrent
    ? nextClass.occurrence.entry.id
    : null
  const nextTodayClassId =
    nextClass &&
    !nextClass.isCurrent &&
    getDateKey(nextClass.occurrence.date) === today
      ? nextClass.occurrence.entry.id
      : null

  function openSchedule(query?: string) {
    navigate(query ? `/schedule?${query}` : '/schedule')
  }

  function openTask(taskId?: string) {
    navigate(taskId ? `/tasks?task=${taskId}` : '/tasks?action=add')
  }

  async function handleDashboardTaskToggle(task: Task) {
    try {
      if (!task.completed) {
        const hasFutureSessions = events.some(
          (event) =>
            event.taskId === task.id &&
            event.type === 'task' &&
            new Date(event.startDateTime).getTime() > Date.now(),
        )
        if (hasFutureSessions) {
          const keepSessions = window.confirm(
            'Keep the remaining scheduled sessions? Select Cancel to remove them.',
          )
          if (!keepSessions) await deleteFutureTaskEvents(task.id)
        }
      }
      await toggleTask(task.id)
    } catch {
      // The provider exposes the persistent error through the app toast.
    }
  }

  return (
    <main className="page-shell app-page-shell dashboard-page">
      <div className="dashboard-inner">
        <header className="dashboard-header">
          <div>
            <h1>{name ? `${greeting}, ${name}` : 'Welcome to UPBloc'}</h1>
            <p className="dashboard-subtitle">Here's what's happening today.</p>
          </div>
          <time dateTime={now.toISOString()}>{formatFullDate(now)}</time>
        </header>

        <section
          className="dashboard-next-class"
          aria-labelledby="next-class-title"
        >
          <div className="dashboard-section-label">Next class</div>
          {entries.length === 0 ? (
            <div className="dashboard-empty-content">
              <h2 id="next-class-title">No classes scheduled yet.</h2>
              <p>
                Add a class manually or import your CRS schedule to see what is
                next.
              </p>
            </div>
          ) : nextClass ? (
            <button
              type="button"
              className="dashboard-next-class-content"
              onClick={() =>
                openSchedule(`entry=${nextClass.occurrence.entry.id}`)
              }
            >
              <div>
                <p className="dashboard-course-code">
                  {nextClass.occurrence.entry.courseCode}
                </p>
                <h2 id="next-class-title">
                  {nextClass.occurrence.entry.courseTitle}
                </h2>
                <p className="dashboard-class-meta">
                  {formatTime(nextClass.occurrence.start)} –{' '}
                  {formatTime(nextClass.occurrence.end)}
                  {nextClass.occurrence.entry.room &&
                    ` · ${nextClass.occurrence.entry.room}`}
                </p>
                {(nextClass.occurrence.entry.section ||
                  nextClass.occurrence.entry.instructor) && (
                  <p className="dashboard-class-secondary">
                    {[
                      nextClass.occurrence.entry.section &&
                        `Section ${nextClass.occurrence.entry.section}`,
                      nextClass.occurrence.entry.instructor,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
              </div>
              <strong className="dashboard-next-status">
                {nextClass.isCurrent
                  ? 'In progress'
                  : getDateKey(nextClass.occurrence.date) === today
                    ? getCountdown(nextClass.occurrence.start, now)
                    : `No more classes today. ${getNextClassLabel(nextClass.occurrence.start, now)}`}
              </strong>
            </button>
          ) : (
            <div className="dashboard-empty-content">
              <h2 id="next-class-title">No more classes today.</h2>
              <p>Your schedule is clear for the rest of today.</p>
            </div>
          )}
          <div className="dashboard-inline-actions">
            <button
              type="button"
              className="button-secondary"
              onClick={() => openSchedule('action=import')}
            >
              Import CRS / Form 5
            </button>
            <button
              type="button"
              className="button-quiet"
              onClick={() => openSchedule('action=add')}
            >
              Add class
            </button>
          </div>
          {nextScheduledEvent && (
            <p className="dashboard-next-event-note">
              Next scheduled event:{' '}
              <strong>{nextScheduledEvent.event.title}</strong> ·{' '}
              {formatRelativeDay(nextScheduledEvent.start, now)} at{' '}
              {formatTime(nextScheduledEvent.start)}
            </p>
          )}
        </section>

        <div className="dashboard-grid dashboard-primary-grid">
          <section className="dashboard-panel" aria-labelledby="today-title">
            <div className="dashboard-panel-heading">
              <div>
                <div className="dashboard-section-label">Today</div>
                <h2 id="today-title">Your schedule</h2>
              </div>
              <Link to="/schedule">
                View schedule <span aria-hidden="true">→</span>
              </Link>
            </div>
            {todayItems.length === 0 ? (
              <p className="dashboard-empty">
                Your schedule is empty for today.
              </p>
            ) : (
              <div className="dashboard-class-list">
                {todayItems.slice(0, 6).map((item) => {
                  const isClass = item.kind === 'class'
                  const classItem = isClass ? item : null
                  const eventItem = !isClass ? item : null
                  const color = isClass
                    ? getCourseColor(classItem!.entry.courseCode)
                    : { border: getCalendarEventBorder(eventItem!.event) }
                  const isCurrent =
                    isClass && classItem!.entry.id === currentClassId
                  const isNext =
                    isClass && classItem!.entry.id === nextTodayClassId
                  return (
                    <button
                      type="button"
                      className={`dashboard-class-row${!isClass ? ' is-scheduled-event' : ''}${isCurrent ? ' is-current' : ''}${isNext ? ' is-next' : ''}`}
                      key={item.id}
                      onClick={() =>
                        openSchedule(
                          isClass
                            ? `entry=${classItem!.entry.id}`
                            : `event=${eventItem!.event.id}`,
                        )
                      }
                      style={{ borderLeftColor: color.border }}
                    >
                      <time>{formatTime(item.start)}</time>
                      <span>
                        <strong>
                          {isClass
                            ? classItem!.entry.courseCode
                            : eventItem!.event.title}
                        </strong>
                        <small>
                          {isClass
                            ? classItem!.entry.courseTitle
                            : getCalendarEventLabel(eventItem!.event)}
                        </small>
                      </span>
                      <small>
                        {isClass
                          ? classItem!.entry.room || 'Room not set'
                          : eventItem!.event.location ||
                            eventItem!.event.course ||
                            'Scheduled event'}
                      </small>
                      {(isCurrent || isNext) && (
                        <em>{isCurrent ? 'Now' : 'Next'}</em>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          <section className="dashboard-panel" aria-labelledby="tasks-title">
            <div className="dashboard-panel-heading">
              <div>
                <div className="dashboard-section-label">Tasks</div>
                <h2 id="tasks-title">Needs your attention</h2>
              </div>
              <Link to="/tasks">
                View all tasks <span aria-hidden="true">→</span>
              </Link>
            </div>
            {dashboardTasks.length === 0 ? (
              <div className="dashboard-empty">
                <p>You're all caught up.</p>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => openTask()}
                >
                  Add task
                </button>
              </div>
            ) : (
              <div className="dashboard-task-list">
                {dashboardTasks.map((task) => (
                  <div className="dashboard-task-row" key={task.id}>
                    <TaskCompletionCheckbox
                      task={task}
                      onToggle={() => handleDashboardTaskToggle(task)}
                    />
                    <button
                      type="button"
                      className="dashboard-task-open"
                      onClick={() => openTask(task.id)}
                    >
                      <strong>{task.title}</strong>
                      <span>
                        {task.course || 'Unassigned course'} ·{' '}
                        {formatTaskDue(task, today)}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <section
          className="dashboard-panel dashboard-time-panel"
          aria-labelledby="dashboard-time-title"
        >
          <div className="dashboard-panel-heading">
            <div>
              <div className="dashboard-section-label">Time tracker</div>
              <h2 id="dashboard-time-title">
                {formatTrackedDuration(todayTotalTrackedSeconds)} tracked today
              </h2>
            </div>
            <Link to="/time-tracker">
              Open tracker <span aria-hidden="true">→</span>
            </Link>
          </div>
          {activeTimer ? (
            <div className="dashboard-active-timer">
              <div>
                <strong>{activeTimer.projectName}</strong>
                <span>
                  {formatTrackedDuration(activeSeconds)} · {activeTimer.status}
                </span>
              </div>
              <div className="dashboard-time-actions">
                <button
                  type="button"
                  className="button-secondary"
                  onClick={
                    activeTimer.status === 'running' ? pauseTimer : resumeTimer
                  }
                >
                  {activeTimer.status === 'running' ? 'Pause' : 'Resume'}
                </button>
                <button
                  type="button"
                  className="button-quiet button-danger"
                  onClick={async () => {
                    if (!window.confirm('Stop and save the active timer?'))
                      return
                    try {
                      await saveActiveSession()
                    } catch {
                      // The provider exposes the persistent error through the app toast.
                    }
                  }}
                >
                  Stop
                </button>
              </div>
            </div>
          ) : (
            <p className="dashboard-empty dashboard-time-empty">
              No active timer. Start tracking actual work from the Time Tracker
              page.
            </p>
          )}
        </section>

        <div className="dashboard-grid dashboard-secondary-grid">
          <section className="dashboard-panel" aria-labelledby="upcoming-title">
            <div className="dashboard-panel-heading">
              <div>
                <div className="dashboard-section-label">Upcoming</div>
                <h2 id="upcoming-title">Deadlines and classes</h2>
              </div>
            </div>
            {upcoming.length === 0 ? (
              <p className="dashboard-empty">Nothing upcoming yet.</p>
            ) : (
              <div className="dashboard-upcoming-list">
                {upcoming.map((item) => (
                  <button
                    type="button"
                    className="dashboard-upcoming-row"
                    key={item.id}
                    onClick={() =>
                      item.kind === 'task'
                        ? openTask(item.id.replace('task-', ''))
                        : item.kind === 'event'
                          ? openSchedule(`event=${item.eventId}`)
                          : openSchedule()
                    }
                  >
                    <time>{formatRelativeDay(item.date, now)}</time>
                    <span>
                      <strong>{item.title}</strong>
                      <small>{item.detail}</small>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section
            className="dashboard-panel dashboard-actions-panel"
            aria-labelledby="quick-actions-title"
          >
            <div className="dashboard-panel-heading">
              <div>
                <div className="dashboard-section-label">Quick actions</div>
                <h2 id="quick-actions-title">Keep moving</h2>
              </div>
            </div>
            <div className="dashboard-quick-actions">
              <button type="button" onClick={() => openTask()}>
                + Add task
              </button>
              <button
                type="button"
                className="button-secondary"
                onClick={() => openSchedule('action=add')}
              >
                + Add class
              </button>
              <button
                type="button"
                className="button-secondary"
                onClick={() => openSchedule('action=import')}
              >
                Import CRS / Form 5
              </button>
            </div>
          </section>
        </div>

        <section
          className="dashboard-panel dashboard-block-panel"
          aria-labelledby="block-title"
        >
          <div className="dashboard-panel-heading">
            <div>
              <div className="dashboard-section-label">My block</div>
              <h2 id="block-title">Shared updates live here</h2>
            </div>
            <Link to="/blocks">
              Explore blocks <span aria-hidden="true">→</span>
            </Link>
          </div>
          <p className="dashboard-empty">
            Join or create a block to see shared updates here.
          </p>
        </section>
      </div>
    </main>
  )
}
