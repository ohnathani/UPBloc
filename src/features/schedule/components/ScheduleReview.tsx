import { useMemo, useState } from 'react'
import { ScheduleEntryEditor } from './ScheduleEntryEditor'
import type { ScheduleEntry, ScheduleEntryDraft, ScheduleIssue } from '../types'
import { validateScheduleEntries } from '../validation'

type ScheduleReviewProps = {
  entries: ScheduleEntry[]
  existingEntries: ScheduleEntry[]
  parserWarnings: string[]
  sourcePreviewUrl?: string | null
  onChange: (entries: ScheduleEntry[]) => void
  onBack: () => void
  onConfirm: (entries: ScheduleEntry[]) => void
}

function issuesForEntry(issues: ScheduleIssue[], entryId: string) {
  return issues.filter((issue) => issue.entryId === entryId)
}

export function ScheduleReview({
  entries,
  existingEntries,
  parserWarnings,
  sourcePreviewUrl,
  onChange,
  onBack,
  onConfirm,
}: ScheduleReviewProps) {
  const [editingEntry, setEditingEntry] = useState<ScheduleEntry | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [addingGroupId, setAddingGroupId] = useState<string | null>(null)
  const validation = useMemo(
    () => validateScheduleEntries(entries, existingEntries),
    [entries, existingEntries],
  )
  const errors = validation.issues.filter((issue) => issue.severity === 'error')
  const warnings = [
    ...parserWarnings,
    ...validation.issues.filter((issue) => issue.severity === 'warning'),
  ]
  const groups = useMemo(() => {
    const grouped = new Map<string, ScheduleEntry[]>()
    entries.forEach((entry) => {
      const key = entry.scheduleGroupId || entry.id
      grouped.set(key, [...(grouped.get(key) ?? []), entry])
    })
    return [...grouped.entries()].map(([key, groupEntries]) => ({
      key,
      entries: groupEntries,
      primary: groupEntries[0],
    }))
  }, [entries])

  function resetEditor() {
    setEditingEntry(null)
    setIsAdding(false)
    setAddingGroupId(null)
  }

  function saveEntry(draft: ScheduleEntryDraft) {
    if (isAdding && editingEntry?.id.startsWith('new-')) {
      onChange([
        ...entries,
        {
          ...draft,
          id: editingEntry.id,
          scheduleGroupId:
            editingEntry.scheduleGroupId || addingGroupId || undefined,
        },
      ])
    } else if (editingEntry) {
      onChange(
        entries.map((entry) => {
          const sameGroup =
            editingEntry.scheduleGroupId &&
            entry.scheduleGroupId === editingEntry.scheduleGroupId
          if (!sameGroup && entry.id !== editingEntry.id) return entry
          if (entry.id !== editingEntry.id) {
            return {
              ...entry,
              classCode: draft.classCode,
              courseCode: draft.courseCode,
              courseTitle: draft.courseTitle,
              section: draft.section,
              instructor: draft.instructor,
              units: draft.units,
            }
          }
          return {
            ...draft,
            id: entry.id,
            scheduleGroupId: entry.scheduleGroupId,
          }
        }),
      )
    } else {
      onChange([
        ...entries,
        {
          ...draft,
          id: 'manual-' + Date.now(),
          scheduleGroupId: addingGroupId ?? undefined,
        },
      ])
    }
    resetEditor()
  }

  function removeEntry(entryId: string) {
    onChange(entries.filter((entry) => entry.id !== entryId))
  }

  function addScheduleToGroup(entry: ScheduleEntry) {
    const groupId = entry.scheduleGroupId || entry.id
    setEditingEntry({
      ...entry,
      id: 'new-' + Date.now(),
      scheduleGroupId: groupId,
      days: [],
      startTime: '',
      endTime: '',
      room: '',
    })
    setAddingGroupId(groupId)
    setIsAdding(true)
  }

  function renderIssues(entryId: string) {
    return issuesForEntry(validation.issues, entryId).map((issue, index) => (
      <p
        key={issue.message + '-' + index}
        className={'schedule-issue ' + issue.severity}
      >
        <strong>{issue.severity === 'warning' ? 'Review:' : 'Fix:'}</strong>{' '}
        {issue.message}
      </p>
    ))
  }

  return (
    <div className="schedule-review">
      {sourcePreviewUrl && (
        <details className="schedule-source-preview">
          <summary>View original Form 5 image</summary>
          <img src={sourcePreviewUrl} alt="Original uploaded UP Form 5" />
        </details>
      )}

      <div className="schedule-review-header">
        <div>
          <p className="eyebrow">Step 3</p>
          <h2>Review Imported Schedule</h2>
          <p className="muted">
            Check each course and its schedule entries before adding them.
          </p>
        </div>
        <button
          type="button"
          className="button-secondary"
          onClick={() => {
            resetEditor()
            setIsAdding(true)
          }}
        >
          Add missing class
        </button>
      </div>

      <div className="schedule-review-summary">
        <strong>
          {groups.length} {groups.length === 1 ? 'class' : 'classes'} ready to
          add
        </strong>
        {warnings.length > 0 && (
          <span>
            {warnings.length} review {warnings.length === 1 ? 'item' : 'items'}
          </span>
        )}
        {errors.length > 0 && (
          <span className="summary-error">
            {errors.length} item{errors.length === 1 ? '' : 's'} need fixing
          </span>
        )}
      </div>

      {parserWarnings.length > 0 && (
        <div className="schedule-warning-panel" role="status">
          {parserWarnings.map((warning, index) => (
            <p key={warning + index}>{warning}</p>
          ))}
        </div>
      )}

      <div className="schedule-review-list">
        {groups.map((group) => {
          const entry = group.primary
          const groupHasWarning = group.entries.some(
            (item) =>
              validation.duplicateEntryIds.includes(item.id) ||
              validation.conflictEntryIds.includes(item.id),
          )
          return (
            <article
              className={
                'schedule-review-row' + (groupHasWarning ? ' has-warning' : '')
              }
              key={group.key}
            >
              <div className="schedule-review-main">
                <div>
                  <h3>{entry.courseCode || 'Missing course code'}</h3>
                  <p>
                    {entry.courseTitle || 'Course title not detected'}
                    {entry.classCode && ' · Class ' + entry.classCode}
                  </p>
                </div>
                <dl className="schedule-review-details">
                  <div>
                    <dt>Section</dt>
                    <dd>{entry.section || '—'}</dd>
                  </div>
                  <div>
                    <dt>Units</dt>
                    <dd>{entry.units ?? '—'}</dd>
                  </div>
                </dl>

                <div className="schedule-review-schedules">
                  {group.entries.map((schedule) => (
                    <div className="schedule-review-schedule" key={schedule.id}>
                      <div className="schedule-review-facts">
                        <span>{schedule.days.join(' / ') || 'No days'}</span>
                        <span>
                          {schedule.startTime || '--:--'} –{' '}
                          {schedule.endTime || '--:--'}
                        </span>
                        <span>{schedule.room || 'Room not detected'}</span>
                      </div>
                      {renderIssues(schedule.id)}
                      <div className="schedule-review-actions">
                        <button
                          type="button"
                          className="button-quiet"
                          onClick={() => {
                            setIsAdding(false)
                            setAddingGroupId(null)
                            setEditingEntry(schedule)
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="button-quiet button-danger"
                          onClick={() => removeEntry(schedule.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="button-quiet schedule-add-schedule"
                  onClick={() => addScheduleToGroup(entry)}
                >
                  + Add schedule
                </button>
              </div>
            </article>
          )
        })}
      </div>

      {entries.length === 0 && (
        <p className="schedule-review-empty">
          No classes remain. Add a class manually or go back and try another
          image.
        </p>
      )}

      <div className="schedule-review-footer">
        <button type="button" className="button-secondary" onClick={onBack}>
          Back to upload
        </button>
        <button
          type="button"
          onClick={() => onConfirm(entries)}
          disabled={entries.length === 0 || errors.length > 0}
        >
          Confirm schedule
        </button>
      </div>

      {(editingEntry || isAdding) && (
        <ScheduleEntryEditor
          entry={editingEntry}
          onSave={saveEntry}
          onCancel={resetEditor}
        />
      )}
    </div>
  )
}
