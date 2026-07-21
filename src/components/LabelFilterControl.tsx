import { useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import { SearchableLabelList } from './LabelPicker'
import { Button } from './ui/Button'
import { ResponsiveSheet, ResponsiveSheetContent } from './ui/ResponsiveSheet'
import { cn } from '../lib/cn'
import {
  EMPTY_LABEL_FILTER,
  hasActiveLabelFilter,
  type LabelFilter,
  type LabelFilterMode,
} from '../lib/labelFilter'
import type { Label } from '../lib/types'

export function LabelFilterControl({
  value,
  onChange,
  labels,
}: {
  value: LabelFilter
  onChange: (value: LabelFilter) => void
  labels: Label[]
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<LabelFilter>(value)
  const active = hasActiveLabelFilter(value)
  const selectedInOrder = labels.filter((label) => value.labels.includes(label.name))
  const first = selectedInOrder[0]
  const hidden = Math.max(0, selectedInOrder.length - 1)

  const openEditor = () => {
    const existing = new Set(labels.map((label) => label.name))
    setDraft({ ...value, labels: value.labels.filter((name) => existing.has(name)) })
    setOpen(true)
  }

  const toggleDraft = (name: string) => {
    setDraft((current) => ({
      ...current,
      labels: current.labels.includes(name)
        ? current.labels.filter((label) => label !== name)
        : [...current.labels, name],
    }))
  }

  const apply = () => {
    onChange(draft.labels.length > 0 ? draft : EMPTY_LABEL_FILTER)
    setOpen(false)
  }

  return (
    <>
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={openEditor}
          className={cn(
            'flex h-10 min-w-0 max-w-full items-center gap-2 rounded-full border px-3 text-[13px] font-semibold transition hover:bg-panel2',
            active ? 'border-accent/60 bg-panel2 text-ink' : 'border-line text-sub',
          )}
          aria-label={active ? 'ラベルの絞り込み条件を変更' : 'ラベルで絞り込む'}
        >
          <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden />
          {active && first ? (
            <>
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: `#${first.color}` }}
                aria-hidden
              />
              <span className="truncate">
                {value.mode === 'include' ? '表示' : '除外'}: {first.name}
              </span>
              {hidden > 0 && <span className="shrink-0 text-sub">+{hidden}</span>}
            </>
          ) : (
            <span>ラベルで絞り込む</span>
          )}
        </button>
        {active && (
          <button
            type="button"
            onClick={() => onChange(EMPTY_LABEL_FILTER)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line text-sub transition hover:bg-panel2 hover:text-ink"
            aria-label="ラベルの絞り込みを解除"
            title="絞り込みを解除"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>

      <ResponsiveSheet
        open={open}
        onOpenChange={(next) => {
          if (!next) setOpen(false)
        }}
      >
        {open && (
          <ResponsiveSheetContent
            title="ラベルで絞り込む"
            description="選択したラベルのいずれかに一致するタスクを対象にします。"
          >
            <ModeSwitch value={draft.mode} onChange={(mode) => setDraft((v) => ({ ...v, mode }))} />

            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-ink">ラベル</span>
              <button
                type="button"
                onClick={() => setDraft((current) => ({ ...current, labels: [] }))}
                disabled={draft.labels.length === 0}
                className="text-xs font-semibold text-sub transition hover:text-ink disabled:opacity-40"
              >
                選択を解除
              </button>
            </div>
            <p className="mb-2 text-xs text-sub">{draft.labels.length}件選択中</p>
            <SearchableLabelList labels={labels} selected={draft.labels} onToggle={toggleDraft} />

            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line/70 pt-4">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                キャンセル
              </Button>
              <Button type="button" onClick={apply}>
                適用{draft.labels.length > 0 ? `（${draft.labels.length}件）` : ''}
              </Button>
            </div>
          </ResponsiveSheetContent>
        )}
      </ResponsiveSheet>
    </>
  )
}

function ModeSwitch({
  value,
  onChange,
}: {
  value: LabelFilterMode
  onChange: (value: LabelFilterMode) => void
}) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-panel2 p-1" role="group" aria-label="絞り込み方法">
        {(
          [
            ['include', '表示'],
            ['exclude', '除外'],
          ] as const
        ).map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            aria-pressed={value === mode}
            className={cn(
              'min-h-10 rounded-lg px-3 text-sm font-semibold transition',
              value === mode ? 'bg-accent2 text-heroink shadow-sm' : 'text-sub hover:text-ink',
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-sub">
        {value === 'include'
          ? '選択したラベルを1つでも持つタスクだけを表示します。'
          : '選択したラベルを1つでも持つタスクを隠します。ラベルなしのタスクは残ります。'}
      </p>
    </div>
  )
}
