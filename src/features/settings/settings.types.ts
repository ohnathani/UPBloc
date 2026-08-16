export type ThemePreference = 'system' | 'light' | 'dark'
export type WeekStartsOn = 'sunday' | 'monday'
export type TimeFormat = '12-hour' | '24-hour'
export type CalendarView = 'week' | 'day'

export type SettingsPreferences = {
  theme: ThemePreference
  sidebarDefaultCollapsed: boolean
  weekStartsOn: WeekStartsOn
  timeFormat: TimeFormat
  defaultCalendarView: CalendarView
  confirmBeforeStopping: boolean
  showGlobalActiveTimer: boolean
}

export const defaultSettingsPreferences: SettingsPreferences = {
  theme: 'system',
  sidebarDefaultCollapsed: false,
  weekStartsOn: 'monday',
  timeFormat: '12-hour',
  defaultCalendarView: 'week',
  confirmBeforeStopping: true,
  showGlobalActiveTimer: true,
}
