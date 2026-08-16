import { useEffect, useState, type FormEvent } from 'react'
import type { Task, TaskFormValues, TaskPriority } from '../types'

type TaskFormProps = {
  task: Task | null
  onSubmit: (values: TaskFormValues) => void
  onClose: () => void
}

type FormErrors = Partial<Record<keyof TaskFormValues, string>>

const emptyValues: TaskFormValues = {
  title: '',
  description: '',
  course: '',
  dueDate: '',
  dueTime: '',
  priority: 'medium',
}

function valuesFromTask(task: Task | null): TaskFormValues {
  if (!task) return emptyValues

  return {
    title: task.title,
    description: task.description,
    course: task.course,
    dueDate: task.dueDate,
    dueTime: task.dueTime,
    priority: task.priority,
  }
}

export function TaskForm({ task, onSubmit, onClose }: TaskFormProps) {
  const [values, setValues] = useState<TaskFormValues>(() =>
    valuesFromTask(task),
  )
  const [errors, setErrors] = useState<FormErrors>({})
  const isEditing = Boolean(task)

  useEffect(() => {
    setValues(valuesFromTask(task))
    setErrors({})
  }, [task])

  function updateValue<Key extends keyof TaskFormValues>(
    key: Key,
    value: TaskFormValues[Key],
  ) {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: FormErrors = {}

    if (!values.title.trim()) nextErrors.title = 'Add a title for this task.'
    if (!values.dueDate) nextErrors.dueDate = 'Choose a due date.'

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    onSubmit({
      ...values,
      title: values.title.trim(),
      description: values.description.trim(),
      course: values.course.trim(),
    })
  }

  return (
    <div
      className="task-modal-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="task-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-form-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="task-modal-heading">
          <div>
            <p className="eyebrow">Task details</p>
            <h2 id="task-form-title">{isEditing ? 'Edit task' : 'New task'}</h2>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close task form"
          >
            ×
          </button>
        </div>

        <form className="task-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="task-title">
              Title <span aria-hidden="true">*</span>
            </label>
            <input
              id="task-title"
              value={values.title}
              onChange={(event) => updateValue('title', event.target.value)}
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? 'task-title-error' : undefined}
              autoFocus
            />
            {errors.title && (
              <p id="task-title-error" className="field-error">
                {errors.title}
              </p>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="task-description">
              Description <span className="label-optional">Optional</span>
            </label>
            <textarea
              id="task-description"
              value={values.description}
              onChange={(event) =>
                updateValue('description', event.target.value)
              }
              rows={3}
            />
          </div>

          <div className="form-field">
            <label htmlFor="task-course">
              Course <span className="label-optional">Optional</span>
            </label>
            <input
              id="task-course"
              value={values.course}
              onChange={(event) => updateValue('course', event.target.value)}
              placeholder="e.g. CMSC 18 — Programming I"
            />
          </div>

          <div className="task-form-grid">
            <div className="form-field">
              <label htmlFor="task-due-date">
                Due date <span aria-hidden="true">*</span>
              </label>
              <input
                id="task-due-date"
                type="date"
                value={values.dueDate}
                onChange={(event) => updateValue('dueDate', event.target.value)}
                aria-invalid={Boolean(errors.dueDate)}
                aria-describedby={
                  errors.dueDate ? 'task-due-date-error' : undefined
                }
              />
              {errors.dueDate && (
                <p id="task-due-date-error" className="field-error">
                  {errors.dueDate}
                </p>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="task-due-time">
                Due time <span className="label-optional">Optional</span>
              </label>
              <input
                id="task-due-time"
                type="time"
                value={values.dueTime}
                onChange={(event) => updateValue('dueTime', event.target.value)}
              />
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="task-priority">Priority</label>
            <select
              id="task-priority"
              value={values.priority}
              onChange={(event) =>
                updateValue('priority', event.target.value as TaskPriority)
              }
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div className="task-form-actions">
            <button
              type="button"
              className="button-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit">
              {isEditing ? 'Save changes' : 'Create task'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
