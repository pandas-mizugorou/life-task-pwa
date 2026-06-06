import { Fragment, useLayoutEffect, useRef } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { Plus } from 'lucide-react'
import { cn } from '../lib/cn'
import { boardScroll } from '../lib/boardScroll'
import { STATUS_META } from '../lib/status'
import type { Status, Task } from '../lib/types'
import { TaskCard } from './TaskCard'

/** A kanban column: header (with + to add) + droppable list that shows an
 *  insertion line at the projected drop position while dragging. */
export function StatusColumn({
  status,
  tasks,
  isTarget,
  lineIndex,
  onStatusTap,
  onLabelTap,
  onAdd,
}: {
  status: Status
  tasks: Task[]
  /** True while a dragged card hovers over this column (highlight). */
  isTarget?: boolean
  /** Show an insertion line before the card at this index (= length means end). */
  lineIndex?: number | null
  onStatusTap: (t: Task) => void
  onLabelTap: (t: Task) => void
  onAdd: (status: Status) => void
}) {
  const meta = STATUS_META[status]
  const { setNodeRef, isOver } = useDroppable({ id: status })
  // Restore this column's vertical scroll across the task-detail route remount.
  // Own ref (merged with the droppable's below) so it can be mutated like Board's.
  const listRef = useRef<HTMLDivElement>(null)
  const didRestore = useRef(false)
  useLayoutEffect(() => {
    if (didRestore.current || !listRef.current) return
    listRef.current.scrollTop = boardScroll.tops.get(status) ?? 0
    didRestore.current = true
  })
  const setListRef = (el: HTMLDivElement | null) => {
    setNodeRef(el)
    listRef.current = el
  }
  const highlight = isOver || isTarget

  return (
    <section className="flex h-full w-[72vw] max-w-[16rem] shrink-0 snap-start flex-col">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: meta.dot }} aria-hidden />
        <span
          className={cn('text-sm font-bold transition-colors', highlight ? 'text-accent2' : 'text-ink')}
        >
          {meta.label}
        </span>
        <span className="rounded-full bg-panel2 px-1.5 py-0.5 text-[11px] font-semibold text-sub">
          {tasks.length}
        </span>
        <button
          onClick={() => onAdd(status)}
          className="relative ml-auto rounded-lg p-2 text-sub transition before:absolute before:-inset-1.5 before:content-[''] hover:bg-panel2 hover:text-ink"
          aria-label={`${meta.label} にタスクを追加`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <div
        ref={setListRef}
        onScroll={(e) => {
          boardScroll.tops.set(status, e.currentTarget.scrollTop)
        }}
        className={cn(
          'min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-y-contain rounded-2xl border-2 border-transparent bg-panel2/30 p-2 pb-4 transition-colors',
          highlight && 'border-accent2 bg-accent2/15',
        )}
      >
        {tasks.length === 0 && lineIndex == null && (
          <p className="px-1 pt-1.5 text-xs text-sub">タスクなし</p>
        )}
        {tasks.map((t, i) => (
          <Fragment key={t.number}>
            {lineIndex === i && <DropLine />}
            <TaskCard task={t} onStatusTap={onStatusTap} onLabelTap={onLabelTap} />
          </Fragment>
        ))}
        {lineIndex === tasks.length && <DropLine />}
      </div>
    </section>
  )
}

/** The "drop here" insertion indicator (glowing accent line). */
function DropLine() {
  return <div className="my-0.5 h-1 rounded-full bg-accent2 ring-2 ring-accent2/30" aria-hidden />
}
