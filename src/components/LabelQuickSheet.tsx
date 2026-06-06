import { Sheet, SheetContent } from './ui/Sheet'
import { LabelToggleChips } from './LabelToggleChips'
import { useBoard } from '../context/BoardContext'
import { haptic } from '../lib/haptics'
import type { Task } from '../lib/types'

/** Tap a card's tag button -> toggle its labels here. Applies instantly (optimistic). */
export function LabelQuickSheet({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const board = useBoard()
  // Read the live task from the board cache so checkmarks reflect each toggle immediately.
  const live = task ? (board.tasks.find((t) => t.number === task.number) ?? task) : null
  const selected = live ? live.labels.map((l) => l.name) : []

  const toggle = (name: string) => {
    if (!live) return
    const next = selected.includes(name)
      ? selected.filter((n) => n !== name)
      : [...selected, name]
    haptic(8)
    // board.setTaskLabels surfaces its own error toast; swallow the rejection here.
    void board.setTaskLabels(live.number, next).catch(() => {})
  }

  return (
    <Sheet
      open={!!task}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      {task && (
        <SheetContent title="ラベルを付ける" description={`#${task.number} ${task.title}`}>
          <LabelToggleChips selected={selected} onToggle={toggle} labels={board.labels} />
          <p className="mt-3 text-xs leading-relaxed text-sub">
            タップで付け外し（即反映）。終わったら外側をタップで閉じます。
          </p>
        </SheetContent>
      )}
    </Sheet>
  )
}
