import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { getCourseColor } from '../courseColors'
import type { Task } from '../../tasks/types'
import type { CalendarEvent, ScheduleDay, ScheduleEntry } from '../types'
import { scheduleDays } from '../types'
import type {
  CalendarView,
  TimeFormat,
  WeekStartsOn,
} from '../../settings/settings.types'
import { formatTime as formatClockTime } from '../../../lib/dateTime'

type ScheduleTimetableProps = {
  entries: ScheduleEntry[]
  events: CalendarEvent[]
  tasks: Task[]
  onSelectEntry: (entry: ScheduleEntry) => void
  onSelectEvent: (event: CalendarEvent) => void
  onCreateEvent: (values: {
    date: string
    startTime: string
    endTime: string
  }) => void
  weekStartsOn: WeekStartsOn
  timeFormat: TimeFormat
  defaultCalendarView: CalendarView
}

type EventPlacement = {
  kind: 'class' | 'event'
  entry?: ScheduleEntry
  event?: CalendarEvent
  column: number
  columnCount: number
  top: number
  height: number
  start: number
  end: number
}

const calendarStartMinutes = 7 * 60
const calendarEndMinutes = 21 * 60
const hourHeight = 64
const calendarHeight =
  ((calendarEndMinutes - calendarStartMinutes) / 60) * hourHeight
const calendarHours = Array.from(
  { length: (calendarEndMinutes - calendarStartMinutes) / 60 + 1 },
  (_, index) => calendarStartMinutes + index * 60,
)

function getWeekStart(date: Date, weekStartsOn: WeekStartsOn) {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  const day = result.getDay()
  const distance = weekStartsOn === 'sunday' ? day : day === 0 ? 6 : day - 1
  result.setDate(result.getDate() - distance)
  return result
}

function getDayIndex(date: Date, weekStartsOn: WeekStartsOn) {
  const day = date.getDay()
  return weekStartsOn === 'sunday' ? day : day === 0 ? 6 : day - 1
}

function addDays(date: Date, days: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function getDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return year + '-' + month + '-' + day
}

function isSameDate(first: Date, second: Date) {
  return getDateKey(first) === getDateKey(second)
}

function parseTime(value: string) {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date)
}

function formatWeekRange(start: Date) {
  const end = addDays(start, 6)
  const startMonth = new Intl.DateTimeFormat(undefined, {
    month: 'long',
  }).format(start)
  const endMonth = new Intl.DateTimeFormat(undefined, { month: 'long' }).format(
    end,
  )

  if (startMonth === endMonth) {
    return (
      startMonth +
      ' ' +
      start.getDate() +
      '–' +
      end.getDate() +
      ', ' +
      end.getFullYear()
    )
  }

  return (
    startMonth +
    ' ' +
    start.getDate() +
    ' – ' +
    endMonth +
    ' ' +
    end.getDate() +
    ', ' +
    end.getFullYear()
  )
}

function getEventMinutes(event: CalendarEvent) {
  const start = new Date(event.startDateTime)
  const end = new Date(event.endDateTime)
  return {
    start: start.getHours() * 60 + start.getMinutes(),
    end: end.getHours() * 60 + end.getMinutes(),
  }
}

function getEventCourseCode(event: CalendarEvent) {
  return event.course.match(/^[A-Za-z]+\s*\d+/)?.[0] ?? event.course
}

function eventTypeLabel(event: CalendarEvent) {
  return {
    study: 'Study block',
    task: 'Task session',
    exam: 'Exam',
    personal: 'Personal event',
    other: 'Other',
  }[event.type]
}

function getEventColor(event: CalendarEvent) {
  if (event.type === 'task' && event.course) {
    return getCourseColor(getEventCourseCode(event))
  }

  return {
    study: { background: '#e6f1ed', border: '#00563f', text: '#004632' },
    task: { background: '#e9eef5', border: '#536b86', text: '#344b66' },
    exam: { background: '#fff4d5', border: '#c28a00', text: '#765500' },
    personal: { background: '#eef0f2', border: '#667085', text: '#344054' },
    other: { background: '#f4ece3', border: '#a36b36', text: '#70481f' },
  }[event.type]
}

