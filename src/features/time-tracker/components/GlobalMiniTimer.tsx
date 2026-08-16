import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTimeTracker } from '../timeTracker.context'
import { getElapsedSeconds } from '../timeTracker.utils'
import { useSettings } from '../../settings/settings.context'

function formatClock(seconds: number) {
  const total = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const remaining = total % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`
}

export function GlobalMiniTimer() {
  const { activeTimer, pauseTimer, resumeTimer } = useTimeTracker()
  const { preferences } = useSettings()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!activeTimer || activeTimer.status !== 'running') return
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [activeTimer])

  if (!activeTimer || !preferences.showGlobalActiveTimer) return null

  const seconds = getElapsedSeconds(activeTimer, now)
  const isPaused = activeTimer.status === 'paused'

  return (
    <div className="global-mini-timer" role="status" aria-live="polite">
      <span className="global-mini-timer-dot" aria-hidden="true" />
      <Link to="/time-tracker" className="global-mini-timer-main">
        <strong>{activeTimer.projectName}</strong>
        <span>
          {formatClock(seconds)}
          {isPaused ? ' · Paused' : ''}
        </span>
      </Link>
      <button
        type="button"
        className="button-secondary global-mini-timer-control"
        onClick={isPaused ? resumeTimer : pauseTimer}
      >
        {isPaused ? 'Resume' : 'Pause'}
      </button>
      <Link className="global-mini-timer-link" to="/time-tracker">
        Open
      </Link>
    </div>
  )
}
