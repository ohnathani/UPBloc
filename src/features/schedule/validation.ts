import type {
  ScheduleEntry,
  ScheduleIssue,
  ScheduleValidationSummary,
} from './types'

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

function sharesDay(first: ScheduleEntry, second: ScheduleEntry) {
  return first.days.some((day) => second.days.includes(day))
}

function overlaps(first: ScheduleEntry, second: ScheduleEntry) {
  return (
    timeToMinutes(first.startTime) < timeToMinutes(second.endTime) &&
    timeToMinutes(second.startTime) < timeToMinutes(first.endTime)
  )
}

function duplicateKey(entry: ScheduleEntry) {
  return [
    entry.courseCode.toUpperCase(),
    entry.days.join(','),
    entry.startTime,
    entry.endTime,
    entry.room.toUpperCase(),
  ].join('|')
}

export function validateScheduleEntries(
  entries: ScheduleEntry[],
  existingEntries: ScheduleEntry[] = [],
): ScheduleValidationSummary {
  const issues: ScheduleIssue[] = []
  const duplicateEntryIds = new Set<string>()
  const conflictEntryIds = new Set<string>()

  entries.forEach((entry) => {
    if (!entry.courseCode.trim()) {
      issues.push({
        entryId: entry.id,
        field: 'courseCode',
        severity: 'error',
        message: 'Course code is required.',
      })
    }
    if (!entry.courseTitle.trim()) {
      issues.push({
        entryId: entry.id,
        field: 'courseTitle',
        severity: 'warning',
        message: 'Course title could not be determined.',
      })
    }
    if (entry.days.length === 0) {
      issues.push({
        entryId: entry.id,
        field: 'days',
        severity: 'error',
        message: 'Add at least one valid class day.',
      })
    }
    if (!timePattern.test(entry.startTime)) {
      issues.push({
        entryId: entry.id,
        field: 'startTime',
        severity: 'error',
        message: 'Start time is missing or invalid.',
      })
    }
    if (!timePattern.test(entry.endTime)) {
      issues.push({
        entryId: entry.id,
        field: 'endTime',
        severity: 'error',
        message: 'End time is missing or invalid.',
      })
    }
    if (
      timePattern.test(entry.startTime) &&
      timePattern.test(entry.endTime) &&
      timeToMinutes(entry.startTime) >= timeToMinutes(entry.endTime)
    ) {
      issues.push({
        entryId: entry.id,
        severity: 'error',
        message: 'End time must be after start time.',
      })
    }
    if (!entry.section) {
      issues.push({
        entryId: entry.id,
        field: 'section',
        severity: 'warning',
        message: 'Section could not be determined.',
      })
    }
    if (!entry.room) {
      issues.push({
        entryId: entry.id,
        field: 'room',
        severity: 'warning',
        message: 'Room could not be determined.',
      })
    }
    if (!entry.instructor) {
      issues.push({
        entryId: entry.id,
        field: 'instructor',
        severity: 'warning',
        message: 'Instructor could not be determined.',
      })
    }
    if (entry.units !== null && entry.units < 0) {
      issues.push({
        entryId: entry.id,
        field: 'units',
        severity: 'error',
        message: 'Units cannot be negative.',
      })
    }
  })

  entries.forEach((entry, index) => {
    const entriesToCompare = [...entries.slice(index + 1), ...existingEntries]
    entriesToCompare.forEach((other) => {
      if (duplicateKey(entry) === duplicateKey(other)) {
        duplicateEntryIds.add(entry.id)
        duplicateEntryIds.add(other.id)
      }
      if (
        entry.id !== other.id &&
        sharesDay(entry, other) &&
        timePattern.test(entry.startTime) &&
        timePattern.test(entry.endTime) &&
        timePattern.test(other.startTime) &&
        timePattern.test(other.endTime) &&
        overlaps(entry, other)
      ) {
        conflictEntryIds.add(entry.id)
        conflictEntryIds.add(other.id)
      }
    })
  })

  duplicateEntryIds.forEach((entryId) => {
    issues.push({
      entryId,
      severity: 'warning',
      message: 'Possible duplicate class detected.',
    })
  })
  conflictEntryIds.forEach((entryId) => {
    issues.push({
      entryId,
      severity: 'warning',
      message: 'Schedule conflict detected with another class.',
    })
  })

  return {
    issues,
    duplicateEntryIds: [...duplicateEntryIds],
    conflictEntryIds: [...conflictEntryIds],
  }
}
