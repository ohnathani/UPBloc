export type TimerStatus = 'running' | 'paused'

export interface TimeEntry {
  id: string
  taskId: string
  eventId: string
  projectName: string
  course: string
  startAt: string
  endAt: string
  durationSeconds: number
  notes: string
  createdAt: string
  updatedAt: string
}

export interface ActiveTimer {
  id: string
  taskId: string
  eventId: string
  projectName: string
  course: string
  notes: string
  startedAt: string
  accumulatedSeconds: number
  lastResumedAt: string | null
  status: TimerStatus
}

export type StartTimerValues = Pick<
  ActiveTimer,
  'projectName' | 'taskId' | 'eventId' | 'course' | 'notes'
>

export type ManualTimeEntryValues = Pick<
  TimeEntry,
  | 'projectName'
  | 'taskId'
  | 'eventId'
  | 'course'
  | 'startAt'
  | 'endAt'
  | 'notes'
>

export type SaveActiveSessionValues = {
  notes?: string
}
