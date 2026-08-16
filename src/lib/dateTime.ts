import type { TimeFormat } from '../features/settings/settings.types'

export function formatTime(value: number, timeFormat: TimeFormat = '12-hour') {
  const date = new Date()
  date.setHours(Math.floor(value / 60), value % 60, 0, 0)
  return new Intl.DateTimeFormat(undefined, {
    hour: timeFormat === '24-hour' ? '2-digit' : 'numeric',
    minute: '2-digit',
    hour12: timeFormat === '12-hour',
  }).format(date)
}

export function formatDateTime(value: Date | string, timeFormat: TimeFormat) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
    hour12: timeFormat === '12-hour',
  }).format(typeof value === 'string' ? new Date(value) : value)
}
