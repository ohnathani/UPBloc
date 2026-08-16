import type { Task } from '../types'

function formatDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function dateFromToday(offset: number) {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + offset)
  return formatDate(date)
}

export const mockTasks: Task[] = [
  {
    id: 'task-cmsc18-recursion',
    title: 'Finish recursion problem set',
    description: 'Complete exercises 1–12 and upload the solution PDF.',
    course: 'CMSC 18 — Programming I',
    dueDate: dateFromToday(-1),
    dueTime: '23:59',
    priority: 'high',
    status: 'in-progress',
    completed: false,
    createdAt: '2026-08-08T09:30:00.000Z',
  },
  {
    id: 'task-cmsc56-proof',
    title: 'Review proof techniques',
    description:
      'Make a one-page summary of induction and contradiction proofs.',
    course: 'CMSC 56 — Discrete Math I',
    dueDate: dateFromToday(0),
    dueTime: '18:00',
    priority: 'high',
    status: 'todo',
    completed: false,
    createdAt: '2026-08-10T13:15:00.000Z',
  },
  {
    id: 'task-cmsc10-reading',
    title: 'Read Chapter 4',
    description:
      'Read the chapter and bring two questions to the next discussion.',
    course: 'CMSC 10 — Introduction to Computer Science',
    dueDate: dateFromToday(1),
    dueTime: '',
    priority: 'medium',
    status: 'todo',
    completed: false,
    createdAt: '2026-08-11T08:00:00.000Z',
  },
  {
    id: 'task-cmsc3-wireframe',
    title: 'Submit landing page wireframe',
    description:
      'Export the mobile and desktop wireframes from your design file.',
    course: 'CMSC 3 — Introduction to Web Design',
    dueDate: dateFromToday(4),
    dueTime: '12:00',
    priority: 'low',
    status: 'in-progress',
    completed: false,
    createdAt: '2026-08-12T16:45:00.000Z',
  },
  {
    id: 'task-cmsc18-variables',
    title: 'Complete variables quiz',
    description: 'Review the lecture notes and finish the practice quiz.',
    course: 'CMSC 18 — Programming I',
    dueDate: dateFromToday(-3),
    dueTime: '10:00',
    priority: 'medium',
    status: 'completed',
    completed: true,
    createdAt: '2026-08-04T11:20:00.000Z',
  },
]
