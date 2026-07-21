import { useId, useMemo, useState } from 'react'
import { Check, ChevronDown, ChevronUp, Search } from 'lucide-react'
import { LabelChip } from './LabelChip'
import { Input } from './ui/Input'
import { cn } from '../lib/cn'
import type { Label } from '../lib/types'

export function SearchableLabelList({
  labels,
  selected,
  onToggle,
  className,
}: {
  labels: Label[]
  selected: string[]
  onToggle: (name: string) => void
  className?: string
}) {
  const [query, setQuery] = useState('')
  const searchId = useId()
  const normalized = query.trim().toLocaleLowerCase('ja-JP')
  const filtered = useMemo(
    () =>
      normalized
        ? labels.filter((label) => label.name.toLocaleLowerCase('ja-JP').includes(normalized))
        : labels,
    [labels, normalized],
  )

  if (labels.length === 0) {
    return (
      <p className="rounded-xl border border-line bg-panel2/50 px-3 py-4 text-center text-sm text-sub">
        ラベルがありません（設定 → ラベルの編集 で作成できます）。
      </p>
    )
  }

  return (
    <div className={className}>
      <label htmlFor={searchId} className="sr-only">
        ラベルを検索
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-sub"
          aria-hidden
        />
        <Input
          id={searchId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="pl-10"
          placeholder="ラベルを検索"
          enterKeyHint="search"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-sub">「{query.trim()}」に一致するラベルはありません。</p>
      ) : (
        <div className="mt-2 max-h-[min(42vh,20rem)] space-y-1 overflow-y-auto overscroll-contain pr-1">
          {filtered.map((label) => {
            const active = selected.includes(label.name)
            const color = `#${label.color}`
            return (
              <button
                key={label.name}
                type="button"
                onClick={() => onToggle(label.name)}
                aria-pressed={active}
                className={cn(
                  'flex min-h-11 w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition active:scale-[0.99]',
                  active
                    ? 'border-accent/60 bg-panel2 text-ink'
                    : 'border-transparent text-sub hover:border-line hover:bg-panel2/60 hover:text-ink',
                )}
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ background: color }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{label.name}</span>
                <span
                  className={cn(
                    'grid h-5 w-5 shrink-0 place-items-center rounded-md border transition',
                    active ? 'border-accent2 bg-accent2 text-heroink' : 'border-line',
                  )}
                  aria-hidden
                >
                  {active && <Check className="h-3.5 w-3.5" />}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/**
 * 追加・詳細画面向け。選択済みだけを常時見せ、必要なときだけ検索一覧を展開する。
 */
export function CollapsibleLabelPicker({
  labels,
  selected,
  onToggle,
  initiallyExpanded = false,
}: {
  labels: Label[]
  selected: string[]
  onToggle: (name: string) => void
  initiallyExpanded?: boolean
}) {
  const [expanded, setExpanded] = useState(initiallyExpanded)

  const selectedLabels = labels.filter((label) => selected.includes(label.name))
  const visible = selectedLabels.slice(0, 3)
  const hidden = selectedLabels.length - visible.length

  if (labels.length === 0) {
    return <SearchableLabelList labels={labels} selected={selected} onToggle={onToggle} />
  }

  return (
    <div>
      <div className="flex min-h-9 items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          {visible.length > 0 ? (
            visible.map((label) => <LabelChip key={label.name} label={label} />)
          ) : (
            <span className="text-sm text-sub">未選択</span>
          )}
          {hidden > 0 && <span className="self-center text-xs font-semibold text-sub">+{hidden}</span>}
        </div>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="flex min-h-11 shrink-0 items-center gap-1 rounded-xl border border-line px-3 text-sm font-semibold text-ink transition hover:bg-panel2"
        >
          {selected.length > 0 ? '変更' : '選択'}
          {expanded ? (
            <ChevronUp className="h-4 w-4" aria-hidden />
          ) : (
            <ChevronDown className="h-4 w-4" aria-hidden />
          )}
        </button>
      </div>
      {expanded && (
        <SearchableLabelList
          labels={labels}
          selected={selected}
          onToggle={onToggle}
          className="mt-2 rounded-xl border border-line bg-bg/35 p-2"
        />
      )}
    </div>
  )
}