function getEventPlacements(
  entries: ScheduleEntry[],
  events: CalendarEvent[],
  day: ScheduleDay,
  date: Date,
) {
  const classEntries = entries
    .filter((entry) => entry.days.includes(day))
    .map((entry) => ({
      kind: 'class' as const,
      entry,
      start: Math.max(calendarStartMinutes, parseTime(entry.startTime)),
      end: Math.min(calendarEndMinutes, parseTime(entry.endTime)),
    }))
    .filter(({ end, start }) => end > start)

  const calendarEvents = events
    .filter((event) => isSameDate(new Date(event.startDateTime), date))
    .map((event) => {
      const minutes = getEventMinutes(event)
      return {
        kind: 'event' as const,
        event,
        start: Math.max(calendarStartMinutes, minutes.start),
        end: Math.min(calendarEndMinutes, minutes.end),
      }
    })
    .filter(({ end, start }) => end > start)

  const dayEntries = [...classEntries, ...calendarEvents].sort(
    (first, second) => first.start - second.start || second.end - first.end,
  )

  const clusters: (typeof dayEntries)[] = []
  dayEntries.forEach((item) => {
    const cluster = clusters[clusters.length - 1]
    const clusterEnd = cluster
      ? Math.max(...cluster.map((clusterItem) => clusterItem.end))
      : -1

    if (!cluster || item.start >= clusterEnd) {
      clusters.push([item])
    } else {
      cluster.push(item)
    }
  })

  return clusters.flatMap((cluster) => {
    const columns: number[] = []
    const placements: EventPlacement[] = []

    cluster.forEach((item) => {
      let column = columns.findIndex((columnEnd) => columnEnd <= item.start)
      if (column === -1) {
        column = columns.length
        columns.push(item.end)
      } else {
        columns[column] = item.end
      }

      placements.push({
        ...item,
        column,
        columnCount: 0,
        top: ((item.start - calendarStartMinutes) / 60) * hourHeight,
        height: ((item.end - item.start) / 60) * hourHeight,
      })
    })

    return placements.map((placement) => ({
      ...placement,
      columnCount: columns.length,
    }))
  })
}

function roundCalendarMinutes(minutes: number) {
  return Math.min(
    calendarEndMinutes - 15,
    Math.max(calendarStartMinutes, Math.round(minutes / 15) * 15),
  )
}

function timeValue(minutes: number) {
  return (
    String(Math.floor(minutes / 60)).padStart(2, '0') +
    ':' +
    String(minutes % 60).padStart(2, '0')
  )
}

