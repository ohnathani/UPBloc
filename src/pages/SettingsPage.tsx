import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/auth.hook'
import { useSettings } from '../features/settings/settings.context'
import type {
  CalendarView,
  SettingsPreferences,
  ThemePreference,
  TimeFormat,
  WeekStartsOn,
} from '../features/settings/settings.types'

type SettingsSection =
  'workspace' | 'appearance' | 'schedule' | 'time-tracking' | 'account'

const sections: { id: SettingsSection; label: string; description: string }[] =
  [
    { id: 'workspace', label: 'Workspace', description: 'Name and identity' },
    { id: 'appearance', label: 'Appearance', description: 'Theme and layout' },
    { id: 'schedule', label: 'Schedule', description: 'Calendar preferences' },
    {
      id: 'time-tracking',
      label: 'Time Tracking',
      description: 'Timer behavior',
    },
    { id: 'account', label: 'Account', description: 'Profile and access' },
  ]

function PreferenceSelect<K extends keyof SettingsPreferences>({
  id,
  label,
  description,
  value,
  options,
  onChange,
}: {
  id: string
  label: string
  description: string
  value: SettingsPreferences[K]
  options: { value: SettingsPreferences[K]; label: string }[]
  onChange: (value: SettingsPreferences[K]) => void
}) {
  return (
    <div className="settings-row">
      <div>
        <label htmlFor={id}>{label}</label>
        <p>{description}</p>
      </div>
      <select
        id={id}
        value={String(value)}
        onChange={(event) =>
          onChange(event.target.value as SettingsPreferences[K])
        }
      >
        {options.map((option) => (
          <option key={String(option.value)} value={String(option.value)}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function ToggleSetting({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="settings-row">
      <div>
        <label htmlFor={id}>{label}</label>
        <p>{description}</p>
      </div>
      <label className="settings-switch">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span aria-hidden="true">{checked ? 'On' : 'Off'}</span>
      </label>
    </div>
  )
}

function SettingsSectionFrame({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section
      className="settings-section-panel"
      aria-labelledby={`${title}-settings-title`}
    >
      <div className="settings-section-heading">
        <p className="eyebrow">Settings</p>
        <h2 id={`${title}-settings-title`}>{title}</h2>
        <p className="muted">{description}</p>
      </div>
      <div className="settings-controls">{children}</div>
    </section>
  )
}

function WorkspaceSettings({ notify }: { notify: (message: string) => void }) {
  const { workspaceName, updateWorkspaceName } = useSettings()
  const [name, setName] = useState(workspaceName)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Workspace name cannot be empty.')
      return
    }
    if (trimmed.length > 80) {
      setError('Workspace name must be 80 characters or fewer.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await updateWorkspaceName(trimmed)
      setName(trimmed)
      notify('Workspace name updated.')
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to save workspace name. Please try again.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <SettingsSectionFrame
      title="Workspace"
      description="Manage the name used to identify your workspace."
    >
      <form className="settings-form" onSubmit={handleSubmit}>
        <div className="settings-field">
          <label htmlFor="workspace-name">Workspace Name</label>
          <p>Choose a name for your workspace.</p>
          <input
            id="workspace-name"
            value={name}
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
          />
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </SettingsSectionFrame>
  )
}

function AppearanceSettings() {
  const { preferences, setPreference } = useSettings()
  return (
    <SettingsSectionFrame
      title="Appearance"
      description="Choose how UPBloc looks and how the sidebar behaves when you start the app."
    >
      <PreferenceSelect<'theme'>
        id="theme"
        label="Theme"
        description="Choose how UPBloc appears."
        value={preferences.theme}
        options={[
          { value: 'system', label: 'System' },
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
        ]}
        onChange={(value: ThemePreference) => setPreference('theme', value)}
      />
      <PreferenceSelect<'sidebarDefaultCollapsed'>
        id="sidebar-default"
        label="Sidebar on startup"
        description="Choose the default sidebar state. Press H any time to toggle it."
        value={preferences.sidebarDefaultCollapsed}
        options={[
          { value: false, label: 'Expanded' },
          { value: true, label: 'Minimized' },
        ]}
        onChange={(value: boolean) =>
          setPreference('sidebarDefaultCollapsed', value)
        }
      />
    </SettingsSectionFrame>
  )
}

function ScheduleSettings() {
  const { preferences, setPreference } = useSettings()
  return (
    <SettingsSectionFrame
      title="Schedule"
      description="Set the calendar conventions that work best for you."
    >
      <PreferenceSelect<'weekStartsOn'>
        id="week-starts-on"
        label="Week starts on"
        description="Choose the first day shown in the calendar."
        value={preferences.weekStartsOn}
        options={[
          { value: 'monday', label: 'Monday' },
          { value: 'sunday', label: 'Sunday' },
        ]}
        onChange={(value: WeekStartsOn) => setPreference('weekStartsOn', value)}
      />
      <PreferenceSelect<'timeFormat'>
        id="time-format"
        label="Time format"
        description="Choose how times appear in your schedule."
        value={preferences.timeFormat}
        options={[
          { value: '12-hour', label: '12-hour' },
          { value: '24-hour', label: '24-hour' },
        ]}
        onChange={(value: TimeFormat) => setPreference('timeFormat', value)}
      />
      <PreferenceSelect<'defaultCalendarView'>
        id="default-calendar-view"
        label="Default calendar view"
        description="Choose the view opened when you visit Schedule."
        value={preferences.defaultCalendarView}
        options={[
          { value: 'week', label: 'Week' },
          { value: 'day', label: 'Day' },
        ]}
        onChange={(value: CalendarView) =>
          setPreference('defaultCalendarView', value)
        }
      />
    </SettingsSectionFrame>
  )
}

function TimeTrackingSettings() {
  const { preferences, setPreference } = useSettings()
  return (
    <SettingsSectionFrame
      title="Time Tracking"
      description="Control how active sessions are finished and surfaced across UPBloc."
    >
      <ToggleSetting
        id="confirm-stop"
        label="Confirm before stopping timer"
        description="Open the finish and review form before saving a session."
        checked={preferences.confirmBeforeStopping}
        onChange={(value) => setPreference('confirmBeforeStopping', value)}
      />
      <ToggleSetting
        id="show-global-timer"
        label="Show global active timer"
        description="Keep a compact timer visible while navigating around UPBloc."
        checked={preferences.showGlobalActiveTimer}
        onChange={(value) => setPreference('showGlobalActiveTimer', value)}
      />
    </SettingsSectionFrame>
  )
}

function AccountSettings({ notify }: { notify: (message: string) => void }) {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { displayName, updateDisplayName } = useSettings()
  const [name, setName] = useState(displayName)
  const [saving, setSaving] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function saveName(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await updateDisplayName(name)
      notify('Display name updated.')
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to update display name. Please try again.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleSignOut() {
    setError(null)
    setSigningOut(true)
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch (signOutError) {
      setError(
        signOutError instanceof Error
          ? signOutError.message
          : 'Unable to sign out. Please try again.',
      )
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <SettingsSectionFrame
      title="Account"
      description="Manage the profile details associated with your UPBloc account."
    >
      <form className="settings-form" onSubmit={saveName}>
        <div className="settings-field">
          <label htmlFor="display-name">Profile / Display Name</label>
          <p>This name can be used to personalize your workspace later.</p>
          <input
            id="display-name"
            value={name}
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
            placeholder="Add a display name"
          />
        </div>
        <button type="submit" className="button-secondary" disabled={saving}>
          {saving ? 'Saving…' : 'Save Display Name'}
        </button>
      </form>
      <div className="settings-account-row">
        <div>
          <label htmlFor="account-email">Email</label>
          <p>Your authenticated email address.</p>
        </div>
        <output id="account-email" className="settings-value">
          {user?.email ?? 'No authenticated user'}
        </output>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="settings-account-actions">
        <button
          type="button"
          className="button-quiet button-danger"
          onClick={handleSignOut}
          disabled={signingOut}
        >
          {signingOut ? 'Signing out...' : 'Sign Out'}
        </button>
      </div>
    </SettingsSectionFrame>
  )
}

export function SettingsPage() {
  const { settingsLoading } = useSettings()
  const [activeSection, setActiveSection] =
    useState<SettingsSection>('workspace')
  const [notice, setNotice] = useState<string | null>(null)

  function notify(message: string) {
    setNotice(message)
    window.setTimeout(() => setNotice(null), 3000)
  }

  if (settingsLoading) {
    return (
      <main className="page-shell app-page-shell settings-page">
        <p className="status-message">Loading settings…</p>
      </main>
    )
  }

  return (
    <main className="page-shell app-page-shell settings-page">
      <div className="settings-page-inner">
        <header className="settings-page-header">
          <h1>Settings</h1>
          <p className="muted">
            Shape your workspace around the way you study and work.
          </p>
        </header>
        <div className="settings-layout">
          <nav className="settings-navigation" aria-label="Settings sections">
            <label className="settings-mobile-label" htmlFor="settings-section">
              Section
            </label>
            <select
              id="settings-section"
              className="settings-mobile-select"
              value={activeSection}
              onChange={(event) =>
                setActiveSection(event.target.value as SettingsSection)
              }
            >
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.label}
                </option>
              ))}
            </select>
            <div className="settings-desktop-navigation">
              {sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  className={activeSection === section.id ? 'active' : ''}
                  onClick={() => setActiveSection(section.id)}
                  aria-current={
                    activeSection === section.id ? 'page' : undefined
                  }
                >
                  <strong>{section.label}</strong>
                  <span>{section.description}</span>
                </button>
              ))}
            </div>
          </nav>
          <div className="settings-content">
            {activeSection === 'workspace' && (
              <WorkspaceSettings notify={notify} />
            )}
            {activeSection === 'appearance' && <AppearanceSettings />}
            {activeSection === 'schedule' && <ScheduleSettings />}
            {activeSection === 'time-tracking' && <TimeTrackingSettings />}
            {activeSection === 'account' && <AccountSettings notify={notify} />}
          </div>
        </div>
      </div>
      {notice && (
        <div className="settings-notice" role="status">
          {notice}
        </div>
      )}
    </main>
  )
}
