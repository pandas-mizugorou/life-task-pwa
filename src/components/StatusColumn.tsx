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
  onLabelTap,
  onAdd,
}: {
  status: Status
  tasks: Task[]
  /** True while a dragged card hovers over this column (highlight). */
  isTarget?: boolean
  /** Show an insertion line before the card at this index (= length means end). */
  lineIndex?: number | null
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
    const saved = boardScroll.tops.get(status) ?? 0
    if (saved === 0) {
      didRestore.current = true
      return
    }
    // Tasks can arrive a tick after mount (returning from a task detail). Don't burn
    // the one-shot on an empty list — wait until there's content to scroll, retrying
    // when `tasks` changes, then restore once.
    if (listRef.current.scrollHeight <= listRef.current.clientHeight) return
    listRef.current.scrollTop = saved
    didRestore.current = true
  }, [tasks, status])
  const setListRef = (el: HTMLDivElement | null) => {
    setNodeRef(el)
    listRef.current = el
  }
  const highlight = isOver || isTarget
  const headingId = `col-${status.replace(/\s+/g, '-')}`

  return (
    <section
      aria-labelledby={headingId}
      className="flex h-full w-[52vw] max-w-[13rem] shrink-0 snap-start flex-col lg:w-0 lg:min-w-0 lg:max-w-none lg:flex-1"
    >
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: meta.dot }} aria-hidden />
        <h2
          id={headingId}
          className={cn('text-sm font-bold transition-colors', highlight ? 'text-accent2' : 'text-ink')}
        >
          {meta.label}
        </h2>
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
          // Highlight via an inset ring (composited) + bg, not a border toggle, so a long
          // column doesn't repaint/relayout every dragOver frame.
          'min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-y-contain rounded-2xl bg-panel2/30 p-2 pb-4 transition-[background-color,box-shadow]',
          highlight && 'bg-accent2/15 shadow-[inset_0_0_0_2px_var(--color-accent2)]',
        )}
      >
        {tasks.length === 0 && lineIndex == null && (
          <p className="px-1 pt-1.5 text-xs text-sub">タスクなし</p>
        )}
        {tasks.map((t, i) => (
          <Fragment key={t.number}>
            {lineIndex === i && <DropLine />}
            <TaskCard task={t} onLabelTap={onLabelTap} />
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
