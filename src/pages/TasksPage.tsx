import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { TaskFilters } from '../features/tasks/components/TaskFilters'
import { TaskForm } from '../features/tasks/components/TaskForm'
import { TaskKanban } from '../features/tasks/components/TaskKanban'
import { TaskSection } from '../features/tasks/components/TaskSection'
import { useCalendarEvents } from '../features/schedule/calendarEvents.context'
import { useTasks } from '../features/tasks/tasks.context'
import type {
  Task,
  TaskFilter,
  TaskFormValues,
  TaskStatus,
  TaskView,
} from '../features/tasks/types'

type TaskSections = {
  overdue: Task[]
  today: Task[]
  upcoming: Task[]
  completed: Task[]
}

function getDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getTaskSortValue(task: Task) {
  return `${task.dueDate}T${task.dueTime || '23:59'}`
}

function sortTasks(tasks: Task[]) {
  return [...tasks].sort((first, second) =>
    getTaskSortValue(first).localeCompare(getTaskSortValue(second)),
  )
}

function isOverdue(task: Task, today: string) {
  return !task.completed && task.dueDate < today
}

export function TasksPage() {
  const navigate = useNavigate()
  const {
    tasks,
    loading: tasksLoading,
    saveTask,
    toggleTask,
    changeTaskStatus,
    deleteTask,
  } = useTasks()
  const {
    events,
    loading: calendarLoading,
    deleteFutureTaskEvents,
  } = useCalendarEvents()
  const [filter, setFilter] = useState<TaskFilter>('all')
  const [courseFilter, setCourseFilter] = useState('all')
  const [view, setView] = useState<TaskView>('list')
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    const action = searchParams.get('action')
    const taskId = searchParams.get('task')

    if (action === 'add') {
      setEditingTask(null)
      setIsFormOpen(true)
      setSearchParams({}, { replace: true })
    } else if (taskId) {
      const task = tasks.find((item) => item.id === taskId)
      if (task) {
        setEditingTask(task)
        setIsFormOpen(true)
      }
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams, tasks])

  const courses = useMemo(
    () =>
      Array.from(
        new Set(tasks.map((task) => task.course).filter(Boolean)),
      ).sort(),
    [tasks],
  )
  const today = getDateKey()

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesCourse =
        courseFilter === 'all' || task.course === courseFilter
      const matchesStatus =
        filter === 'all' ||
        (filter === 'active' && !task.completed) ||
        (filter === 'completed' && task.completed) ||
        (filter === 'overdue' && isOverdue(task, today))

      return matchesCourse && matchesStatus
    })
  }, [courseFilter, filter, tasks, today])

  const sections = useMemo<TaskSections>(() => {
    const grouped: TaskSections = {
      overdue: [],
      today: [],
      upcoming: [],
      completed: [],
    }

    filteredTasks.forEach((task) => {
      if (task.completed) {
        grouped.completed.push(task)
      } else if (task.dueDate < today) {
        grouped.overdue.push(task)
      } else if (task.dueDate === today) {
        grouped.today.push(task)
      } else {
        grouped.upcoming.push(task)
      }
    })

    return {
      overdue: sortTasks(grouped.overdue),
      today: sortTasks(grouped.today),
      upcoming: sortTasks(grouped.upcoming),
      completed: sortTasks(grouped.completed),
    }
  }, [filteredTasks, today])

  const hasTasks = tasks.length > 0
  const hasResults = Object.values(sections).some(
    (section) => section.length > 0,
  )

  function openCreateForm() {
    setEditingTask(null)
    setIsFormOpen(true)
  }

  function openEditForm(task: Task) {
    setEditingTask(task)
    setIsFormOpen(true)
  }

  function closeForm() {
    setIsFormOpen(false)
    setEditingTask(null)
  }

  async function handleSave(values: TaskFormValues) {
    try {
      await saveTask(values, editingTask?.id)
      closeForm()
    } catch {
      // The provider exposes the persistent error through the app toast.
    }
  }

  async function handleToggle(task: Task) {
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

  async function handleTaskDrop(taskId: string, status: TaskStatus) {
    try {
      await changeTaskStatus(taskId, status)
      setDraggingTaskId(null)
    } catch {
      // The provider exposes the persistent error through the app toast.
    }
  }

  async function handleDelete(task: Task) {
    const confirmed = window.confirm(`Delete "${task.title}"?`)
    if (!confirmed) return

    try {
      await deleteTask(task.id)
    } catch {
      // The provider exposes the persistent error through the app toast.
    }
  }

  function handleSchedule(task: Task) {
    navigate(`/schedule?task=${encodeURIComponent(task.id)}`)
  }

  function handleTrack(task: Task) {
    navigate(`/time-tracker?task=${encodeURIComponent(task.id)}`)
  }

  if (tasksLoading || calendarLoading) {
    return (
      <main className="page-shell app-page-shell tasks-page">
        <p className="status-message">Loading tasks...</p>
      </main>
    )
  }

  return (
    <main className="page-shell app-page-shell tasks-page">
      <div className="tasks-page-inner">
        <header className="tasks-header">
          <div>
            <h1 id="tasks-title">Tasks</h1>
            <p className="muted">
              Keep coursework moving with a clear view of what needs your
              attention.
            </p>
          </div>
          <button
            type="button"
            className="new-task-button"
            onClick={openCreateForm}
          >
            <span aria-hidden="true">+</span> New Task
          </button>
        </header>

        <TaskFilters
          filter={filter}
          courseFilter={courseFilter}
          courses={courses}
          view={view}
          onFilterChange={setFilter}
          onCourseChange={setCourseFilter}
          onViewChange={setView}
        />

        {!hasTasks ? (
          <div className="tasks-empty-state">
            <span className="empty-state-icon" aria-hidden="true">
              ✓
            </span>
            <h2>No tasks yet</h2>
            <p>Add your first task to start organizing your study week.</p>
            <button type="button" onClick={openCreateForm}>
              Create your first task
            </button>
          </div>
        ) : !hasResults ? (
          <div className="tasks-empty-state no-results-state">
            <span className="empty-state-icon" aria-hidden="true">
              ⌕
            </span>
            <h2>No matching tasks</h2>
            <p>Try a different status or course filter.</p>
          </div>
        ) : view === 'kanban' ? (
          <TaskKanban
            tasks={filteredTasks}
            draggingTaskId={draggingTaskId}
            onTaskDrop={handleTaskDrop}
            onDragStart={(task) => setDraggingTaskId(task.id)}
            onDragEnd={() => setDraggingTaskId(null)}
            onToggle={handleToggle}
            onEdit={openEditForm}
            onDelete={handleDelete}
            onSchedule={handleSchedule}
            onTrack={handleTrack}
          />
        ) : (
          <div className="task-sections">
            <TaskSection
              title="Overdue"
              count={sections.overdue.length}
              tasks={sections.overdue}
              onToggle={handleToggle}
              onEdit={openEditForm}
              onDelete={handleDelete}
              onSchedule={handleSchedule}
              onTrack={handleTrack}
            />
            <TaskSection
              title="Today"
              count={sections.today.length}
              tasks={sections.today}
              onToggle={handleToggle}
              onEdit={openEditForm}
              onDelete={handleDelete}
              onSchedule={handleSchedule}
              onTrack={handleTrack}
            />
            <TaskSection
              title="Upcoming"
              count={sections.upcoming.length}
              tasks={sections.upcoming}
              onToggle={handleToggle}
              onEdit={openEditForm}
              onDelete={handleDelete}
              onSchedule={handleSchedule}
              onTrack={handleTrack}
            />
            <TaskSection
              title="Completed"
              count={sections.completed.length}
              tasks={sections.completed}
              onToggle={handleToggle}
              onEdit={openEditForm}
              onDelete={handleDelete}
              onSchedule={handleSchedule}
              onTrack={handleTrack}
            />
          </div>
        )}
      </div>

      {isFormOpen && (
        <TaskForm
          task={editingTask}
          onSubmit={handleSave}
          onClose={closeForm}
        />
      )}
    </main>
  )
}
