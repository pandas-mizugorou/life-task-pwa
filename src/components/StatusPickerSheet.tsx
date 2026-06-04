import { Check } from 'lucide-react'
import { Sheet, SheetContent } from './ui/Sheet'
import { ACTIVE_STATUSES, STATUS_META } from '../lib/status'
import type { Status, Task } from '../lib/types'

export function StatusPickerSheet({
  task,
  onClose,
  onPick,
  onComplete,
}: {
  task: Task | null
  onClose: () => void
  onPick: (s: Status) => void
  /** When provided, shows a "完了にする" action (closes the task). */
  onComplete?: () => void
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
            {ACTIVE_STATUSES.map((s) => {
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

          {onComplete && (
            <div className="mt-3 border-t border-line/60 pt-3">
              <button
                onClick={onComplete}
                className="bg-grad flex h-12 w-full items-center justify-center gap-2 rounded-xl font-bold text-heroink transition active:scale-[0.99]"
              >
                <Check className="h-5 w-5" />
                完了にする
              </button>
              <p className="mt-1.5 text-center text-xs text-sub">
                やり終えたとき（クローズして「完了済み」へ移動）
              </p>
            </div>
          )}
        </SheetContent>
      )}
    </Sheet>
  )
}
