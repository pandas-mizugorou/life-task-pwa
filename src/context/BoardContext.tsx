import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useToast } from '../components/ui/Toast'
import * as api from '../lib/api'
import { errMsg, haptic } from '../lib/haptics'
import { STATUS_ORDER } from '../lib/status'
import type { Label, NewTask, Status, Task } from '../lib/types'

interface BoardValue {
  loading: boolean
  error: string | null
  tasks: Task[]
  byStatus: Record<Status, Task[]>
  total: number
  labelFilter: string | null
  setLabelFilter: (v: string | null) => void
  showClosed: boolean
  setShowClosed: (v: boolean) => void
  refresh: () => Promise<void>
  setStatus: (number: number, to: Status) => Promise<void>
  addTask: (input: NewTask) => Promise<Task>
  /** Replace one task in the board cache (after a detail edit). */
  updateTaskLocal: (task: Task) => void
  /** Drop a task from the board cache (after close / remove-from-board). */
  removeTaskLocal: (number: number) => void
  labels: Label[]
  refreshLabels: () => Promise<void>
  createLabel: (name: string, color: string) => Promise<void>
  renameLabel: (name: string, patch: { newName?: string; color?: string }) => Promise<void>
  deleteLabel: (name: string) => Promise<void>
  setTaskLabels: (number: number, labels: string[]) => Promise<Task>
}

const Ctx = createContext<BoardValue | null>(null)

// eslint-disable-next-line react-refresh/only-export-components
export function useBoard(): BoardValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useBoard must be used within BoardProvider')
  return v
}

export function BoardProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [labels, setLabels] = useState<Label[]>([])
  const [labelFilter, setLabelFilter] = useState<string | null>(null)
  const [showClosed, setShowClosedState] = useState<boolean>(
    () => localStorage.getItem('ltp-show-closed') === '1',
  )
  const setShowClosed = useCallback((v: boolean) => {
    localStorage.setItem('ltp-show-closed', v ? '1' : '0')
    setShowClosedState(v)
  }, [])

  // Keep a live ref so optimistic handlers can snapshot/rollback reliably.
  const tasksRef = useRef(tasks)
  useEffect(() => {
    tasksRef.current = tasks
  }, [tasks])

  const refresh = useCallback(async () => {
    setError(null)
    try {
      const { tasks } = await api.getBoard(showClosed)
      setTasks(tasks)
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setLoading(false)
    }
  }, [showClosed])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Re-sync when the tab/app regains focus (e.g. after editing on desktop).
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    window.addEventListener('focus', onVisible)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', onVisible)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refresh])

  const setStatus = useCallback(
    async (number: number, to: Status) => {
      const prev = tasksRef.current
      setTasks((ts) => ts.map((t) => (t.number === number ? { ...t, status: to } : t)))
      haptic(12)
      try {
        const { task } = await api.setStatus(number, to)
        setTasks((ts) => ts.map((t) => (t.number === number ? task : t)))
      } catch (e) {
        setTasks(prev) // rollback
        toast({ variant: 'error', title: 'ステータス変更に失敗', description: errMsg(e) })
      }
    },
    [toast],
  )

  const setTaskLabels = useCallback(
    async (number: number, names: string[]) => {
      const prev = tasksRef.current
      const objs = names.map((n) => labels.find((l) => l.name === n) ?? { name: n, color: '8b97b8' })
      setTasks((ts) => ts.map((t) => (t.number === number ? { ...t, labels: objs } : t)))
      haptic(8)
      try {
        const { task } = await api.setTaskLabels(number, names)
        setTasks((ts) => ts.map((t) => (t.number === number ? task : t)))
        return task
      } catch (e) {
        setTasks(prev) // rollback
        toast({ variant: 'error', title: 'ラベル更新に失敗', description: errMsg(e) })
        throw e
      }
    },
    [toast, labels],
  )

  const addTask = useCallback(async (input: NewTask) => {
    const { task } = await api.addTask(input)
    setTasks((ts) => [task, ...ts])
    return task
  }, [])

  const updateTaskLocal = useCallback((task: Task) => {
    setTasks((ts) => {
      const exists = ts.some((t) => t.number === task.number)
      return exists ? ts.map((t) => (t.number === task.number ? task : t)) : [task, ...ts]
    })
  }, [])

  const removeTaskLocal = useCallback((number: number) => {
    setTasks((ts) => ts.filter((t) => t.number !== number))
  }, [])

  const refreshLabels = useCallback(async () => {
    try {
      const { labels } = await api.getLabels()
      setLabels(labels)
    } catch {
      /* labels are non-critical for rendering the board; ignore transient errors */
    }
  }, [])

  useEffect(() => {
    refreshLabels()
  }, [refreshLabels])

  const createLabel = useCallback(
    async (name: string, color: string) => {
      await api.createLabel(name, color)
      await refreshLabels()
    },
    [refreshLabels],
  )

  const renameLabel = useCallback(
    async (name: string, patch: { newName?: string; color?: string }) => {
      await api.renameLabel(name, patch)
      if (labelFilter === name && patch.newName) setLabelFilter(patch.newName)
      await Promise.all([refreshLabels(), refresh()]) // names/colors are embedded in tasks
    },
    [refreshLabels, refresh, labelFilter],
  )

  const deleteLabel = useCallback(
    async (name: string) => {
      await api.deleteLabel(name)
      if (labelFilter === name) setLabelFilter(null)
      await Promise.all([refreshLabels(), refresh()])
    },
    [refreshLabels, refresh, labelFilter],
  )

  const byStatus = useMemo(() => {
    const groups = Object.fromEntries(STATUS_ORDER.map((s) => [s, [] as Task[]])) as Record<
      Status,
      Task[]
    >
    for (const t of tasks) {
      if (!showClosed && t.state === 'CLOSED') continue // board shows active work by default
      if (labelFilter && !t.labels.some((l) => l.name === labelFilter)) continue
      groups[t.status].push(t)
    }
    return groups
  }, [tasks, labelFilter, showClosed])

  const total = useMemo(() => Object.values(byStatus).reduce((n, a) => n + a.length, 0), [byStatus])

  return (
    <Ctx.Provider
      value={{
        loading,
        error,
        tasks,
        byStatus,
        total,
        labelFilter,
        setLabelFilter,
        showClosed,
        setShowClosed,
        refresh,
        setStatus,
        addTask,
        updateTaskLocal,
        removeTaskLocal,
        labels,
        refreshLabels,
        createLabel,
        renameLabel,
        deleteLabel,
        setTaskLabels,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}
