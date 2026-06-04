import { forwardRef } from 'react'
import { MessageSquare } from 'lucide-react'
import { cn } from '../lib/cn'
import { STATUS_META } from '../lib/status'
import type { Task } from '../lib/types'
import { LabelChip } from './LabelChip'

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  task: Task
  onStatusTap?: (t: Task) => void
  onOpen?: () => void
  dragging?: boolean
}

/** Presentational task card. Used directly inside columns and in the DragOverlay. */
export const TaskCardView = forwardRef<HTMLDivElement, Props>(function TaskCardView(
  { task, onStatusTap, onOpen, dragging, className, ...rest },
  ref,
) {
  const meta = STATUS_META[task.status]
  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          onOpen?.()
        }
      }}
      className={cn(
        'fa-card flex items-start gap-2 rounded-2xl border border-line bg-panel p-3 transition hover:border-accent/40 active:scale-[0.99]',
        dragging ? 'opacity-40' : 'cursor-pointer',
        className,
      )}
      {...rest}
    >
      <div className="min-w-0 flex-1">
        <div className="line-clamp-2 text-sm font-semibold leading-snug text-ink">{task.title}</div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {task.labels.map((l) => (
            <LabelChip key={l.name} label={l} />
          ))}
          {task.commentCount > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[11px] text-sub">
              <MessageSquare className="h-3 w-3" /> {task.commentCount}
            </span>
          )}
          <span className="text-[11px] text-sub/70">#{task.number}</span>
        </div>
      </div>
      {onStatusTap && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onStatusTap(task)
          }}
          onPointerDown={(e) => e.stopPropagation()} // let the pill be tapped without starting a drag
          className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold"
          style={{ background: meta.tint, color: meta.dot }}
          aria-label={`ステータス: ${meta.label}（タップで変更）`}
        >
          {meta.label}
        </button>
      )}
    </div>
  )
})
