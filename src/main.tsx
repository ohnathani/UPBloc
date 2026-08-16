import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import { AuthProvider } from './features/auth/auth.context'
import { CalendarEventsProvider } from './features/schedule/calendarEvents.context'
import { ScheduleProvider } from './features/schedule/schedule.context'
import { SettingsProvider } from './features/settings/settings.context'
import { TasksProvider } from './features/tasks/tasks.context'
import { TimeTrackerProvider } from './features/time-tracker/timeTracker.context'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ScheduleProvider>
          <CalendarEventsProvider>
            <TasksProvider>
              <TimeTrackerProvider>
                <SettingsProvider>
                  <App />
                </SettingsProvider>
              </TimeTrackerProvider>
            </TasksProvider>
          </CalendarEventsProvider>
        </ScheduleProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
