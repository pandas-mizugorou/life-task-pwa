import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useToast } from '../components/ui/Toast'
import * as api from '../lib/api'
import { errMsg, haptic } from '../lib/haptics'
import { ACTIVE_STATUSES, STATUS_ORDER } from '../lib/status'
import { sortCompleted } from '../lib/completed'
import type { Label, NewTask, Status, Task } from '../lib/types'

const LABEL_ORDER_KEY = 'ltp-label-order'

function readLabelOrder(): string[] {
  try {
    const raw = localStorage.getItem(LABEL_ORDER_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr.filter((n): n is string => typeof n === 'string') : []
  } catch {
    return []
  }
}

function writeLabelOrder(names: string[]) {
  localStorage.setItem(LABEL_ORDER_KEY, JSON.stringify(names))
}

// Apply the user's saved label order. Labels missing from it (e.g. freshly created)
// fall to the end, keeping GitHub's alphabetical order. GitHub has no label-order
// concept, so this preference lives only on this device.
function sortLabelsByOrder(labels: Label[], order: string[]): Label[] {
  if (order.length === 0) return labels
  const pos = new Map(order.map((n, i) => [n, i]))
  return labels.slice().sort((a, b) => {
    const ai = pos.get(a.name) ?? Infinity
    const bi = pos.get(b.name) ?? Infinity
    return ai !== bi ? ai - bi : a.name.localeCompare(b.name)
  })
}

interface BoardValue {
  loading: boolean
  error: string | null
  tasks: Task[]
  byStatus: Record<Status, Task[]>
  total: number
  /** True when the board hit the server-side page cap (not all items loaded). */
  truncated: boolean
  labelFilter: string | null
  setLabelFilter: (v: string | null) => void
  showClosed: boolean
  setShowClosed: (v: boolean) => void
  /** True while the first fetch after enabling 完了表示 is in flight (closed column loading). */
  closedLoading: boolean
  /** Re-fetch the board. Pass `{ background: true }` for the silent focus/visibility
   *  re-sync (no error toast); explicit refreshes surface failures. */
  refresh: (opts?: { background?: boolean }) => Promise<void>
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
  /** Persist a custom display order for labels (client-side; GitHub has no label order). */
  reorderLabels: (names: string[]) => void
  setTaskLabels: (number: number, labels: string[]) => Promise<Task>
  /** Closed (completed) tasks, for the 完了済み archive column (populated when showClosed). */
  completed: Task[]
  /** Close (= complete) or reopen a task. */
  setTaskState: (number: number, state: 'open' | 'closed') => Promise<Task>
  /** Apply an optimistic move (reorder + optional status change) and persist it. */
  moveTask: (
    newTasks: Task[],
    number: number,
    itemId: string,
    afterItemId: string | null,
    newStatus: Status | null,
  ) => Promise<void>
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
  const [truncated, setTruncated] = useState(false)
  const [labels, setLabels] = useState<Label[]>([])
  const [labelFilter, setLabelFilter] = useState<string | null>(null)
  const [showClosed, setShowClosedState] = useState<boolean>(
    () => localStorage.getItem('ltp-show-closed') === '1',
  )
  // True while the refresh triggered by enabling 完了表示 is fetching, so the
  // completed column can show a loading state instead of popping in late.
  const [closedLoading, setClosedLoading] = useState(false)
  const setShowClosed = useCallback((v: boolean) => {
    localStorage.setItem('ltp-show-closed', v ? '1' : '0')
    if (v) setClosedLoading(true)
    setShowClosedState(v)
  }, [])

  // Keep a live ref so optimistic handlers can snapshot/rollback reliably.
  const tasksRef = useRef(tasks)
  useEffect(() => {
    tasksRef.current = tasks
  }, [tasks])

  // Count of optimistic mutations in flight. While > 0 the focus/visibility
  // auto-refresh is suppressed so it can't overwrite an in-progress optimistic
  // update with stale server state (each op reconciles its own task on success).
  const pendingRef = useRef(0)

  // Surgical rollback: restore a single task to its pre-op snapshot without
  // clobbering other tasks a concurrent op may have changed in the meantime.
  const restoreTask = useCallback((number: number, prev: Task | undefined) => {
    if (!prev) return
    setTasks((ts) => ts.map((t) => (t.number === number ? prev : t)))
  }, [])

  const refresh = useCallback(
    async (opts?: { background?: boolean }) => {
      setError(null)
      try {
        const { tasks, truncated } = await api.getBoard(showClosed)
        setTasks(tasks)
        setTruncated(!!truncated)
      } catch (e) {
        setError(errMsg(e))
        // The board only renders the full ErrorState when empty; with cards already on
        // screen a failed refresh would be invisible (stale data, no signal). Surface it
        // — except for the silent focus/visibility re-sync, which would spam while offline.
        if (!opts?.background && tasksRef.current.length > 0) {
          toast({ variant: 'error', title: '最新の取得に失敗しました', description: errMsg(e) })
        }
      } finally {
        setLoading(false)
        setClosedLoading(false)
      }
    },
    [showClosed, toast],
  )

  useEffect(() => {
    refresh({ background: true })
  }, [refresh])

  // Re-sync when the tab/app regains focus (e.g. after editing on desktop).
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      if (pendingRef.current > 0) return // don't clobber an in-flight optimistic update
      refresh({ background: true })
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
      const prevTask = tasksRef.current.find((t) => t.number === number)
      pendingRef.current++
      setTasks((ts) => ts.map((t) => (t.number === number ? { ...t, status: to } : t)))
      haptic(12)
      try {
        const { task } = await api.setStatus(number, to)
        setTasks((ts) => ts.map((t) => (t.number === number ? task : t)))
      } catch (e) {
        restoreTask(number, prevTask) // surgical rollback
        toast({ variant: 'error', title: 'ステータス変更に失敗しました', description: errMsg(e) })
      } finally {
        pendingRef.current--
      }
    },
    [toast, restoreTask],
  )

  const setTaskLabels = useCallback(
    async (number: number, names: string[]) => {
      const prevTask = tasksRef.current.find((t) => t.number === number)
      const objs = names.map((n) => labels.find((l) => l.name === n) ?? { name: n, color: '8b97b8' })
      pendingRef.current++
      setTasks((ts) => ts.map((t) => (t.number === number ? { ...t, labels: objs } : t)))
      haptic(8)
      try {
        const { task } = await api.setTaskLabels(number, names)
        setTasks((ts) => ts.map((t) => (t.number === number ? task : t)))
        return task
      } catch (e) {
        restoreTask(number, prevTask) // surgical rollback
        toast({ variant: 'error', title: 'ラベル更新に失敗しました', description: errMsg(e) })
        throw e
      } finally {
        pendingRef.current--
      }
    },
    [toast, labels, restoreTask],
  )

  const setTaskState = useCallback(
    async (number: number, state: 'open' | 'closed') => {
      const prevTask = tasksRef.current.find((t) => t.number === number)
      pendingRef.current++
      setTasks((ts) =>
        ts.map((t) =>
          t.number === number
            ? {
                ...t,
                state: state === 'closed' ? 'CLOSED' : 'OPEN',
                // 完了済み列は closedAt 降順。楽観時に仮の時刻を入れておくと、
                // サーバ応答を待たずに即座に列の先頭へ入る（応答で正確な値に上書き）。
                closedAt: state === 'closed' ? new Date().toISOString() : null,
              }
            : t,
        ),
      )
      haptic(12)
      try {
        const { task } = await api.patchTask(number, { state })
        setTasks((ts) => ts.map((t) => (t.number === number ? task : t)))
        return task
      } catch (e) {
        restoreTask(number, prevTask) // surgical rollback
        toast({
          variant: 'error',
          title: '状態の変更に失敗しました',
          description: errMsg(e),
        })
        throw e
      } finally {
        pendingRef.current--
      }
    },
    [toast, restoreTask],
  )

  const moveTask = useCallback(
    async (
      newTasks: Task[],
      number: number,
      itemId: string,
      afterItemId: string | null,
      newStatus: Status | null,
    ) => {
      const prev = tasksRef.current
      pendingRef.current++
      setTasks(newTasks) // optimistic (reorder + status)
      haptic(10)
      try {
        let effectiveItemId = itemId
        if (newStatus) {
          // setStatus adds the issue to the board on demand, which can mint a fresh
          // itemId. Use that (and reconcile the cache) for the reorder instead of the
          // possibly-empty itemId captured at drag start.
          const { task } = await api.setStatus(number, newStatus)
          if (task.itemId) {
            effectiveItemId = task.itemId
            setTasks((ts) =>
              ts.map((t) =>
                t.number === number ? { ...t, itemId: task.itemId, status: task.status } : t,
              ),
            )
          }
        }
        // Without a valid itemId the card isn't on the board, so there's nothing to
        // reorder; the status change (if any) has already been applied.
        if (effectiveItemId) await api.reorderTask(number, effectiveItemId, afterItemId)
      } catch (e) {
        setTasks(prev) // rollback (restores the full prior order)
        toast({ variant: 'error', title: '移動に失敗しました', description: errMsg(e) })
      } finally {
        pendingRef.current--
      }
    },
    [toast],
  )

  const addTask = useCallback(async (input: NewTask) => {
    // Guard against the focus/visibility re-sync overwriting the new card before the
    // server round-trip settles (same pattern as the other mutations).
    pendingRef.current++
    try {
      const { task } = await api.addTask(input)
      setTasks((ts) => [task, ...ts])
      return task
    } finally {
      pendingRef.current--
    }
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
      setLabels(sortLabelsByOrder(labels, readLabelOrder()))
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
      if (patch.newName && patch.newName !== name) {
        const order = readLabelOrder() // keep the saved order pointing at the renamed label
        const idx = order.indexOf(name)
        if (idx >= 0) {
          order[idx] = patch.newName
          writeLabelOrder(order)
        }
        if (labelFilter === name) setLabelFilter(patch.newName)
      }
      await Promise.all([refreshLabels(), refresh()]) // names/colors are embedded in tasks
    },
    [refreshLabels, refresh, labelFilter],
  )

  const deleteLabel = useCallback(
    async (name: string) => {
      await api.deleteLabel(name)
      const order = readLabelOrder()
      if (order.includes(name)) writeLabelOrder(order.filter((n) => n !== name)) // prune stale entry
      if (labelFilter === name) setLabelFilter(null)
      await Promise.all([refreshLabels(), refresh()])
    },
    [refreshLabels, refresh, labelFilter],
  )

  const reorderLabels = useCallback((names: string[]) => {
    writeLabelOrder(names)
    setLabels((prev) => sortLabelsByOrder(prev, names))
    haptic(10)
  }, [])

  const byStatus = useMemo(() => {
    const groups = Object.fromEntries(STATUS_ORDER.map((s) => [s, [] as Task[]])) as Record<
      Status,
      Task[]
    >
    for (const t of tasks) {
      if (t.state === 'CLOSED') continue // closed = completed → shown in 完了済み column, not here
      if (labelFilter && !t.labels.some((l) => l.name === labelFilter)) continue
      const inActive = ACTIVE_STATUSES.includes(t.status)
      const col: Status = inActive ? t.status : 'Todo' // open+Done/unknown → Todo
      // Normalize the card's status to its display column, so the pill matches the
      // column and a same-column reorder can't silently rewrite a legacy "Done".
      groups[col].push(inActive ? t : { ...t, status: col })
    }
    return groups
  }, [tasks, labelFilter])

  const total = useMemo(() => Object.values(byStatus).reduce((n, a) => n + a.length, 0), [byStatus])

  const completed = useMemo(
    () =>
      sortCompleted(
        tasks.filter(
          (t) =>
            t.state === 'CLOSED' && (!labelFilter || t.labels.some((l) => l.name === labelFilter)),
        ),
      ),
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
        truncated,
        labelFilter,
        setLabelFilter,
        showClosed,
        setShowClosed,
        closedLoading,
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
        reorderLabels,
        setTaskLabels,
        completed,
        setTaskState,
        moveTask,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}
