import type { Task } from '../types'
import { TaskCard } from './TaskCard'

type TaskSectionProps = {
  title: string
  count: number
  tasks: Task[]
  onToggle: (task: Task) => void
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
  onSchedule: (task: Task) => void
  onTrack: (task: Task) => void
}

export function TaskSection({
  title,
  count,
  tasks,
  onToggle,
  onEdit,
  onDelete,
  onSchedule,
  onTrack,
}: TaskSectionProps) {
  if (tasks.length === 0) return null

  return (
    <section className="task-section" aria-labelledby={`task-section-${title}`}>
      <div className="task-section-heading">
        <h2 id={`task-section-${title}`}>{title}</h2>
        <span>{count}</span>
      </div>
      <div className="task-section-list">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onToggle={onToggle}
            onEdit={onEdit}
            onDelete={onDelete}
            onSchedule={onSchedule}
            onTrack={onTrack}
          />
        ))}
      </div>
    </section>
  )
}
