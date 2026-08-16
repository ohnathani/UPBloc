export const scheduleDays = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const

export type ScheduleDay = (typeof scheduleDays)[number]

export interface ScheduleEntry {
  id: string
  classCode?: string
  scheduleGroupId?: string
  courseCode: string
  courseTitle: string
  section: string
  instructor: string
  room: string
  days: ScheduleDay[]
  startTime: string
  endTime: string
  units: number | null
}

export type ScheduleEntryDraft = Omit<ScheduleEntry, 'id'>

export const calendarEventTypes = [
  'study',
  'task',
  'exam',
  'personal',
  'other',
] as const

export type CalendarEventType = (typeof calendarEventTypes)[number]

export interface CalendarEvent {
  id: string
  title: string
  description: string
  type: CalendarEventType
  startDateTime: string
  endDateTime: string
  location: string
  course: string
  taskId: string
}

export type CalendarEventDraft = Omit<CalendarEvent, 'id'>

export type ScheduleIssueSeverity = 'error' | 'warning'

export interface ScheduleIssue {
  entryId: string
  severity: ScheduleIssueSeverity
  message: string
  field?: keyof ScheduleEntry
}

export interface ScheduleValidationSummary {
  issues: ScheduleIssue[]
  duplicateEntryIds: string[]
  conflictEntryIds: string[]
}
