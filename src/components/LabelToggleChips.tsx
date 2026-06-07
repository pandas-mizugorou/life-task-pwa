import { Check } from 'lucide-react'
import { cn } from '../lib/cn'
import type { Label } from '../lib/types'

/** Multi-select label chips. Tap to toggle a label on/off. */
export function LabelToggleChips({
  selected,
  onToggle,
  labels,
}: {
  selected: string[]
  onToggle: (name: string) => void
  labels: Label[]
}) {
  if (labels.length === 0) {
    return <p className="text-sm text-sub">ラベルがありません（設定 → ラベルの編集 で作成できます）。</p>
  }
  return (
    <div className="flex flex-wrap gap-2">
      {labels.map((l) => {
        const on = selected.includes(l.name)
        const c = `#${l.color}`
        return (
          <button
            key={l.name}
            onClick={() => onToggle(l.name)}
            aria-pressed={on}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-semibold transition active:scale-[0.97]',
              on ? 'text-ink' : 'border-line text-sub',
            )}
            style={on ? { borderColor: c, background: `${c}22` } : undefined}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} aria-hidden />
            {l.name}
            {on && <Check className="h-3.5 w-3.5" style={{ color: c }} aria-hidden />}
          </button>
        )
      })}
    </div>
  )
}
