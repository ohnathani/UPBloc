import type { ActiveTimer } from './types'

export function getElapsedSeconds(timer: ActiveTimer, now = Date.now()) {
  if (timer.status === 'paused' || !timer.lastResumedAt) {
    return timer.accumulatedSeconds
  }
  return (
    timer.accumulatedSeconds +
    Math.max(0, now - new Date(timer.lastResumedAt).getTime()) / 1000
  )
}
