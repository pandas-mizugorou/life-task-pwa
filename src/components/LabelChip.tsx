import type { Label } from '../lib/types'

/** A colored label pill: a color dot + a subtle tint/border of the label color,
 *  with INK text (not the raw color) so even dark label colors stay legible on the
 *  dark theme. `color` is a 6-digit hex without '#'. */
export function LabelChip({ label, className }: { label: Label; className?: string }) {
  const c = `#${label.color}`
  return (
    <span
      className={
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold text-ink ' +
        (className ?? '')
      }
      style={{ background: `${c}22`, border: `1px solid ${c}66` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} aria-hidden />
      {label.name}
    </span>
  )
}