export function ScheduleTimetable({
  entries,
  events,
  tasks,
  onSelectEntry,
  onSelectEvent,
  onCreateEvent,
  weekStartsOn,
  timeFormat,
  defaultCalendarView,
}: ScheduleTimetableProps) {
  const [now, setNow] = useState(() => new Date())
  const today = now
  const [viewMode, setViewMode] = useState<CalendarView>(defaultCalendarView)
  const [weekStart, setWeekStart] = useState(() =>
    getWeekStart(today, weekStartsOn),
  )
  const [dayViewDate, setDayViewDate] = useState(() => today)

  const orderedDays = useMemo<ScheduleDay[]>(
    () =>
      weekStartsOn === 'sunday'
        ? ['Sunday', ...scheduleDays.slice(0, 6)]
        : [...scheduleDays],
    [weekStartsOn],
  )

  const [mobileDayIndex, setMobileDayIndex] = useState(() =>
    getDayIndex(now, weekStartsOn),
  )

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    setWeekStart(getWeekStart(new Date(), weekStartsOn))
    setMobileDayIndex(getDayIndex(new Date(), weekStartsOn))
  }, [weekStartsOn])

  useEffect(() => {
    setViewMode(defaultCalendarView)
  }, [defaultCalendarView])

  const weekDays = useMemo(
    () =>
      viewMode === 'day'
        ? [
            {
              day: orderedDays[getDayIndex(dayViewDate, weekStartsOn)],
              date: dayViewDate,
            },
          ]
        : orderedDays.map((day, index) => ({
            day,
            date: addDays(weekStart, index),
          })),
    [dayViewDate, orderedDays, viewMode, weekStart, weekStartsOn],
  )
  const selectedMobileIndex = viewMode === 'day' ? 0 : mobileDayIndex

  function moveWeek(amount: number) {
    if (viewMode === 'day')
      setDayViewDate((current) => addDays(current, amount))
    else setWeekStart((current) => addDays(current, amount * 7))
  }

  function goToToday() {
    const current = new Date()
    setWeekStart(getWeekStart(current, weekStartsOn))
    setDayViewDate(current)
    setMobileDayIndex(getDayIndex(current, weekStartsOn))
  }

  function moveMobileDay(amount: number) {
    setMobileDayIndex(
      (current) => (current + amount + orderedDays.length) % orderedDays.length,
    )
  }

  function handleEmptySlotClick(event: MouseEvent<HTMLDivElement>, date: Date) {
    const target = event.target as HTMLElement
    if (target.closest('button')) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const clickedMinutes =
      calendarStartMinutes + ((event.clientY - bounds.top) / hourHeight) * 60
    const startMinutes = roundCalendarMinutes(clickedMinutes)
    onCreateEvent({
      date: getDateKey(date),
      startTime: timeValue(startMinutes),
      endTime: timeValue(Math.min(calendarEndMinutes, startMinutes + 60)),
    })
  }

  const currentTimeMinutes = today.getHours() * 60 + today.getMinutes()
  const showCurrentTime =
    currentTimeMinutes >= calendarStartMinutes &&
    currentTimeMinutes <= calendarEndMinutes

  return (
    <section
      className="schedule-timetable"
      aria-labelledby="schedule-timetable-title"
    >
      <div className="schedule-timetable-heading">
        <div>
          <p className="eyebrow">Weekly view</p>
          <h2 id="schedule-timetable-title">Class and event schedule</h2>
        </div>
        <span>
          {entries.length} {entries.length === 1 ? 'class' : 'classes'} ·{' '}
          {events.length} {events.length === 1 ? 'event' : 'events'}
        </span>
      </div>

      <div className="schedule-calendar-toolbar">
        <div className="schedule-calendar-navigation">
          <button
            type="button"
            className="button-secondary calendar-nav-button"
            onClick={() => moveWeek(-1)}
            aria-label="Previous week"
          >
            ←
          </button>
          <button
            type="button"
            className="button-secondary calendar-today-button"
            onClick={goToToday}
          >
            Today
          </button>
          <button
            type="button"
            className="button-secondary calendar-nav-button"
            onClick={() => moveWeek(1)}
            aria-label="Next week"
          >
            →
          </button>
        </div>
        <strong>
          {viewMode === 'day'
            ? formatDayLabel(dayViewDate) + ' ' + dayViewDate.getDate()
            : formatWeekRange(weekStart)}
        </strong>
        {viewMode === 'week' && (
          <div className="schedule-mobile-day-controls">
            <button
              type="button"
              className="button-secondary calendar-nav-button"
              onClick={() => moveMobileDay(-1)}
              aria-label="Previous day"
            >
              ←
            </button>
            <span>
              {formatDayLabel(weekDays[selectedMobileIndex].date)}{' '}
              {weekDays[selectedMobileIndex].date.getDate()}
            </span>
            <button
              type="button"
              className="button-secondary calendar-nav-button"
              onClick={() => moveMobileDay(1)}
              aria-label="Next day"
            >
              →
            </button>
          </div>
        )}
        <div className="schedule-view-controls" aria-label="Calendar view">
          {(['week', 'day'] as const).map((view) => (
            <button
              type="button"
              className={viewMode === view ? 'active' : ''}
              aria-pressed={viewMode === view}
              key={view}
              onClick={() => setViewMode(view)}
            >
              {view === 'week' ? 'Week' : 'Day'}
            </button>
          ))}
        </div>
        <span className="schedule-view-label">
          Click an empty time to add an event
        </span>
      </div>

      <div className="schedule-calendar-scroll">
        <div
          className="schedule-calendar-header-row"
          style={
            { '--calendar-day-count': weekDays.length } as React.CSSProperties
          }
        >
          <div className="schedule-time-corner" />
          {weekDays.map(({ day, date }, index) => (
            <div
              className={
                'schedule-day-header' +
                (isSameDate(date, today) ? ' is-today' : '') +
                (index === selectedMobileIndex ? ' is-mobile-selected' : '')
              }
              key={day}
            >
              <span>{formatDayLabel(date)}</span>
              <strong>{date.getDate()}</strong>
            </div>
          ))}
        </div>

        <div className="schedule-calendar-body">
          <div className="schedule-time-axis" aria-hidden="true">
            {calendarHours.map((minutes) => (
              <span key={minutes} style={{ height: hourHeight + 'px' }}>
                {formatClockTime(minutes, timeFormat)}
              </span>
            ))}
          </div>
          <div
            className="schedule-calendar-day-grid"
            style={
              { '--calendar-day-count': weekDays.length } as React.CSSProperties
            }
          >
            {weekDays.map(({ day, date }, index) => {
              const placements = getEventPlacements(entries, events, day, date)
              const isCurrentDay = isSameDate(date, today)

              return (
                <div
                  className={
                    'schedule-calendar-day' +
                    (isCurrentDay ? ' is-today' : '') +
                    (index === selectedMobileIndex ? ' is-mobile-selected' : '')
                  }
                  key={day}
                  onClick={(event) => handleEmptySlotClick(event, date)}
                >
                  <div
                    className="schedule-hour-lines"
                    style={{ height: calendarHeight + 'px' }}
                  />
                  <div
                    className="schedule-calendar-events"
                    style={{ height: calendarHeight + 'px' }}
                  >
                    {isCurrentDay && showCurrentTime && (
                      <div
                        className="schedule-current-time"
                        style={{
                          top:
                            ((currentTimeMinutes - calendarStartMinutes) / 60) *
                              hourHeight +
                            'px',
                        }}
                      >
                        <span
                          aria-label={
                            'Current time ' +
                            formatClockTime(currentTimeMinutes, timeFormat)
                          }
                        />
                      </div>
                    )}
                    {placements.map((placement) => {
                      const item = placement.entry ?? placement.event
                      if (!item) return null
                      const color = placement.entry
                        ? getCourseColor(placement.entry.courseCode)
                        : getEventColor(placement.event!)
                      const isCompact =
                        placement.kind === 'class' &&
                        placement.height < hourHeight * 1.15
                      const title = placement.entry
                        ? placement.entry.courseTitle
                        : placement.event!.title
                      const code = placement.entry
                        ? placement.entry.courseCode
                        : eventTypeLabel(placement.event!)
                      const isCompletedTask =
                        placement.kind === 'event' &&
                        placement.event!.type === 'task' &&
                        tasks.some(
                          (task) =>
                            task.id === placement.event!.taskId &&
                            task.completed,
                        )

                      return (
                        <button
                          type="button"
                          className={
                            'schedule-event' +
                            (isCompact ? ' is-compact' : '') +
                            (placement.kind === 'event'
                              ? ' schedule-event-' + placement.event!.type
                              : '') +
                            (isCompletedTask ? ' is-completed-task' : '')
                          }
                          key={placement.entry?.id ?? placement.event?.id}
                          onClick={(clickEvent) => {
                            clickEvent.stopPropagation()
                            if (placement.entry) onSelectEntry(placement.entry)
                            else onSelectEvent(placement.event!)
                          }}
                          onDragStart={(dragEvent) => {
                            if (!placement.entry) return
                            dragEvent.dataTransfer.effectAllowed = 'move'
                            dragEvent.dataTransfer.setData(
                              'text/plain',
                              placement.entry.id,
                            )
                          }}
                          draggable={placement.kind === 'class'}
                          style={{
                            backgroundColor: color.background,
                            borderLeftColor: color.border,
                            color: color.text,
                            left:
                              'calc(' +
                              (placement.column / placement.columnCount) * 100 +
                              '% + 2px)',
                            top: placement.top + 'px',
                            width:
                              'calc(' +
                              100 / placement.columnCount +
                              '% - 4px)',
                            height: Math.max(placement.height - 3, 24) + 'px',
                          }}
                          aria-label={
                            code +
                            ', ' +
                            title +
                            ', ' +
                            formatClockTime(placement.start, timeFormat) +
                            ' to ' +
                            formatClockTime(placement.end, timeFormat)
                          }
                        >
                          <strong>
                            {placement.entry
                              ? placement.entry.courseCode
                              : placement.event!.title}
                          </strong>
                          <span className="schedule-event-title">{title}</span>
                          <span>
                            {formatClockTime(placement.start, timeFormat)} –{' '}
                            {formatClockTime(placement.end, timeFormat)}
                          </span>
                          <span className="schedule-event-room">
                            {placement.entry
                              ? placement.entry.room || 'Room not set'
                              : placement.event!.location ||
                                placement.event!.course ||
                                code}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
