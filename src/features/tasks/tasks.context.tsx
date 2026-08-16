import {
  createContext,
  useCallback,
  useContext,
  useState,
  type PropsWithChildren,
} from 'react'
import { mockTasks } from './data/mockTasks'
import type { Task, TaskFormValues, TaskStatus } from './types'

type TasksContextValue = {
  tasks: Task[]
  saveTask: (values: TaskFormValues, editingId?: string) => void
  toggleTask: (taskId: string) => void
  changeTaskStatus: (taskId: string, status: TaskStatus) => void
  deleteTask: (taskId: string) => void
}

const TasksContext = createContext<TasksContextValue | undefined>(undefined)

function makeTaskId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `task-${Date.now()}`
}

export function TasksProvider({ children }: PropsWithChildren) {
  const [tasks, setTasks] = useState<Task[]>(mockTasks)

  const saveTask = useCallback((values: TaskFormValues, editingId?: string) => {
    setTasks((current) =>
      editingId
        ? current.map((task) =>
            task.id === editingId ? { ...task, ...values } : task,
          )
        : [
            ...current,
            {
              ...values,
              id: makeTaskId(),
              status: 'todo',
              completed: false,
              createdAt: new Date().toISOString(),
            },
          ],
    )
  }, [])

  const toggleTask = useCallback((taskId: string) => {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? {
              ...task,
              completed: !task.completed,
              status: task.completed ? 'todo' : 'completed',
            }
          : task,
      ),
    )
  }, [])

  const changeTaskStatus = useCallback((taskId: string, status: TaskStatus) => {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? { ...task, status, completed: status === 'completed' }
          : task,
      ),
    )
  }, [])

  const deleteTask = useCallback((taskId: string) => {
    setTasks((current) => current.filter((task) => task.id !== taskId))
  }, [])

  return (
    <TasksContext.Provider
      value={{ tasks, saveTask, toggleTask, changeTaskStatus, deleteTask }}
    >
      {children}
    </TasksContext.Provider>
  )
}

// This hook intentionally lives beside its provider so the feature has one public entry point.
// eslint-disable-next-line react-refresh/only-export-components
export function useTasks() {
  const context = useContext(TasksContext)

  if (!context) {
    throw new Error('useTasks must be used inside a TasksProvider')
  }

  return context
}
