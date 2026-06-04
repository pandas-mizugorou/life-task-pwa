import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../lib/cn'
import { STATUS_META } from '../lib/status'
import type { Status, Task } from '../lib/types'
import { TaskCard } from './TaskCard'

export function StatusColumn({
  status,
  tasks,
  onStatusTap,
}: {
  status: Status
  tasks: Task[]
  onStatusTap: (t: Task) => void
}) {
  const [open, setOpen] = useState(true)
  const meta = STATUS_META[status]

  return (
    <section>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 py-2.5"
        aria-expanded={open}
      >
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: meta.dot }} aria-hidden />
        <span className="font-bold text-ink">{meta.label}</span>
        <span className="rounded-full bg-panel2 px-2 py-0.5 text-xs font-semibold text-sub">
          {tasks.length}
        </span>
        <ChevronDown
          className={cn('ml-auto h-4 w-4 text-sub transition-transform', !open && '-rotate-90')}
        />
      </button>
      {open &&
        (tasks.length ? (
          <div className="space-y-2 pb-1">
            {tasks.map((t) => (
              <TaskCard key={t.number} task={t} onStatusTap={onStatusTap} />
            ))}
          </div>
        ) : (
          <p className="px-1 pb-2 text-xs text-sub/60">タスクなし</p>
        ))}
    </section>
  )
}
