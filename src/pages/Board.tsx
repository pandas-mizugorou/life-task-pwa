import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useBoard } from '../context/BoardContext'
import { FullSpinner } from '../components/ui/Spinner'
import { ErrorState } from '../components/ui/States'
import { LabelFilterChips } from '../components/LabelFilterChips'
import { StatusColumn } from '../components/StatusColumn'
import { StatusPickerSheet } from '../components/StatusPickerSheet'
import { QuickAddSheet } from '../components/QuickAddSheet'
import { LabelQuickSheet } from '../components/LabelQuickSheet'
import { TaskCardView } from '../components/TaskCardView'
import { cn } from '../lib/cn'
import { haptic } from '../lib/haptics'
import { STATUS_ORDER } from '../lib/status'
import type { Status, Task } from '../lib/types'

export function Board() {
  const board = useBoard()
  const [picker, setPicker] = useState<Task | null>(null)
  const [addStatus, setAddStatus] = useState<Status | null>(null)
  const [labelTarget, setLabelTarget] = useState<Task | null>(null)
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  // Long-press to drag on touch (so quick swipes still scroll the board/columns);
  // small move threshold to start a drag with a mouse on desktop.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )

  if (board.loading && board.tasks.length === 0) return <FullSpinner label="ボードを読み込み中…" />
  if (board.error && board.tasks.length === 0)
    return <ErrorState message={board.error} onRetry={board.refresh} />

  const pick = async (s: Status) => {
    if (!picker) return
    const number = picker.number
    setPicker(null)
    await board.setStatus(number, s)
  }

  const onDragStart = (e: DragStartEvent) => {
    const t = e.active.data.current?.task as Task | undefined
    if (t) {
      setActiveTask(t)
      haptic(10)
    }
  }

  const onDragEnd = (e: DragEndEvent) => {
    setActiveTask(null)
    const t = e.active.data.current?.task as Task | undefined
    const to = e.over?.id as Status | undefined
    if (t && to && (STATUS_ORDER as string[]).includes(to) && t.status !== to) {
      board.setStatus(t.number, to) // optimistic move (with rollback on failure)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-4 pt-4">
        <LabelFilterChips
          value={board.labelFilter}
          onChange={board.setLabelFilter}
          labels={board.labels}
        />
      </div>

      {/* Horizontal kanban. Long-press a card to drag it between columns; quick swipes
          still scroll. Snap is disabled while dragging so auto-scroll stays smooth. */}
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveTask(null)}
      >
        <div
          className={cn(
            'flex min-h-0 flex-1 gap-3 overflow-x-auto overscroll-x-contain px-4 pt-3',
            !activeTask && 'snap-x snap-proximity',
          )}
        >
          {STATUS_ORDER.map((s) => (
            <StatusColumn
              key={s}
              status={s}
              tasks={board.byStatus[s]}
              onStatusTap={setPicker}
              onLabelTap={setLabelTarget}
              onAdd={setAddStatus}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeTask ? (
            <TaskCardView task={activeTask} className="rotate-1 shadow-2xl ring-2 ring-accent2/50" />
          ) : null}
        </DragOverlay>
      </DndContext>

      <StatusPickerSheet task={picker} onClose={() => setPicker(null)} onPick={pick} />
      <LabelQuickSheet task={labelTarget} onClose={() => setLabelTarget(null)} />
      <QuickAddSheet
        open={addStatus !== null}
        initialStatus={addStatus ?? 'Backlog'}
        onClose={() => setAddStatus(null)}
      />
    </div>
  )
}
