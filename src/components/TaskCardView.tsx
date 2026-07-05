import { forwardRef } from 'react'
import { CheckCircle2, MessageSquare, Tag } from 'lucide-react'
import { cn } from '../lib/cn'
import type { Task } from '../lib/types'
import { LabelChip } from './LabelChip'

/** Max labels shown on a card before collapsing the rest into a "+N" chip. */
const MAX_LABELS = 3

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  task: Task
  onLabelTap?: (t: Task) => void
  onOpen?: () => void
  dragging?: boolean
  /** Render a "完了" badge (used by the archive column; gives SR/low-vision a text cue). */
  completed?: boolean
}

/** Presentational task card. Used directly inside columns and in the DragOverlay.
 *  ステータスはカードが属するカラムで判別できるため、カード上では表示しない
 *  （情報の重複を避け、カード本体の情報量を優先）。 */
export const TaskCardView = forwardRef<HTMLDivElement, Props>(function TaskCardView(
  { task, onLabelTap, onOpen, dragging, completed, className, ...rest },
  ref,
) {
  const hiddenLabels = task.labels.length - MAX_LABELS
  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      aria-label={task.title}
      onClick={onOpen}
      onKeyDown={(e) => {
        // Activate on Enter or Space (native button behaviour) — only when the card
        // itself is focused, so typing in a nested control isn't hijacked.
        if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
          e.preventDefault()
          onOpen?.()
        }
      }}
      className={cn(
        // select-none + no iOS touch-callout: stops the long-press from triggering text
        // selection / the callout magnifier, which otherwise steals the drag pickup.
        // touch-action:manipulation keeps scroll/pan working (unlike `none`) while
        // disabling the double-tap-zoom heuristic that can swallow the 200ms long-press.
        'fa-card flex select-none items-start gap-2 rounded-2xl border border-line bg-panel p-3 transition [-webkit-touch-callout:none] [touch-action:manipulation] hover:border-accent/40 active:scale-[0.99]',
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
          {completed && task.closedAt && (
            <span
              className="text-[11px] text-sub"
              aria-label={`完了日時 ${fmtCloseDate(task.closedAt)}`}
            >
              {fmtCloseDate(task.closedAt)}
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
            <span
              className="inline-flex items-center gap-0.5 text-[11px] text-sub"
              aria-label={`コメント ${task.commentCount} 件`}
            >
              <MessageSquare className="h-3 w-3" aria-hidden /> {task.commentCount}
            </span>
          )}
          <span className="text-[11px] text-sub">#{task.number}</span>
        </div>
      </div>
    </div>
  )
})

/** 完了日時を M/D HH:MM でローカル表示（CommentList.fmtDate と同一書式）。 */
function fmtCloseDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`
}
