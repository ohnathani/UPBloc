export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskStatus = 'todo' | 'in-progress' | 'completed'

export interface Task {
  id: string
  title: string
  description: string
  course: string
  dueDate: string
  dueTime: string
  priority: TaskPriority
  status: TaskStatus
  completed: boolean
  createdAt: string
}

export type TaskFormValues = Pick<
  Task,
  'title' | 'description' | 'course' | 'dueDate' | 'dueTime' | 'priority'
>

export type TaskFilter = 'all' | 'active' | 'completed' | 'overdue'
export type TaskView = 'list' | 'kanban'
