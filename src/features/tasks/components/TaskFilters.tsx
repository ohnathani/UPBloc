import type { TaskFilter, TaskView } from '../types'

type TaskFiltersProps = {
  filter: TaskFilter
  courseFilter: string
  courses: string[]
  view: TaskView
  onFilterChange: (filter: TaskFilter) => void
  onCourseChange: (course: string) => void
  onViewChange: (view: TaskView) => void
}

const filters: Array<{ label: string; value: TaskFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
  { label: 'Overdue', value: 'overdue' },
]

export function TaskFilters({
  filter,
  courseFilter,
  courses,
  view,
  onFilterChange,
  onCourseChange,
  onViewChange,
}: TaskFiltersProps) {
  return (
    <div className="task-filters" aria-label="Task filters">
      <div className="filter-tabs" role="tablist" aria-label="Task status">
        {filters.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={filter === item.value}
            className={`filter-tab${filter === item.value ? ' active' : ''}`}
            onClick={() => onFilterChange(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {courses.length > 0 && (
        <label className="course-filter">
          <span>Course</span>
          <select
            value={courseFilter}
            onChange={(event) => onCourseChange(event.target.value)}
            aria-label="Filter tasks by course"
          >
            <option value="all">All courses</option>
            {courses.map((course) => (
              <option key={course} value={course}>
                {course}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="task-view-toggle" aria-label="Task view">
        <span>View</span>
        <button
          type="button"
          className={view === 'list' ? 'active' : ''}
          aria-pressed={view === 'list'}
          onClick={() => onViewChange('list')}
        >
          List
        </button>
        <button
          type="button"
          className={view === 'kanban' ? 'active' : ''}
          aria-pressed={view === 'kanban'}
          onClick={() => onViewChange('kanban')}
        >
          Kanban
        </button>
      </div>
    </div>
  )
}
