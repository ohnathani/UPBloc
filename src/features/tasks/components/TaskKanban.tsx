import type { Task, TaskStatus } from '../types'
import { TaskCard } from './TaskCard'

type TaskKanbanProps = {
  tasks: Task[]
  draggingTaskId: string | null
  onTaskDrop: (taskId: string, status: TaskStatus) => void
  onDragStart: (task: Task) => void
  onDragEnd: () => void
  onToggle: (task: Task) => void
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
  onSchedule: (task: Task) => void
  onTrack: (task: Task) => void
}

const columns: Array<{ label: string; status: TaskStatus; hint: string }> = [
  { label: 'To do', status: 'todo', hint: 'Ready to start' },
  { label: 'In progress', status: 'in-progress', hint: 'Currently working on' },
  { label: 'Completed', status: 'completed', hint: 'Finished tasks' },
]

export function TaskKanban({
  tasks,
  draggingTaskId,
  onTaskDrop,
  onDragStart,
  onDragEnd,
  onToggle,
  onEdit,
  onDelete,
  onSchedule,
  onTrack,
}: TaskKanbanProps) {
  return (
    <div className="task-kanban" aria-label="Task Kanban board">
      {columns.map((column) => {
        const columnTasks = tasks.filter(
          (task) => task.status === column.status,
        )

        return (
          <section
            className="kanban-column"
            key={column.status}
            onDragOver={(event) => {
              event.preventDefault()
              event.dataTransfer.dropEffect = 'move'
            }}
            onDrop={(event) => {
              event.preventDefault()
              const taskId = event.dataTransfer.getData('text/plain')
              if (taskId) onTaskDrop(taskId, column.status)
            }}
          >
            <div className="kanban-column-heading">
              <div>
                <h2>{column.label}</h2>
                <p>{column.hint}</p>
              </div>
              <span>{columnTasks.length}</span>
            </div>
            <div className="kanban-column-list">
              {columnTasks.length > 0 ? (
                columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggle={onToggle}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onSchedule={onSchedule}
                    onTrack={onTrack}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    isDragging={draggingTaskId === task.id}
                    onStatusChange={(status) => onTaskDrop(task.id, status)}
                  />
                ))
              ) : (
                <div className="kanban-empty-column">Drop tasks here</div>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}
