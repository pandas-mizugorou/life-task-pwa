import type { Label } from '../lib/types'

/** A colored label pill: a color dot + a subtle tint/border of the label color,
 *  with INK text (not the raw color) so even dark label colors stay legible on the
 *  dark theme. `color` is a 6-digit hex without '#'.
 *  compact = カード上など省スペース向けに一回り小さいピル（枠・色は維持）。 */
export function LabelChip({
  label,
  className,
  compact,
}: {
  label: Label
  className?: string
  compact?: boolean
}) {
  const c = `#${label.color}`
  return (
    <span
      className={
        'inline-flex items-center gap-1 rounded-full font-semibold text-ink ' +
        (compact ? 'px-1.5 py-0 text-[10px] ' : 'px-2 py-0.5 text-[11px] ') +
        (className ?? '')
      }
      style={{ background: `${c}22`, border: `1px solid ${c}66` }}
    >
      <span
        className={(compact ? 'h-[5px] w-[5px]' : 'h-1.5 w-1.5') + ' rounded-full'}
        style={{ background: c }}
        aria-hidden
      />
      {label.name}
    </span>
  )
}
