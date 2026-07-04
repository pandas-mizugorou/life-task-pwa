import { useLayoutEffect, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  closestCorners,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useBoard } from '../context/BoardContext'
import { BoardSkeleton } from '../components/Skeletons'
import { Button } from '../components/ui/Button'
import { useToast } from '../components/ui/Toast'
import { EmptyState, ErrorState } from '../components/ui/States'
import { LabelFilterChips } from '../components/LabelFilterChips'
import { StatusColumn } from '../components/StatusColumn'
import { CompletedColumn } from '../components/CompletedColumn'
import { StatusPickerSheet } from '../components/StatusPickerSheet'
import { QuickAddSheet } from '../components/QuickAddSheet'
import { LabelQuickSheet } from '../components/LabelQuickSheet'
import { TaskCardView } from '../components/TaskCardView'
import { cn } from '../lib/cn'
import { haptic } from '../lib/haptics'
import { boardScroll } from '../lib/boardScroll'
import { usePullToRefresh } from '../lib/usePullToRefresh'
import { useIsDesktop } from '../lib/useMediaQuery'
import { ACTIVE_STATUSES } from '../lib/status'
import type { Status, Task } from '../lib/types'

// Prefer what's directly under the finger (precise); fall back to the nearest
// droppable when the pointer is in a gap, so there are no dead zones.
const collisionDetectionStrategy: CollisionDetection = (args) => {
  const pointer = pointerWithin(args)
  return pointer.length > 0 ? pointer : closestCorners(args)
}

// The column a task is *displayed* in. byStatus renders open tasks with a
// non-active status (legacy open+Done) in the Todo column, so all drag math must
// use the same mapping — raw `t.status` would point at the empty 'Done' bucket
// and a drop onto such a card would silently write status "Done" to the moved card.
const displayCol = (t: Task): Status =>
  ACTIVE_STATUSES.includes(t.status) ? t.status : 'Todo'

