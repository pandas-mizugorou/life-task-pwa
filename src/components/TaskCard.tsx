import { MessageSquare } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { STATUS_META } from '../lib/status'
import type { Task } from '../lib/types'
import { LabelChip } from './LabelChip'

export function TaskCard({ task, onStatusTap }: { task: Task; onStatusTap: (t: Task) => void }) {
  const navigate = useNavigate()
  const meta = STATUS_META[task.status]
  const open = () => navigate(`/t/${task.number}`)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          open()
        }
      }}
      className="fa-card flex cursor-pointer items-start gap-2 rounded-2xl border border-line bg-panel p-3.5 transition hover:border-accent/40 active:scale-[0.99]"
    >
      <div className="min-w-0 flex-1">
        <div className="line-clamp-2 font-semibold leading-snug text-ink">{task.title}</div>
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
      <button
        onClick={(e) => {
          e.stopPropagation()
          onStatusTap(task)
        }}
        className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold"
        style={{ background: meta.tint, color: meta.dot }}
        aria-label={`ステータス: ${meta.label}（タップで変更）`}
      >
        {meta.label}
      </button>
    </div>
  )
}
