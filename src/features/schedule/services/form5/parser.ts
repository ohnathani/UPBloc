import type { ScheduleDay, ScheduleEntry } from '../../types'

export type Form5ParseResult = {
  entries: ScheduleEntry[]
  warnings: string[]
}

const timeRangePattern =
  /(\d{1,2}(?::|\.)?\d{0,2}\s*(?:AM|PM)?)\s*[-–—]\s*(\d{1,2}(?::|\.)?\d{0,2}\s*(?:AM|PM)?)/i
const classRowPattern = /^\s*(\d{4,7})\b/
const coursePattern = /\b([A-Z][A-Z0-9-]{1,}(?:\s+\d+(?:-[A-Z0-9]+)?)?)\b/i
const validDayTokens = ['TH', 'M', 'T', 'W', 'F', 'S'] as const

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function parseDays(value: string) {
  const normalized = value.replace(/[^A-Z]/gi, '').toUpperCase()
  const days: ScheduleDay[] = []
  let cursor = 0

  while (cursor < normalized.length) {
    const token = validDayTokens.find((candidate) =>
      normalized.slice(cursor).startsWith(candidate),
    )
    if (!token) {
      return { days: [], suspicious: true }
    }
    const day = {
      M: 'Monday',
      T: 'Tuesday',
      W: 'Wednesday',
      TH: 'Thursday',
      F: 'Friday',
      S: 'Saturday',
    }[token] as ScheduleDay
    days.push(day)
    cursor += token.length
  }

  return { days, suspicious: false }
}

function parseClock(value: string, fallbackMeridiem?: string) {
  const suspicious = /O/i.test(value)
  const normalized = value.replace(/O/gi, '0')
  const match = normalized
    .trim()
    .match(/^(\d{1,2})(?::|\.)?(\d{2})?\s*(AM|PM)?$/i)
  if (!match) return { value: '', suspicious: true }

  let hours = Number(match[1])
  const minutes = Number(match[2] ?? '00')
  const meridiem = (match[3] ?? fallbackMeridiem)?.toUpperCase()
  if (minutes > 59) return { value: '', suspicious: true }
  if (meridiem && (hours < 1 || hours > 12))
    return { value: '', suspicious: true }
  if (!meridiem && hours > 23) return { value: '', suspicious: true }
  if (meridiem === 'AM' && hours === 12) hours = 0
  if (meridiem === 'PM' && hours !== 12) hours += 12

  return {
    value:
      String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0'),
    suspicious,
  }
}

function parseUnits(value: string) {
  const match = value.match(/(?:^|\|)\s*(\d+(?:\.\d+)?)\s*(?:\||$)/)
  return match ? Number(match[1]) : null
}

function parseRoom(value: string) {
  const match = value.match(/ROOM\s*[:/-]?\s*([A-Z0-9][A-Z0-9 ]*)/i)
  return match ? normalizeWhitespace(match[1]) : ''
}

function parseScheduleLine(line: string) {
  const timeMatch = line.match(timeRangePattern)
  if (!timeMatch || timeMatch.index === undefined) return null
  const prefix = line.slice(0, timeMatch.index)
  const dayMatch = prefix.match(/([A-Z]{1,8})\s*$/i)
  if (!dayMatch) return { warning: 'A schedule row is missing its day token.' }
  const parsedDays = parseDays(dayMatch[1])
  if (parsedDays.days.length === 0) {
    return { warning: 'An unrecognized day token needs review.' }
  }

  const endOfRange = timeMatch.index + timeMatch[0].length
  const endMeridiem = timeMatch[2].match(/(AM|PM)\s*$/i)?.[1]
  const start = parseClock(timeMatch[1], endMeridiem)
  const end = parseClock(timeMatch[2])
  if (!start.value || !end.value || start.value >= end.value) {
    return { warning: 'A schedule time is missing or invalid.' }
  }

  return {
    schedule: {
      days: parsedDays.days,
      startTime: start.value,
      endTime: end.value,
      room: parseRoom(line.slice(endOfRange)),
    },
    suspicious: parsedDays.suspicious || start.suspicious || end.suspicious,
  }
}

