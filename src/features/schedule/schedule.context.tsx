import {
  createContext,
  useCallback,
  useContext,
  useState,
  type PropsWithChildren,
} from 'react'
import { mockSchedule } from './data/mockSchedule'
import type { ScheduleEntry, ScheduleEntryDraft } from './types'

type ScheduleContextValue = {
  entries: ScheduleEntry[]
  importEntries: (entries: ScheduleEntry[]) => void
  saveEntry: (draft: ScheduleEntryDraft, editingId?: string) => void
  deleteEntry: (entryId: string) => void
}

const ScheduleContext = createContext<ScheduleContextValue | undefined>(
  undefined,
)

export function ScheduleProvider({ children }: PropsWithChildren) {
  const [entries, setEntries] = useState<ScheduleEntry[]>(mockSchedule)

  const importEntries = useCallback((importedEntries: ScheduleEntry[]) => {
    setEntries((current) => [
      ...current,
      ...importedEntries.map((entry, index) => ({
        ...entry,
        id: `${entry.id}-${Date.now()}-${index}`,
      })),
    ])
  }, [])

  const saveEntry = useCallback(
    (draft: ScheduleEntryDraft, editingId?: string) => {
      setEntries((current) =>
        editingId
          ? current.map((entry) =>
              entry.id === editingId ? { ...draft, id: editingId } : entry,
            )
          : [...current, { ...draft, id: `manual-${Date.now()}` }],
      )
    },
    [],
  )

  const deleteEntry = useCallback((entryId: string) => {
    setEntries((current) => current.filter((entry) => entry.id !== entryId))
  }, [])

  return (
    <ScheduleContext.Provider
      value={{ entries, importEntries, saveEntry, deleteEntry }}
    >
      {children}
    </ScheduleContext.Provider>
  )
}

// This hook intentionally lives beside its provider so the feature has one public entry point.
// eslint-disable-next-line react-refresh/only-export-components
export function useSchedule() {
  const context = useContext(ScheduleContext)

  if (!context) {
    throw new Error('useSchedule must be used inside a ScheduleProvider')
  }

  return context
}
