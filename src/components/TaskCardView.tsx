import { forwardRef } from 'react'
import { CheckCircle2, MessageSquare, Tag } from 'lucide-react'
import { cn } from '../lib/cn'
import { STATUS_META } from '../lib/status'
import type { Task } from '../lib/types'
import { LabelChip } from './LabelChip'

/** Max labels shown on a card before collapsing the rest into a "+N" chip. */
const MAX_LABELS = 3

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  task: Task
  onStatusTap?: (t: Task) => void
  onLabelTap?: (t: Task) => void
  onOpen?: () => void
  dragging?: boolean
  /** Render a "完了" badge (used by the archive column; gives SR/low-vision a text cue). */
  completed?: boolean
}

/** Presentational task card. Used directly inside columns and in the DragOverlay. */
export const TaskCardView = forwardRef<HTMLDivElement, Props>(function TaskCardView(
  { task, onStatusTap, onLabelTap, onOpen, dragging, completed, className, ...rest },
  ref,
) {
  const meta = STATUS_META[task.status]
  const hiddenLabels = task.labels.length - MAX_LABELS
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
        // select-none + no iOS touch-callout: stops the long-press from triggering text
        // selection / the callout magnifier, which otherwise steals the drag pickup.
        'fa-card flex select-none items-start gap-2 rounded-2xl border border-line bg-panel p-3 transition [-webkit-touch-callout:none] hover:border-accent/40 active:scale-[0.99]',
        dragging ? 'opacity-40' : 'cursor-pointer',
        className,
      )}
      {...rest}
    >
      <div className="min-w-0 flex-1">
        <div className="line-clamp-2 text-sm font-semibold leading-snug text-ink">{task.title}</div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {completed && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-good/15 px-1.5 py-0.5 text-[10px] font-semibold text-good">
              <CheckCircle2 className="h-3 w-3" aria-hidden /> 完了
            </span>
          )}
          {onLabelTap && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onLabelTap(task)
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="relative inline-flex items-center rounded-full border border-line px-2 py-1 text-sub transition before:absolute before:-inset-2 before:content-[''] hover:border-accent/60 hover:text-ink"
              aria-label="ラベルを付ける"
            >
              <Tag className="h-3.5 w-3.5" />
            </button>
          )}
          {task.labels.slice(0, MAX_LABELS).map((l) => (
            <LabelChip key={l.name} label={l} />
          ))}
          {hiddenLabels > 0 && (
            <span
              className="text-[11px] font-semibold text-sub"
              aria-label={`ほか ${hiddenLabels} 件のラベル`}
            >
              +{hiddenLabels}
            </span>
          )}
          {task.commentCount > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[11px] text-sub">
              <MessageSquare className="h-3 w-3" /> {task.commentCount}
            </span>
          )}
          <span className="text-[11px] text-sub">#{task.number}</span>
        </div>
      </div>
      {onStatusTap && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onStatusTap(task)
          }}
          onPointerDown={(e) => e.stopPropagation()} // let the pill be tapped without starting a drag
          className="relative inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-bold text-ink before:absolute before:-inset-2 before:content-['']"
          style={{ background: meta.tint }}
          aria-label={`ステータス: ${meta.label}（タップで変更）`}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.dot }} aria-hidden />
          {meta.label}
        </button>
      )}
    </div>
  )
})
