import { useState } from 'react'
import { useBoard } from '../context/BoardContext'
import { FullSpinner } from '../components/ui/Spinner'
import { ErrorState } from '../components/ui/States'
import { LabelFilterChips } from '../components/LabelFilterChips'
import { StatusColumn } from '../components/StatusColumn'
import { StatusPickerSheet } from '../components/StatusPickerSheet'
import { QuickAddSheet } from '../components/QuickAddSheet'
import { STATUS_ORDER } from '../lib/status'
import type { Status, Task } from '../lib/types'

export function Board() {
  const board = useBoard()
  const [picker, setPicker] = useState<Task | null>(null)
  const [addStatus, setAddStatus] = useState<Status | null>(null)

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

      {/* Horizontal kanban: swipe between status columns; each column scrolls vertically
          and has its own + (in the header) to add a task directly into that status. */}
      <div className="flex min-h-0 flex-1 snap-x snap-proximity gap-3 overflow-x-auto overscroll-x-contain px-4 pt-3">
        {STATUS_ORDER.map((s) => (
          <StatusColumn
            key={s}
            status={s}
            tasks={board.byStatus[s]}
            onStatusTap={setPicker}
            onAdd={setAddStatus}
          />
        ))}
      </div>

      <StatusPickerSheet task={picker} onClose={() => setPicker(null)} onPick={pick} />
      <QuickAddSheet
        open={addStatus !== null}
        initialStatus={addStatus ?? 'Backlog'}
        onClose={() => setAddStatus(null)}
      />
    </div>
  )
}