function extractCourseCode(firstLine: string, classCode: string) {
  const columns = firstLine.split('|').map(normalizeWhitespace)
  if (columns.length >= 2 && columns[1]) return columns[1].toUpperCase()
  const remainder = firstLine.replace(classCode, '')
  return (
    remainder.match(coursePattern)?.[1]?.replace(/\s+/g, ' ').toUpperCase() ??
    ''
  )
}

function extractSectionAndUnits(firstLine: string, courseCode: string) {
  const columns = firstLine.split('|').map(normalizeWhitespace)
  if (
    columns.length >= 4 &&
    /^[A-Z][A-Z0-9-]{0,8}$/i.test(columns[2] ?? '') &&
    /^\d+(?:\.\d+)?$/.test(columns[3] ?? '')
  ) {
    return {
      section: columns[2] ?? '',
      units: parseUnits('|' + (columns[3] ?? '') + '|'),
    }
  }

  const courseIndex = firstLine.toUpperCase().indexOf(courseCode.toUpperCase())
  const remainder =
    courseIndex >= 0 ? firstLine.slice(courseIndex + courseCode.length) : ''
  const tokens = normalizeWhitespace(remainder).split(' ').filter(Boolean)
  const section =
    tokens.find((token) => /^[A-Z][A-Z0-9-]{0,5}$/i.test(token)) ?? ''
  const unitToken = tokens.find((token) => /^\d+(?:\.\d+)?$/.test(token))
  return { section, units: unitToken ? Number(unitToken) : null }
}

function parseRow(lines: string[], index: number, warnings: string[]) {
  const firstLine = lines[0]
  const classMatch = firstLine.match(classRowPattern)
  if (!classMatch) return []
  const classCode = classMatch[1]
  const rowText = lines.join(' | ')
  const courseCode = extractCourseCode(rowText, classCode)
  const { section, units } = extractSectionAndUnits(rowText, courseCode)
  const groupId = 'form5-' + classCode + '-' + index
  const schedules: Array<{
    days: ScheduleDay[]
    startTime: string
    endTime: string
    room: string
  }> = []
  let suspicious = false

  lines.forEach((line, lineIndex) => {
    const parsed = parseScheduleLine(line)
    if (parsed?.schedule) {
      schedules.push(parsed.schedule)
      suspicious = suspicious || Boolean(parsed.suspicious)
    } else if (parsed?.warning) {
      warnings.push('Class ' + classCode + ': ' + parsed.warning)
    } else if (lineIndex > 0 && schedules.length > 0 && /^ROOM\b/i.test(line)) {
      schedules[schedules.length - 1].room = parseRoom(line)
    }
  })

  if (!courseCode)
    warnings.push('Class ' + classCode + ': course code needs review.')
  if (/[A-Z]{2,}\s+[IO]\d/i.test(courseCode))
    warnings.push(
      'Class ' + classCode + ': course code may contain an OCR error.',
    )
  if (!section) warnings.push('Class ' + classCode + ': section needs review.')
  if (units === null)
    warnings.push('Class ' + classCode + ': units need review.')
  if (schedules.length === 0)
    warnings.push('Class ' + classCode + ': no schedule was detected.')
  if (suspicious)
    warnings.push(
      'Class ' + classCode + ': please verify one or more OCR values.',
    )

  const sourceSchedules =
    schedules.length > 0
      ? schedules
      : [{ days: [], startTime: '', endTime: '', room: '' }]
  return sourceSchedules.map(
    (schedule, scheduleIndex) =>
      ({
        id: groupId + '-' + scheduleIndex,
        classCode,
        scheduleGroupId: groupId,
        courseCode,
        courseTitle: courseCode,
        section,
        instructor: '',
        room: schedule.room,
        days: schedule.days,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        units,
      }) satisfies ScheduleEntry,
  )
}

export function parseForm5ScheduleText(text: string): Form5ParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean)
  const rows: string[][] = []
  let current: string[] = []

  lines.forEach((line) => {
    if (classRowPattern.test(line)) {
      if (current.length > 0) rows.push(current)
      current = [line]
    } else if (current.length > 0) {
      current.push(line)
    }
  })
  if (current.length > 0) rows.push(current)

  const warnings: string[] = []
  const entries = rows.flatMap((row, index) => parseRow(row, index, warnings))
  if (rows.length === 0) {
    warnings.push('No Form 5 class rows were detected.')
  }
  return { entries, warnings }
}
