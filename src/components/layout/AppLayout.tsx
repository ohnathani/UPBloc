import { useCallback, useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../features/auth/auth.hook'
import { useCalendarEvents } from '../../features/schedule/calendarEvents.context'
import { useSchedule } from '../../features/schedule/schedule.context'
import { useTasks } from '../../features/tasks/tasks.context'
import { GlobalMiniTimer } from '../../features/time-tracker/components/GlobalMiniTimer'
import { useTimeTracker } from '../../features/time-tracker/timeTracker.context'
import { useSettings } from '../../features/settings/settings.context'

const navigationSections = [
  {
    label: 'Workspace',
    items: [
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Schedule', path: '/schedule' },
      { label: 'Tasks', path: '/tasks' },
      { label: 'Time Tracker', path: '/time-tracker' },
      { label: 'Blocks', path: '/blocks' },
    ],
  },
  {
    label: 'Academics',
    items: [{ label: 'Courses', path: '/courses' }],
  },
  {
    label: 'Resources',
    items: [{ label: 'Notes', path: '/notes' }],
  },
  {
    label: 'Community',
    items: [{ label: 'Forum', path: '/forum' }],
  },
]

const settingsNavigationItem = { label: 'Settings', path: '/settings' }
const navigationItems = [
  ...navigationSections.flatMap((section) => section.items),
  settingsNavigationItem,
]

function NavigationIcon({ label }: { label: string }) {
  const commonProps = {
    'aria-hidden': true,
    fill: 'none',
    height: 18,
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 1.8,
    viewBox: '0 0 24 24',
    width: 18,
  }

  if (label === 'Dashboard') {
    return (
      <svg {...commonProps}>
        <rect height="7" rx="1" width="7" x="3" y="3" />
        <rect height="7" rx="1" width="7" x="14" y="3" />
        <rect height="7" rx="1" width="7" x="3" y="14" />
        <rect height="7" rx="1" width="7" x="14" y="14" />
      </svg>
    )
  }

  if (label === 'Schedule') {
    return (
      <svg {...commonProps}>
        <rect height="17" rx="2" width="18" x="3" y="4" />
        <path d="M16 2v4M8 2v4M3 10h18" />
        <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
      </svg>
    )
  }

  if (label === 'Courses') {
    return (
      <svg {...commonProps}>
        <path d="m3 6 9-3 9 3-9 3-9-3Z" />
        <path d="M6 8v6c0 1.7 2.7 3 6 3s6-1.3 6-3V8M21 6v7" />
      </svg>
    )
  }

  if (label === 'Tasks') {
    return (
      <svg {...commonProps}>
        <path d="m5 12 4 4L19 6" />
        <path d="M4 4h16v16H4z" />
      </svg>
    )
  }

  if (label === 'Time Tracker') {
    return (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7v5l3 2M9 3h6" />
      </svg>
    )
  }

  if (label === 'Notes') {
    return (
      <svg {...commonProps}>
        <path d="M5 3h14v18H5zM8 7h8M8 11h8M8 15h5" />
      </svg>
    )
  }

  if (label === 'Blocks') {
    return (
      <svg {...commonProps}>
        <rect height="7" rx="1" width="7" x="3" y="3" />
        <rect height="7" rx="1" width="7" x="14" y="3" />
        <rect height="7" rx="1" width="7" x="3" y="14" />
        <rect height="7" rx="1" width="7" x="14" y="14" />
      </svg>
    )
  }

  if (label === 'Settings') {
    return (
      <svg {...commonProps}>
        <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
        <path d="m19.4 15 .1.1a1.8 1.8 0 0 1-2.5 2.5l-.1-.1a1.8 1.8 0 0 0-3.1 1.3v.2a1.8 1.8 0 0 1-3.6 0v-.2a1.8 1.8 0 0 0-3.1-1.3l-.1.1a1.8 1.8 0 0 1-2.5-2.5l.1-.1a1.8 1.8 0 0 0-1.3-3.1h-.2a1.8 1.8 0 0 1 0-3.6h.2a1.8 1.8 0 0 0 1.3-3.1l-.1-.1a1.8 1.8 0 0 1 2.5-2.5l.1.1a1.8 1.8 0 0 0 3.1-1.3V1.2a1.8 1.8 0 0 1 3.6 0v.2a1.8 1.8 0 0 0 3.1 1.3l.1-.1a1.8 1.8 0 0 1 2.5 2.5l-.1.1a1.8 1.8 0 0 0 1.3 3.1h.2a1.8 1.8 0 0 1 0 3.6h-.2a1.8 1.8 0 0 0-1.3 3.1Z" />
      </svg>
    )
  }

  return (
    <svg {...commonProps}>
      <path d="M4 5h16v11H8l-4 4V5Z" />
      <path d="M8 9h8M8 12h5" />
    </svg>
  )
}

function NavigationLinks({ mobile = false }: { mobile?: boolean }) {
  return (
    <nav
      className={mobile ? 'mobile-bottom-nav' : 'sidebar-nav'}
      aria-label="Main navigation"
    >
      {navigationSections.map((section) => (
        <div className="sidebar-nav-section" key={section.label}>
          {!mobile && section.label && (
            <h2 className="sidebar-section-label">{section.label}</h2>
          )}
          {section.items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/dashboard'}
              className={({ isActive }) =>
                `${mobile ? 'mobile-nav-link' : 'sidebar-nav-link'}${
                  isActive ? ' active' : ''
                }`
              }
              title={mobile ? undefined : item.label}
              aria-label={mobile ? undefined : item.label}
            >
              {mobile && <span className="mobile-nav-dot" aria-hidden="true" />}
              {!mobile && <NavigationIcon label={item.label} />}
              <span className={mobile ? undefined : 'sidebar-nav-label'}>
                {item.label}
              </span>
            </NavLink>
          ))}
        </div>
      ))}
      {mobile && (
        <NavLink
          to={settingsNavigationItem.path}
          className={({ isActive }) =>
            `mobile-nav-link${isActive ? ' active' : ''}`
          }
        >
          <span className="mobile-nav-dot" aria-hidden="true" />
          <span>{settingsNavigationItem.label}</span>
        </NavLink>
      )}
    </nav>
  )
}

function SidebarCollapseIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="18"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      width="18"
    >
      <rect height="16" rx="2" width="18" x="3" y="4" />
      <path d="M9 4v16M14 9l-3 3 3 3" />
    </svg>
  )
}

function SidebarExpandIcon() {
  return (
    <svg
      aria-hidden="true"
      className="app-brand-expand-icon"
      fill="none"
      height="18"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      width="18"
    >
      <path d="M9 3H3v6M3 3l6 6M15 3h6v6M21 3l-6 6M9 21H3v-6M3 21l6-6M15 21h6v-6M21 21l-6-6" />
    </svg>
  )
}

export function AppLayout() {
  const location = useLocation()
  const { user } = useAuth()
  const {
    activeTimer,
    pauseTimer,
    resumeTimer,
    error: timeTrackerError,
  } = useTimeTracker()
  const { error: scheduleError } = useSchedule()
  const { error: calendarError } = useCalendarEvents()
  const { error: tasksError } = useTasks()
  const { preferences, workspaceName, settingsError } = useSettings()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    preferences.sidebarDefaultCollapsed,
  )
  const activeSection =
    navigationItems.find((item) => item.path === location.pathname)?.label ??
    'Workspace'

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((collapsed) => !collapsed)
  }, [])

  useEffect(() => {
    setSidebarCollapsed(preferences.sidebarDefaultCollapsed)
  }, [preferences.sidebarDefaultCollapsed])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      const isEditable =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.matches('input, textarea, select, [contenteditable="true"]'))

      if (
        isEditable ||
        event.isComposing ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      ) {
        return
      }

      if (event.key.toLowerCase() === 'h') {
        toggleSidebar()
        return
      }

      if (event.code === 'Space' && activeTimer) {
        event.preventDefault()
        if (activeTimer.status === 'running') pauseTimer()
        else resumeTimer()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTimer, pauseTimer, resumeTimer, toggleSidebar])

  return (
    <div
      className={`app-layout${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}
    >
      <aside className="app-sidebar">
        <div className="sidebar-header">
          <NavLink
            className="app-brand"
            to="/dashboard"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'UPBloc home'}
            title={sidebarCollapsed ? 'Expand sidebar · H' : 'UPBloc home'}
            onClick={(event) => {
              if (sidebarCollapsed) {
                event.preventDefault()
                toggleSidebar()
              }
            }}
          >
            <span className="app-brand-mark" aria-hidden="true">
              <span className="app-brand-mark-letter">U</span>
              <SidebarExpandIcon />
            </span>
            <span>
              <strong>UPBloc</strong>
              <small>{workspaceName}</small>
            </span>
          </NavLink>
          {!sidebarCollapsed && (
            <button
              aria-label="Collapse sidebar"
              className="sidebar-toggle"
              onClick={toggleSidebar}
              title="Collapse sidebar · H"
              type="button"
            >
              <SidebarCollapseIcon />
            </button>
          )}
        </div>

        <NavigationLinks />
        <div className="app-sidebar-footer">
          <NavLink
            to={settingsNavigationItem.path}
            end
            className={({ isActive }) =>
              `sidebar-nav-link${isActive ? ' active' : ''}`
            }
            title={settingsNavigationItem.label}
            aria-label={settingsNavigationItem.label}
          >
            <NavigationIcon label={settingsNavigationItem.label} />
            <span className="sidebar-nav-label">
              {settingsNavigationItem.label}
            </span>
          </NavLink>
        </div>
      </aside>

      <div className="app-content">
        <header className="app-topbar">
          <NavLink
            className="app-brand"
            to="/dashboard"
            aria-label="UPBloc home"
          >
            <span className="app-brand-mark" aria-hidden="true">
              U
            </span>
            <strong>UPBloc</strong>
          </NavLink>

          <div className="topbar-section">
            <span className="topbar-kicker">{workspaceName}</span>
            <strong>{activeSection}</strong>
          </div>

          <div className="topbar-account">
            <span className="topbar-avatar" aria-hidden="true">
              {(user?.email?.[0] ?? 'U').toUpperCase()}
            </span>
            <span className="topbar-email">{user?.email ?? 'Account'}</span>
          </div>
        </header>

        <GlobalMiniTimer />

        {(tasksError ||
          scheduleError ||
          calendarError ||
          timeTrackerError ||
          settingsError) && (
          <div className="time-tracker-toast" role="alert">
            {tasksError ||
              scheduleError ||
              calendarError ||
              timeTrackerError ||
              settingsError}
          </div>
        )}

        <Outlet />
      </div>

      <NavigationLinks mobile />
    </div>
  )
}
