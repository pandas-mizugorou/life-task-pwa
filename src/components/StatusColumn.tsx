import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { cn } from '../lib/cn'
import { STATUS_META } from '../lib/status'
import type { Status, Task } from '../lib/types'
import { TaskCard } from './TaskCard'

/** A kanban column: header (with + to add into this status) + droppable scrolling list. */
export function StatusColumn({
  status,
  tasks,
  onStatusTap,
  onLabelTap,
  onAdd,
}: {
  status: Status
  tasks: Task[]
  onStatusTap: (t: Task) => void
  onLabelTap: (t: Task) => void
  onAdd: (status: Status) => void
}) {
  const meta = STATUS_META[status]
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <section className="flex h-full w-[72vw] max-w-[16rem] shrink-0 snap-start flex-col">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: meta.dot }} aria-hidden />
        <span className="text-sm font-bold text-ink">{meta.label}</span>
        <span className="rounded-full bg-panel2 px-1.5 py-0.5 text-[11px] font-semibold text-sub">
          {tasks.length}
        </span>
        <button
          onClick={() => onAdd(status)}
          className="ml-auto rounded-lg p-1 text-sub transition hover:bg-panel2 hover:text-ink"
          aria-label={`${meta.label} にタスクを追加`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-y-contain rounded-2xl border-2 border-transparent bg-panel2/30 p-2 pb-4 transition-colors',
          isOver && 'border-accent2/50 bg-accent2/10',
        )}
      >
        <SortableContext
          items={tasks.map((t) => `task-${t.number}`)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.length ? (
            tasks.map((t) => (
              <TaskCard key={t.number} task={t} onStatusTap={onStatusTap} onLabelTap={onLabelTap} />
            ))
          ) : (
            <p className="px-1 pt-1.5 text-xs text-sub/50">なし</p>
          )}
        </SortableContext>
      </div>
    </section>
  )
}