export function Board() {
  const board = useBoard()
  const toast = useToast()
  const isDesktop = useIsDesktop()
  const [picker, setPicker] = useState<Task | null>(null)
  const [addStatus, setAddStatus] = useState<Status | null>(null)
  const [labelTarget, setLabelTarget] = useState<Task | null>(null)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [overColumn, setOverColumn] = useState<Status | null>(null)
  const [dropIndicator, setDropIndicator] = useState<{ col: Status; index: number } | null>(null)

  // Long-press to drag on touch (so quick swipes still scroll the board/columns);
  // small move threshold to start a drag with a mouse on desktop.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )

  // Pull down (when a column is at the top) to refresh; disabled while dragging a card.
  const boardRef = useRef<HTMLDivElement>(null)
  const { pull, refreshing, armed } = usePullToRefresh(boardRef, board.refresh, activeTask !== null)

  // Restore the saved horizontal scroll once the columns exist. Keyed on task count
  // so it retries when data arrives after a cold load (not every render), then locks.
  const columnsRef = useRef<HTMLDivElement>(null)
  const didRestore = useRef(false)
  useLayoutEffect(() => {
    if (didRestore.current || !columnsRef.current) return
    columnsRef.current.scrollLeft = boardScroll.left
    didRestore.current = true
  }, [board.tasks.length])

  if (board.loading && board.tasks.length === 0) return <BoardSkeleton />
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
    try {
      await board.setTaskState(number, 'closed')
      toast({
        variant: 'success',
        title: '完了にしました',
        action: { label: '元に戻す', onAction: () => void board.setTaskState(number, 'open') },
      })
    } catch {
      /* board.setTaskState already surfaced the error toast */
    }
  }

  const onDragStart = (e: DragStartEvent) => {
    const t = e.active.data.current?.task as Task | undefined
    if (t) {
      setActiveTask(t)
      haptic(10)
    }
  }

  // Track which column the card is hovering over, so we can highlight it even
  // when the pointer is over another card (not just the empty column area).
  const onDragOver = (e: DragOverEvent) => {
    const overId = e.over ? String(e.over.id) : null
    const moved = e.active.data.current?.task as Task | undefined
    if (!overId || !moved) {
      setOverColumn(null)
      setDropIndicator(null)
      return
    }

    let col: Status | null = null
    let index = 0
    if ((ACTIVE_STATUSES as string[]).includes(overId)) {
      col = overId as Status
      index = board.byStatus[col].length // dropped on the column area → end
    } else if (overId.startsWith('drop-')) {
      const overNum = Number(overId.slice(5))
      const overTask = board.tasks.find((t) => t.number === overNum)
      if (overTask) {
        col = displayCol(overTask)
        const colTasks = board.byStatus[col]
        const overIdx = colTasks.findIndex((t) => t.number === overNum)
        const overRect = e.over?.rect
        const activeRect = e.active.rect.current.translated
        // insert below the hovered card if the dragged card's centre is past its centre
        const after =
          activeRect && overRect
            ? activeRect.top + activeRect.height / 2 > overRect.top + overRect.height / 2
            : false
        index = after ? overIdx + 1 : overIdx
      }
    }

    setOverColumn((prev) => (prev === col ? prev : col))
    setDropIndicator((prev) => {
      if (!col) return prev === null ? prev : null
      if (prev && prev.col === col && prev.index === index) return prev
      return { col, index }
    })
  }

  const onDragEnd = (e: DragEndEvent) => {
    const ind = dropIndicator
    setActiveTask(null)
    setOverColumn(null)
    setDropIndicator(null)

    const moved = e.active.data.current?.task as Task | undefined
    if (!moved || !ind) return
    const { col: targetCol, index } = ind

    const flat = board.tasks.slice()
    const fromIdx = flat.findIndex((t) => t.number === moved.number)
    if (fromIdx < 0) return

    // The card the line sits before (null = end of column). Skip drops onto self.
    const colTasks = board.byStatus[targetCol]
    const anchor = index < colTasks.length ? colTasks[index] : null
    if (anchor && anchor.number === moved.number) return

    const [m] = flat.splice(fromIdx, 1)
    const newStatus: Status | null = moved.status !== targetCol ? targetCol : null
    const movedNew = newStatus ? { ...m, status: newStatus } : m

    let insertAt: number
    if (anchor) {
      insertAt = flat.findIndex((t) => t.number === anchor.number)
      if (insertAt < 0) insertAt = flat.length
    } else {
      let last = -1
      for (let i = 0; i < flat.length; i++) if (displayCol(flat[i]) === targetCol) last = i
      insertAt = last >= 0 ? last + 1 : flat.length
    }
    flat.splice(insertAt, 0, movedNew)

    const sameOrder =
      flat.map((t) => t.number).join(',') === board.tasks.map((t) => t.number).join(',')
    if (sameOrder && !newStatus) return // nothing actually changed

    // afterItemId = nearest preceding card in the GLOBAL order that's actually on
    // the board. Walking back skips cards hidden by an active label filter and any
    // not-yet-boarded card (empty itemId) that would otherwise bump the item to the
    // top, so the visible drop position and the persisted project order stay in sync.
    let afterItemId: string | null = null
    for (let i = insertAt - 1; i >= 0; i--) {
      if (flat[i].itemId) {
        afterItemId = flat[i].itemId
        break
      }
    }
    board.moveTask(flat, moved.number, moved.itemId, afterItemId, newStatus)
  }

  return (
    <div ref={boardRef} className="relative flex h-full flex-col overflow-hidden">
      <h1 className="sr-only">タスクボード</h1>
      {(pull > 0 || refreshing) && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center"
          style={{
            transform: `translateY(${refreshing ? 10 : Math.max(pull - 44, -44)}px)`,
            opacity: refreshing ? 1 : Math.min(pull / 48, 1),
          }}
        >
          <div className="mt-2 flex items-center gap-2 rounded-full border border-line bg-panel2/95 px-3 py-1.5 shadow-lg backdrop-blur">
            <RefreshCw
              className={cn(
                'h-4 w-4 transition-colors',
                refreshing ? 'animate-spin text-accent2' : armed ? 'text-accent2' : 'text-sub',
              )}
              style={refreshing ? undefined : { transform: `rotate(${Math.min(pull * 2.4, 200)}deg)` }}
            />
            <span
              className={cn(
                'text-[11px] font-semibold transition-colors',
                armed || refreshing ? 'text-accent2' : 'text-sub',
              )}
            >
              {refreshing ? '更新中…' : armed ? '離して更新' : '引っ張って更新'}
            </span>
          </div>
        </div>
      )}

      {/* Horizontal kanban. Long-press a card to drag it between columns; quick swipes
          still scroll. Snap is disabled while dragging so auto-scroll stays smooth.
          DragOverlay stays OUTSIDE the pull-translated wrapper so its fixed
          positioning is measured against the viewport, not a transformed ancestor. */}
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetectionStrategy}
        // Trigger edge auto-scroll sooner: columns are 72vw (only ~1.4 visible), so a
        // cross-column drag needs the board to scroll horizontally before the pickup lapses.
        // PC では全列が見えており横スクロールが無いので横方向 auto-scroll は無効化（縦は維持）。
        autoScroll={{ threshold: { x: isDesktop ? 0 : 0.2, y: 0.25 }, acceleration: 12 }}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          setActiveTask(null)
          setOverColumn(null)
        }}
      >
        {/* Content physically follows the finger while pulling, then springs back. */}
        <div
          className="flex min-h-0 flex-1 flex-col"
          style={{
            transform: `translateY(${refreshing ? 48 : pull}px)`,
            transition: pull > 0 ? 'none' : 'transform 0.34s cubic-bezier(0.22, 1, 0.36, 1)',
            // Only force a compositor layer while actually pulling — a permanent
            // will-change here promotes the whole board and makes the inner
            // horizontal scroll repaint heavily (= the "not smooth" feel).
            willChange: pull > 0 || refreshing ? 'transform' : undefined,
          }}
        >
          <div className="shrink-0 px-4 pt-4">
            <LabelFilterChips
              value={board.labelFilter}
              onChange={board.setLabelFilter}
              labels={board.labels}
            />
          </div>

          {board.truncated && (
            <div className="shrink-0 px-4 pt-2">
              <p className="rounded-lg bg-warn/15 px-3 py-1.5 text-center text-xs font-semibold text-warn">
                タスクが多いため一部のみ表示中。ラベルで絞り込むか、設定で「完了したタスクも表示」をオフにすると改善します。
              </p>
            </div>
          )}

          {board.total === 0 &&
          !(board.showClosed && board.completed.length > 0) &&
          !board.closedLoading ? (
            <div className="flex min-h-0 flex-1 items-center justify-center px-6">
              {board.labelFilter ? (
                <EmptyState
                  icon="🏷️"
                  title="このラベルのタスクはありません"
                  description="別のラベルを選ぶか、フィルタを解除してください。"
                  action={
                    <Button variant="secondary" onClick={() => board.setLabelFilter(null)}>
                      フィルタを解除
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  icon="🗒️"
                  title="タスクがありません"
                  description="最初のタスクを追加して始めましょう。"
                  action={<Button onClick={() => setAddStatus('Backlog')}>＋ タスクを追加</Button>}
                />
              )}
            </div>
          ) : (
            <div
              ref={columnsRef}
              onScroll={(e) => {
                boardScroll.left = e.currentTarget.scrollLeft
              }}
              className={cn(
                // PC（lg 以上）は全列が flex-1 で均等に収まるので横スクロール・スナップを無効化。
                'flex min-h-0 flex-1 gap-3 overflow-x-auto overscroll-x-contain px-4 pt-3 lg:overflow-x-hidden lg:px-6',
                !activeTask && 'snap-x snap-proximity lg:snap-none',
              )}
              // Momentum/inertia scrolling on iOS so a flick glides instead of stopping dead.
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {ACTIVE_STATUSES.map((s) => (
                <StatusColumn
                  key={s}
                  status={s}
                  tasks={board.byStatus[s]}
                  isTarget={overColumn === s}
                  lineIndex={dropIndicator && dropIndicator.col === s ? dropIndicator.index : null}
                  onStatusTap={setPicker}
                  onLabelTap={setLabelTarget}
                  onAdd={setAddStatus}
                />
              ))}
              {board.showClosed && (
                <CompletedColumn tasks={board.completed} loading={board.closedLoading} />
              )}
            </div>
          )}
        </div>

        <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
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
