import { STATUS_META } from '../lib/status'
import type { Status, Task } from '../lib/types'
import { TaskCard } from './TaskCard'

/** A single kanban column: fixed header + vertically-scrolling task list. */
export function StatusColumn({
  status,
  tasks,
  onStatusTap,
}: {
  status: Status
  tasks: Task[]
  onStatusTap: (t: Task) => void
}) {
  const meta = STATUS_META[status]
  return (
    <section className="flex h-full w-[80vw] max-w-[18rem] shrink-0 snap-start flex-col">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: meta.dot }} aria-hidden />
        <span className="font-bold text-ink">{meta.label}</span>
        <span className="rounded-full bg-panel2 px-2 py-0.5 text-xs font-semibold text-sub">
          {tasks.length}
        </span>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-y-contain rounded-2xl bg-panel2/30 p-2 pb-24">
        {tasks.length ? (
          tasks.map((t) => <TaskCard key={t.number} task={t} onStatusTap={onStatusTap} />)
        ) : (
          <p className="px-1 pt-1.5 text-xs text-sub/50">なし</p>
        )}
      </div>
    </section>
  )
}
