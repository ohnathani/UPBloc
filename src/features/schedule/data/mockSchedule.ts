import type { ScheduleEntry } from '../types'

export const mockSchedule: ScheduleEntry[] = [
  {
    id: 'schedule-cmsc18',
    courseCode: 'CMSC 18',
    courseTitle: 'Programming I',
    section: 'A',
    instructor: 'Prof. Example',
    room: 'FC 3',
    days: ['Monday', 'Wednesday', 'Friday'],
    startTime: '08:30',
    endTime: '10:00',
    units: 3,
  },
  {
    id: 'schedule-cmsc56',
    courseCode: 'CMSC 56',
    courseTitle: 'Discrete Math I',
    section: 'B',
    instructor: 'Prof. Example',
    room: 'FC 2',
    days: ['Tuesday', 'Thursday'],
    startTime: '10:00',
    endTime: '11:30',
    units: 3,
  },
]
