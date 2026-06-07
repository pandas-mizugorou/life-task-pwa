import { cn } from '../lib/cn'
import type { Label } from '../lib/types'

export function LabelFilterChips({
  value,
  onChange,
  labels,
  includeAll = true,
}: {
  value: string | null
  onChange: (v: string | null) => void
  labels: Label[]
  includeAll?: boolean
}) {
  return (
    <div className="-mx-1 flex flex-nowrap gap-1.5 overflow-x-auto px-1 pb-1">
      {includeAll && (
        <Chip active={value === null} label="すべて" color={null} onClick={() => onChange(null)} />
      )}
      {labels.map((l) => (
        <Chip
          key={l.name}
          active={value === l.name}
          label={l.name}
          color={`#${l.color}`}
          onClick={() => onChange(value === l.name ? null : l.name)}
        />
      ))}
    </div>
  )
}

function Chip({
  active,
  label,
  color,
  onClick,
}: {
  active: boolean
  label: string
  color: string | null
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'shrink-0 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition',
        active ? 'text-ink' : 'border-line text-sub',
      )}
      style={
        active
          ? { borderColor: color ?? 'var(--accent)', background: color ? `${color}22` : 'var(--panel2)' }
          : undefined
      }
    >
      {label}
    </button>
  )
}
