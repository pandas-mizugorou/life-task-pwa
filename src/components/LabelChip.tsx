import type { Label } from '../lib/types'

/** A colored label pill. `color` is a 6-digit hex without '#'. */
export function LabelChip({ label, className }: { label: Label; className?: string }) {
  const c = `#${label.color}`
  return (
    <span
      className={'rounded-full px-2 py-0.5 text-[11px] font-semibold ' + (className ?? '')}
      style={{ color: c, background: `${c}22`, border: `1px solid ${c}55` }}
    >
      {label.name}
    </span>
  )
}
