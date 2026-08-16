import type { ScheduleDay, ScheduleEntry, ScheduleEntryDraft } from '../types'

export type ParsedSchedule = {
  entries: ScheduleEntry[]
  warnings: string[]
}

const dayAliases: Record<string, ScheduleDay[]> = {
  M: ['Monday'],
  MON: ['Monday'],
  T: ['Tuesday'],
  TU: ['Tuesday'],
  TUE: ['Tuesday'],
  W: ['Wednesday'],
  WED: ['Wednesday'],
  TH: ['Thursday'],
  THU: ['Thursday'],
  THUR: ['Thursday'],
  F: ['Friday'],
  FRI: ['Friday'],
  S: ['Saturday'],
  SAT: ['Saturday'],
  MW: ['Monday', 'Wednesday'],
  MWF: ['Monday', 'Wednesday', 'Friday'],
  TTH: ['Tuesday', 'Thursday'],
  MWTH: ['Monday', 'Wednesday', 'Thursday'],
  MTWTHF: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
}

const courseCodePattern = /\b([A-Z]{2,8}\s*-?\s*\d{1,4}[A-Z]?)\b/i
const timeRangePattern =
  /(\d{1,2}(?::|\.)?\d{0,2}\s*(?:AM|PM)?)\s*[-\u2013\u2014]\s*(\d{1,2}(?::|\.)?\d{0,2}\s*(?:AM|PM)?)/i

function parseDays(line: string): ScheduleDay[] {
  const normalized = line.replace(/[^a-z]/gi, '').toUpperCase()
  return dayAliases[normalized] ?? []
}

function parseTime(value: string) {
  const match = value.trim().match(/^(\d{1,2})(?::|\.)?(\d{2})?\s*(AM|PM)?$/i)
  if (!match) return null

  let hours = Number(match[1])
  const minutes = Number(match[2] ?? '00')
  const meridiem = match[3]?.toUpperCase()

  if (minutes > 59) return null
  if (meridiem && (hours < 1 || hours > 12)) return null
  if (!meridiem && hours > 23) return null
  if (meridiem === 'AM' && hours === 12) hours = 0
  if (meridiem === 'PM' && hours !== 12) hours += 12

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function parseUnits(line: string) {
  const match = line.match(/(?:units?|u)\s*[-:]?\s*(\d+(?:\.\d+)?)/i)
  return match ? Number(match[1]) : null
}

function normalizeCourseCode(value: string) {
  return value
    .replace(/\s+/g, ' ')
    .replace(/\s*[-]\s*/, ' ')
    .trim()
    .toUpperCase()
}

function parseBlock(block: string, index: number): ScheduleEntry | null {
  const lines = block
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  const joined = lines.join(' ')
  const courseMatch = joined.match(courseCodePattern)
  if (!courseMatch) return null

  const courseCode = normalizeCourseCode(courseMatch[1])
  const firstLine = lines.find((line) => courseCodePattern.test(line)) ?? ''
  const titleFromFirstLine = firstLine
    .replace(courseCodePattern, '')
    .replace(/^[-:|]+/, '')
    .trim()
  const titleLine = lines.find(
    (line) =>
      line !== firstLine &&
      !/^section\b/i.test(line) &&
      !timeRangePattern.test(line) &&
      parseDays(line).length === 0 &&
      !/^(?:room|rm|units?|u)\b/i.test(line) &&
      !/\b(?:FC|AS|CAL|Admin)\s*[-]?\s*\d+/i.test(line) &&
      !/^(?:prof|professor|instructor)\b/i.test(line),
  )
  const sectionMatch = joined.match(/section\s*[-:]?\s*([A-Z0-9-]+)/i)
  const timeLine = lines.find((line) => timeRangePattern.test(line)) ?? ''
  const timeMatch = timeLine.match(timeRangePattern)
  const daysLine = lines.find(
    (line) => parseDays(line).length > 0 && !timeRangePattern.test(line),
  )
  const days = daysLine
    ? parseDays(daysLine)
    : parseDays(timeLine.split(/\d/)[0])
  const roomLine = lines.find((line) => /^(?:room|rm)\b/i.test(line))
  const room = roomLine
    ? roomLine.replace(/^(?:room|rm)\s*[-:]?\s*/i, '').trim()
    : (lines.find((line) => /\b(?:FC|AS|CAL|Admin)\s*[-]?\s*\d+/i.test(line)) ??
      '')
  const instructorLine = lines.find((line) =>
    /^(?:prof|professor|instructor)\b/i.test(line),
  )
  const instructor = instructorLine
    ? instructorLine
        .replace(/^(?:prof|professor|instructor)\s*[-:]?\s*/i, '')
        .trim()
    : ''
  const timeValues = timeMatch
    ? [parseTime(timeMatch[1]), parseTime(timeMatch[2])]
    : [null, null]
  const unitsLine = lines.find((line) =>
    /(?:units?|u)\s*[-:]?\s*\d/i.test(line),
  )
  const draft: ScheduleEntryDraft = {
    courseCode,
    courseTitle: titleFromFirstLine || titleLine || '',
    section: sectionMatch?.[1]?.toUpperCase() ?? '',
    instructor,
    room,
    days,
    startTime: timeValues[0] ?? '',
    endTime: timeValues[1] ?? '',
    units: unitsLine ? parseUnits(unitsLine) : null,
  }

  return { ...draft, id: `imported-${index}-${courseCode.replace(/\s/g, '-')}` }
}

export function parseScheduleText(text: string): ParsedSchedule {
  const blocks = text
    .trim()
    .split(/(?=\b[A-Z]{2,8}\s*-?\s*\d{1,4}[A-Z]?\b)/i)
    .map((block) => block.trim())
    .filter(Boolean)
  const entries = blocks
    .map((block, index) => parseBlock(block, index))
    .filter((entry): entry is ScheduleEntry => Boolean(entry))
  const warnings: string[] = []

  if (blocks.length > entries.length) {
    warnings.push(
      'Some text could not be matched to a class. Review the extracted rows carefully.',
    )
  }

  return { entries, warnings }
}
