import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useBoard } from '../context/BoardContext'
import { FullSpinner } from '../components/ui/Spinner'
import { EmptyState, ErrorState } from '../components/ui/States'
import { LabelFilterChips } from '../components/LabelFilterChips'
import { StatusColumn } from '../components/StatusColumn'
import { StatusPickerSheet } from '../components/StatusPickerSheet'
import { QuickAddSheet } from '../components/QuickAddSheet'
import { STATUS_ORDER } from '../lib/status'
import type { Status, Task } from '../lib/types'

export function Board() {
  const board = useBoard()
  const [picker, setPicker] = useState<Task | null>(null)
  const [adding, setAdding] = useState(false)

  if (board.loading && board.tasks.length === 0) return <FullSpinner label="ボードを読み込み中…" />
  if (board.error && board.tasks.length === 0)
    return <ErrorState message={board.error} onRetry={board.refresh} />

  const pick = async (s: Status) => {
    if (!picker) return
    const number = picker.number
    setPicker(null)
    await board.setStatus(number, s)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-4 pt-4">
        <LabelFilterChips value={board.labelFilter} onChange={board.setLabelFilter} />
      </div>

      {board.total === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <EmptyState
            title="タスクがありません"
            description={
              board.labelFilter
                ? 'このラベルの未完了タスクはありません。'
                : '右下の＋ボタンから追加できます。'
            }
          />
        </div>
      ) : (
        // Horizontal kanban: columns side by side, swipe to scroll (snap per column);
        // each column scrolls vertically on its own.
        <div className="flex min-h-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-4 pt-3">
          {STATUS_ORDER.map((s) => (
            <StatusColumn key={s} status={s} tasks={board.byStatus[s]} onStatusTap={setPicker} />
          ))}
        </div>
      )}

      <button
        onClick={() => setAdding(true)}
        className="bg-grad fixed right-5 z-30 grid h-14 w-14 place-items-center rounded-full text-heroink shadow-xl shadow-accent/30 transition active:scale-95"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 72px)' }}
        aria-label="タスクを追加"
      >
        <Plus className="h-7 w-7" />
      </button>

      <StatusPickerSheet task={picker} onClose={() => setPicker(null)} onPick={pick} />
      <QuickAddSheet open={adding} onClose={() => setAdding(false)} />
    </div>
  )
}
