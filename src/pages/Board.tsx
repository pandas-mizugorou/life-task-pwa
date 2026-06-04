import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { useBoard } from '../context/BoardContext'
import { FullSpinner } from '../components/ui/Spinner'
import { ErrorState } from '../components/ui/States'
import { LabelFilterChips } from '../components/LabelFilterChips'
import { StatusColumn } from '../components/StatusColumn'
import { CompletedColumn } from '../components/CompletedColumn'
import { StatusPickerSheet } from '../components/StatusPickerSheet'
import { QuickAddSheet } from '../components/QuickAddSheet'
import { LabelQuickSheet } from '../components/LabelQuickSheet'
import { TaskCardView } from '../components/TaskCardView'
import { cn } from '../lib/cn'
import { haptic } from '../lib/haptics'
import { ACTIVE_STATUSES } from '../lib/status'
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

  const complete = async () => {
    if (!picker) return
    const number = picker.number
    setPicker(null)
    await board.setTaskState(number, 'closed')
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
    const activeId = String(e.active.id)
    const overId = e.over ? String(e.over.id) : null
    if (!overId || overId === activeId) return

    const moved = e.active.data.current?.task as Task | undefined
    if (!moved) return

    const tasks = board.tasks
    const fromIndex = tasks.findIndex((t) => `task-${t.number}` === activeId)
    if (fromIndex < 0) return

    // Resolve the drop target's column (and the card dropped onto, if any).
    let targetCol: Status
    let overTask: Task | undefined
    if ((ACTIVE_STATUSES as string[]).includes(overId)) {
      targetCol = overId as Status
    } else {
      overTask = tasks.find((t) => `task-${t.number}` === overId)
      if (!overTask) return
      targetCol = overTask.status
    }

    // Different column → change status (keeps default position).
    if (moved.status !== targetCol) {
      board.setStatus(moved.number, targetCol)
      return
    }

    // Same column → reorder within the flat list, then persist the new position.
    let newTasks: Task[]
    if (overTask) {
      const toIndex = tasks.findIndex((t) => t.number === overTask!.number)
      if (toIndex < 0 || toIndex === fromIndex) return
      newTasks = arrayMove(tasks, fromIndex, toIndex)
    } else {
      // dropped on the column's empty area → move to the end of that column
      const inCol = tasks.filter((t) => t.status === targetCol)
      const last = inCol[inCol.length - 1]
      if (!last || last.number === moved.number) return
      const toIndex = tasks.findIndex((t) => t.number === last.number)
      newTasks = arrayMove(tasks, fromIndex, toIndex)
    }
    const newIndex = newTasks.findIndex((t) => t.number === moved.number)
    const afterItemId = newIndex > 0 ? newTasks[newIndex - 1].itemId : null
    board.reorderTasks(newTasks, moved.number, moved.itemId, afterItemId)
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
        collisionDetection={closestCorners}
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
          {ACTIVE_STATUSES.map((s) => (
            <StatusColumn
              key={s}
              status={s}
              tasks={board.byStatus[s]}
              onStatusTap={setPicker}
              onLabelTap={setLabelTarget}
              onAdd={setAddStatus}
            />
          ))}
          {board.showClosed && <CompletedColumn tasks={board.completed} />}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeTask ? (
            <TaskCardView task={activeTask} className="rotate-1 shadow-2xl ring-2 ring-accent2/50" />
          ) : null}
        </DragOverlay>
      </DndContext>

      <StatusPickerSheet
        task={picker}
        onClose={() => setPicker(null)}
        onPick={pick}
        onComplete={complete}
      />
      <LabelQuickSheet task={labelTarget} onClose={() => setLabelTarget(null)} />
      <QuickAddSheet
        open={addStatus !== null}
        initialStatus={addStatus ?? 'Backlog'}
        onClose={() => setAddStatus(null)}
      />
    </div>
  )
}
