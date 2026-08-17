import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react'
import {
  getAuthenticatedSupabase,
  getPersistenceErrorMessage,
} from '../../lib/persistence'
import { useAuth } from '../auth/auth.hook'
import type { Task, TaskFormValues, TaskStatus } from './types'

type TaskRow = {
  id: string
  user_id: string
  title: string
  description: string
  course: string
  due_date: string | null
  due_time: string
  priority: Task['priority']
  status: TaskStatus
  completed: boolean
  created_at: string
}

type TasksContextValue = {
  tasks: Task[]
  loading: boolean
  error: string | null
  saveTask: (values: TaskFormValues, editingId?: string) => Promise<void>
  toggleTask: (taskId: string) => Promise<void>
  changeTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>
  deleteTask: (taskId: string) => Promise<void>
}

const TasksContext = createContext<TasksContextValue | undefined>(undefined)

function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    course: row.course,
    dueDate: row.due_date ?? '',
    dueTime: row.due_time,
    priority: row.priority,
    status: row.status,
    completed: row.completed,
    createdAt: row.created_at,
  }
}

function taskPayload(values: TaskFormValues) {
  return {
    title: values.title,
    description: values.description,
    course: values.course,
    due_date: values.dueDate || null,
    due_time: values.dueTime,
    priority: values.priority,
  }
}

export function TasksProvider({ children }: PropsWithChildren) {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setTasks([])
    setLoading(Boolean(user))
    setError(null)

    if (!user) {
      setLoading(false)
      return () => undefined
    }

    void (async () => {
      try {
        const { client, user: authenticatedUser } =
          await getAuthenticatedSupabase()
        if (authenticatedUser.id !== user.id) return

        const { data, error: responseError } = await client
          .from('tasks')
          .select(
            'id,user_id,title,description,course,due_date,due_time,priority,status,completed,created_at',
          )
          .eq('user_id', authenticatedUser.id)
          .order('created_at', { ascending: false })

        if (responseError) throw responseError
        if (!cancelled) setTasks((data as TaskRow[]).map(mapTask))
      } catch (loadError) {
        if (cancelled) return
        console.error('Failed to load tasks:', loadError)
        setError(getPersistenceErrorMessage(loadError, 'Unable to load tasks.'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user])

  const saveTask = useCallback(
    async (values: TaskFormValues, editingId?: string) => {
      setError(null)
      try {
        if (!user) throw new Error('You must be logged in to save tasks.')
        const { client, user: authenticatedUser } =
          await getAuthenticatedSupabase()
        if (authenticatedUser.id !== user.id) {
          throw new Error('Your session changed. Please try again.')
        }

        if (editingId) {
          const { data, error: responseError } = await client
            .from('tasks')
            .update({
              ...taskPayload(values),
              updated_at: new Date().toISOString(),
            })
            .eq('id', editingId)
            .eq('user_id', authenticatedUser.id)
            .select(
              'id,user_id,title,description,course,due_date,due_time,priority,status,completed,created_at',
            )
            .single()

          if (responseError) throw responseError
          if (!data) throw new Error('The task was not returned by Supabase.')
          setTasks((current) =>
            current.map((task) =>
              task.id === editingId ? mapTask(data as TaskRow) : task,
            ),
          )
          return
        }

        const { data, error: responseError } = await client
          .from('tasks')
          .insert({
            user_id: authenticatedUser.id,
            ...taskPayload(values),
            status: 'todo',
            completed: false,
          })
          .select(
            'id,user_id,title,description,course,due_date,due_time,priority,status,completed,created_at',
          )
          .single()

        if (responseError) throw responseError
        if (!data) throw new Error('The task was not returned by Supabase.')
        setTasks((current) => [mapTask(data as TaskRow), ...current])
      } catch (saveError) {
        console.error('Failed to save task:', saveError)
        setError(getPersistenceErrorMessage(saveError, 'Unable to save task.'))
        throw saveError
      }
    },
    [user],
  )

  const toggleTask = useCallback(
    async (taskId: string) => {
      setError(null)
      try {
        if (!user) throw new Error('You must be logged in to update tasks.')
        const task = tasks.find((item) => item.id === taskId)
        if (!task) return
        const { client, user: authenticatedUser } =
          await getAuthenticatedSupabase()
        if (authenticatedUser.id !== user.id) {
          throw new Error('Your session changed. Please try again.')
        }

        const completed = !task.completed
        const { data, error: responseError } = await client
          .from('tasks')
          .update({
            completed,
            status: completed ? 'completed' : 'todo',
            updated_at: new Date().toISOString(),
          })
          .eq('id', taskId)
          .eq('user_id', authenticatedUser.id)
          .select(
            'id,user_id,title,description,course,due_date,due_time,priority,status,completed,created_at',
          )
          .single()

        if (responseError) throw responseError
        if (!data) throw new Error('The task was not returned by Supabase.')
        setTasks((current) =>
          current.map((item) =>
            item.id === taskId ? mapTask(data as TaskRow) : item,
          ),
        )
      } catch (toggleError) {
        console.error('Failed to update task completion:', toggleError)
        setError(
          getPersistenceErrorMessage(
            toggleError,
            'Unable to update task completion.',
          ),
        )
        throw toggleError
      }
    },
    [tasks, user],
  )

  const changeTaskStatus = useCallback(
    async (taskId: string, status: TaskStatus) => {
      setError(null)
      try {
        if (!user) throw new Error('You must be logged in to update tasks.')
        const { client, user: authenticatedUser } =
          await getAuthenticatedSupabase()
        if (authenticatedUser.id !== user.id) {
          throw new Error('Your session changed. Please try again.')
        }

        const { data, error: responseError } = await client
          .from('tasks')
          .update({
            status,
            completed: status === 'completed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', taskId)
          .eq('user_id', authenticatedUser.id)
          .select(
            'id,user_id,title,description,course,due_date,due_time,priority,status,completed,created_at',
          )
          .single()

        if (responseError) throw responseError
        if (!data) throw new Error('The task was not returned by Supabase.')
        setTasks((current) =>
          current.map((item) =>
            item.id === taskId ? mapTask(data as TaskRow) : item,
          ),
        )
      } catch (statusError) {
        console.error('Failed to change task status:', statusError)
        setError(
          getPersistenceErrorMessage(
            statusError,
            'Unable to change task status.',
          ),
        )
        throw statusError
      }
    },
    [user],
  )

  const deleteTask = useCallback(
    async (taskId: string) => {
      setError(null)
      try {
        if (!user) throw new Error('You must be logged in to delete tasks.')
        const { client, user: authenticatedUser } =
          await getAuthenticatedSupabase()
        if (authenticatedUser.id !== user.id) {
          throw new Error('Your session changed. Please try again.')
        }

        const { data, error: responseError } = await client
          .from('tasks')
          .delete()
          .eq('id', taskId)
          .eq('user_id', authenticatedUser.id)
          .select('id')

        if (responseError) throw responseError
        if (!data?.some((row) => row.id === taskId)) {
          throw new Error('The task was not found in Supabase.')
        }
        setTasks((current) => current.filter((task) => task.id !== taskId))
      } catch (deleteError) {
        console.error('Failed to delete task:', deleteError)
        setError(
          getPersistenceErrorMessage(deleteError, 'Unable to delete task.'),
        )
        throw deleteError
      }
    },
    [user],
  )

  return (
    <TasksContext.Provider
      value={{
        tasks,
        loading,
        error,
        saveTask,
        toggleTask,
        changeTaskStatus,
        deleteTask,
      }}
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
