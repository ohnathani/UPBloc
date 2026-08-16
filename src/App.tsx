import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { ProtectedRoute } from './features/auth/ProtectedRoute'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { RegisterPage } from './pages/RegisterPage'
import { SchedulePage } from './pages/SchedulePage'
import { SettingsPage } from './pages/SettingsPage'
import { TasksPage } from './pages/TasksPage'
import { TimeTrackerPage } from './pages/TimeTrackerPage'

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/schedule" element={<SchedulePage />} />
        <Route
          path="/courses"
          element={
            <PlaceholderPage
              title="Courses"
              description="Keep your courses and learning materials organized."
            />
          }
        />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/time-tracker" element={<TimeTrackerPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route
          path="/notes"
          element={
            <PlaceholderPage
              title="Notes"
              description="Capture and revisit your study notes when you need them."
            />
          }
        />
        <Route
          path="/blocks"
          element={
            <PlaceholderPage
              title="Blocks"
              description="Build focused study blocks around the way you work best."
            />
          }
        />
        <Route
          path="/forum"
          element={
            <PlaceholderPage
              title="Forum"
              description="Connect with your learning community and share ideas."
            />
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
