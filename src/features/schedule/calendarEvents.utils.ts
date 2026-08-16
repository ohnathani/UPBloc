import type { CalendarEvent } from './types'

export function getEventDurationMinutes(event: CalendarEvent) {
  return Math.max(
    0,
    (new Date(event.endDateTime).getTime() -
      new Date(event.startDateTime).getTime()) /
      60_000,
  )
}
