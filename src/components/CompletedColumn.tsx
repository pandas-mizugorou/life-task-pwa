import { useLayoutEffect, useRef } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { boardScroll } from '../lib/boardScroll'
import type { Task } from '../lib/types'
import { TaskCardView } from './TaskCardView'

const COMPLETED_KEY = '__completed__'

/** Read-only archive column of completed (closed) tasks. Tap a card to open it
 *  (where it can be reopened with 未完了に戻す). Not a drag/drop target. */
export function CompletedColumn({ tasks }: { tasks: Task[] }) {
  const navigate = useNavigate()
  // Remember this column's vertical scroll across the task-detail route remount.
  const listRef = useRef<HTMLDivElement>(null)
  const didRestore = useRef(false)
  useLayoutEffect(() => {
    if (didRestore.current || !listRef.current) return
    const saved = boardScroll.tops.get(COMPLETED_KEY) ?? 0
    if (saved === 0) {
      didRestore.current = true
      return
    }
    // Wait for content (tasks may arrive after mount) before consuming the one-shot.
    if (listRef.current.scrollHeight <= listRef.current.clientHeight) return
    listRef.current.scrollTop = saved
    didRestore.current = true
  }, [tasks])
  return (
    <section className="flex h-full w-[72vw] max-w-[16rem] shrink-0 snap-start flex-col">
      <div className="mb-2 flex items-center gap-2 px-1">
        <CheckCircle2 className="h-3.5 w-3.5 text-accent2" />
        <span className="text-sm font-bold text-ink">完了済み</span>
        <span className="rounded-full bg-panel2 px-1.5 py-0.5 text-[11px] font-semibold text-sub">
          {tasks.length}
        </span>
      </div>
      <div
        ref={listRef}
        onScroll={(e) => {
          boardScroll.tops.set(COMPLETED_KEY, e.currentTarget.scrollTop)
        }}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-y-contain rounded-2xl bg-panel2/30 p-2 pb-4"
      >
        {tasks.length ? (
          tasks.map((t) => (
            <TaskCardView
              key={t.number}
              task={t}
              completed
              onOpen={() => navigate(`/t/${t.number}`)}
              className="opacity-75"
            />
          ))
        ) : (
          <p className="px-1 pt-1.5 text-xs text-sub">完了タスクなし</p>
        )}
      </div>
    </section>
  )
}
