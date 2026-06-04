import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useToast } from '../components/ui/Toast'
import * as api from '../lib/api'
import { errMsg, haptic } from '../lib/haptics'
import { STATUS_ORDER } from '../lib/status'
import type { NewTask, Status, Task } from '../lib/types'

interface BoardValue {
  loading: boolean
  error: string | null
  tasks: Task[]
  byStatus: Record<Status, Task[]>
  total: number
  labelFilter: string | null
  setLabelFilter: (v: string | null) => void
  refresh: () => Promise<void>
  setStatus: (number: number, to: Status) => Promise<void>
  addTask: (input: NewTask) => Promise<Task>
  /** Replace one task in the board cache (after a detail edit). */
  updateTaskLocal: (task: Task) => void
  /** Drop a task from the board cache (after close / remove-from-board). */
  removeTaskLocal: (number: number) => void
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
  const [labelFilter, setLabelFilter] = useState<string | null>(null)

  // Keep a live ref so optimistic handlers can snapshot/rollback reliably.
  const tasksRef = useRef(tasks)
  useEffect(() => {
    tasksRef.current = tasks
  }, [tasks])

  const refresh = useCallback(async () => {
    setError(null)
    try {
      const { tasks } = await api.getBoard()
      setTasks(tasks)
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setLoading(false)
    }
  }, [])

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

  const byStatus = useMemo(() => {
    const groups = Object.fromEntries(STATUS_ORDER.map((s) => [s, [] as Task[]])) as Record<
      Status,
      Task[]
    >
    for (const t of tasks) {
      if (t.state === 'CLOSED') continue // the board shows active work only
      if (labelFilter && !t.labels.some((l) => l.name === labelFilter)) continue
      groups[t.status].push(t)
    }
    return groups
  }, [tasks, labelFilter])

  const total = useMemo(
    () =>
      tasks.filter(
        (t) => t.state === 'OPEN' && (!labelFilter || t.labels.some((l) => l.name === labelFilter)),
      ).length,
    [tasks, labelFilter],
  )

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
        refresh,
        setStatus,
        addTask,
        updateTaskLocal,
        removeTaskLocal,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}
