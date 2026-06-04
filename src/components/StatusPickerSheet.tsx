import { Check } from 'lucide-react'
import { Sheet, SheetContent } from './ui/Sheet'
import { STATUS_META, STATUS_ORDER } from '../lib/status'
import type { Status, Task } from '../lib/types'

export function StatusPickerSheet({
  task,
  onClose,
  onPick,
}: {
  task: Task | null
  onClose: () => void
  onPick: (s: Status) => void
}) {
  return (
    <Sheet
      open={!!task}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      {task && (
        <SheetContent title="ステータスを変更" description={`#${task.number} ${task.title}`}>
          <div className="space-y-2">
            {STATUS_ORDER.map((s) => {
              const meta = STATUS_META[s]
              const active = task.status === s
              return (
                <button
                  key={s}
                  onClick={() => onPick(s)}
                  className="flex h-12 w-full items-center gap-3 rounded-xl border px-4 text-left transition active:scale-[0.99]"
                  style={{
                    borderColor: active ? meta.dot : 'var(--line)',
                    background: active ? meta.tint : 'transparent',
                  }}
                >
                  <span className="h-3 w-3 rounded-full" style={{ background: meta.dot }} aria-hidden />
                  <span className="font-semibold text-ink">{meta.label}</span>
                  {active && <Check className="ml-auto h-5 w-5" style={{ color: meta.dot }} />}
                </button>
              )
            })}
          </div>
        </SheetContent>
      )}
    </Sheet>
  )
}
