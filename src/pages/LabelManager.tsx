import { Fragment, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { ArrowLeft, GripVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input, Label as FieldLabel } from '../components/ui/Input'
import { Spinner } from '../components/ui/Spinner'
import { Sheet, SheetContent } from '../components/ui/Sheet'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { LabelChip } from '../components/LabelChip'
import { useToast } from '../components/ui/Toast'
import { useBoard } from '../context/BoardContext'
import { cn } from '../lib/cn'
import { errMsg } from '../lib/haptics'
import { LABEL_COLORS } from '../lib/labels'
import type { Label } from '../lib/types'

type Editor = { mode: 'create' } | { mode: 'edit'; original: string }

export function LabelManager() {
  const board = useBoard()
  const toast = useToast()
  const navigate = useNavigate()
  const labels = board.labels

  const [editor, setEditor] = useState<Editor | null>(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState(LABEL_COLORS[0])
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // --- drag-to-reorder state ---
  const [activeName, setActiveName] = useState<string | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  // Long-press to grab on touch (so the page still scrolls); small move to drag with a mouse.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
  )
  const activeIndex = activeName ? labels.findIndex((l) => l.name === activeName) : -1
  const activeLabel = activeIndex >= 0 ? labels[activeIndex] : null

  const onDragStart = (e: DragStartEvent) =>
    setActiveName(String(e.active.id).replace(/^drag-/, ''))

  const onDragOver = (e: DragOverEvent) => {
    const overId = e.over ? String(e.over.id).replace(/^drop-/, '') : null
    const overIdx = overId ? labels.findIndex((l) => l.name === overId) : -1
    if (overIdx < 0) return setDropIndex(null)
    // Insert below the hovered row once the dragged row's centre passes its centre.
    const overRect = e.over?.rect
    const activeRect = e.active.rect.current.translated
    const after =
      activeRect && overRect
        ? activeRect.top + activeRect.height / 2 > overRect.top + overRect.height / 2
        : false
    setDropIndex(after ? overIdx + 1 : overIdx)
  }

  const onDragEnd = () => {
    const from = activeIndex
    const to = dropIndex
    setActiveName(null)
    setDropIndex(null)
    if (from < 0 || to == null || to === from || to === from + 1) return // dropped in place
    const next = labels.map((l) => l.name)
    const [moved] = next.splice(from, 1)
    next.splice(to > from ? to - 1 : to, 0, moved) // account for the removed slot
    board.reorderLabels(next)
  }

  // Suppress the insertion line where it would be a no-op (right where the card sits).
  const lineAt = (i: number) =>
    dropIndex === i && dropIndex !== activeIndex && dropIndex !== activeIndex + 1

  const openCreate = () => {
    setName('')
    setColor(LABEL_COLORS[0])
    setEditor({ mode: 'create' })
  }
  const openEdit = (l: { name: string; color: string }) => {
    setName(l.name)
    setColor(l.color)
    setEditor({ mode: 'edit', original: l.name })
  }
  const close = () => setEditor(null)

  const save = async () => {
    if (!name.trim() || busy || !editor) return
    setBusy(true)
    try {
      if (editor.mode === 'create') {
        await board.createLabel(name.trim(), color)
        toast({ variant: 'success', title: 'ラベルを追加しました' })
      } else {
        await board.renameLabel(editor.original, { newName: name.trim(), color })
        toast({ variant: 'success', title: 'ラベルを更新しました' })
      }
      close()
    } catch (e) {
      toast({ variant: 'error', title: '保存に失敗', description: errMsg(e) })
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!editor || editor.mode !== 'edit' || busy) return
    setBusy(true)
    try {
      await board.deleteLabel(editor.original)
      toast({ variant: 'success', title: 'ラベルを削除しました' })
      close()
    } catch (e) {
      toast({ variant: 'error', title: '削除に失敗', description: errMsg(e) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto h-full max-w-2xl space-y-4 overflow-y-auto overscroll-y-contain px-4 pb-28 pt-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          className="rounded-lg p-3 text-sub transition hover:bg-panel2 hover:text-ink"
          aria-label="戻る"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-black text-ink">ラベルの編集</h1>
        <Button size="sm" className="ml-auto" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          追加
        </Button>
      </div>

      {labels.length === 0 ? (
        <p className="py-8 text-center text-sm text-sub">
          ラベルがありません。「追加」から作成できます。
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          onDragCancel={() => {
            setActiveName(null)
            setDropIndex(null)
          }}
        >
          <div className="space-y-2">
            {labels.map((l, i) => (
              <Fragment key={l.name}>
                {lineAt(i) && <DropLine />}
                <LabelRow label={l} dragging={activeName === l.name} onEdit={() => openEdit(l)} />
              </Fragment>
            ))}
            {lineAt(labels.length) && <DropLine />}
          </div>

          <DragOverlay dropAnimation={null}>
            {activeLabel ? (
              <div className="fa-card flex items-center gap-2 rounded-2xl border border-line bg-panel p-3.5 shadow-2xl ring-2 ring-accent2/50">
                <GripVertical className="h-5 w-5 text-sub" aria-hidden />
                <LabelChip label={activeLabel} />
                <span className="min-w-0 flex-1 truncate text-sm text-sub">{activeLabel.name}</span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <p className="px-1 text-xs leading-relaxed text-sub">
        ＝ を長押し（PC はドラッグ）して並べ替えできます。順番はこの端末に保存され、ボードのフィルタやラベル付けにも反映されます。名称・色の変更や削除は GitHub の life リポジトリに即反映され、そのラベルが付いた全 Issue に及びます。
      </p>

      <Sheet
        open={editor !== null}
        onOpenChange={(o) => {
          if (!o) close()
        }}
      >
        {editor && (
          <SheetContent title={editor.mode === 'create' ? 'ラベルを追加' : 'ラベルを編集'}>
            <div className="space-y-4">
              <div>
                <FieldLabel htmlFor="lbl-name">ラベル名</FieldLabel>
                <Input
                  id="lbl-name"
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例: 緊急"
                />
              </div>
              <div>
                <FieldLabel>色</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {LABEL_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      aria-label={`色 #${c}`}
                      className={cn(
                        'h-8 w-8 rounded-full border-2 transition',
                        color.toLowerCase() === c.toLowerCase()
                          ? 'scale-110 border-ink'
                          : 'border-transparent',
                      )}
                      style={{ background: `#${c}` }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <FieldLabel>プレビュー</FieldLabel>
                <LabelChip label={{ name: name.trim() || 'ラベル名', color }} />
              </div>
              <div className="flex gap-2 pt-1">
                <Button onClick={save} disabled={busy || !name.trim()} className="flex-1">
                  {busy ? <Spinner className="h-5 w-5" /> : '保存'}
                </Button>
                {editor.mode === 'edit' && (
                  <Button variant="danger" onClick={() => setConfirmDelete(true)} disabled={busy}>
                    <Trash2 className="h-4 w-4" />
                    削除
                  </Button>
                )}
              </div>
            </div>
          </SheetContent>
        )}
      </Sheet>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="ラベルを削除しますか？"
        description={
          editor && editor.mode === 'edit'
            ? `「${editor.original}」を削除します。各 Issue からこのラベルが外れます（Issue 自体は残ります）。`
            : undefined
        }
        confirmLabel="削除する"
        destructive
        onConfirm={remove}
      />
    </div>
  )
}

/** One reorderable label row: a drag handle (＝) plus the chip and an edit button. */
function LabelRow({
  label,
  dragging,
  onEdit,
}: {
  label: Label
  dragging: boolean
  onEdit: () => void
}) {
  const drag = useDraggable({ id: `drag-${label.name}` })
  const drop = useDroppable({ id: `drop-${label.name}` })
  const setRef = (el: HTMLElement | null) => {
    drag.setNodeRef(el)
    drop.setNodeRef(el)
  }
  return (
    <div
      ref={setRef}
      className={cn(
        'fa-card flex items-center gap-2 rounded-2xl border border-line bg-panel p-3.5 transition',
        dragging && 'opacity-40',
      )}
    >
      <button
        {...drag.attributes}
        {...drag.listeners}
        className="-ml-1 cursor-grab touch-none rounded-lg p-2 text-sub transition hover:bg-panel2 hover:text-ink active:cursor-grabbing"
        aria-label={`${label.name} を並べ替え`}
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <LabelChip label={label} />
      <span className="min-w-0 flex-1 truncate text-sm text-sub">{label.name}</span>
      <button
        onClick={onEdit}
        className="rounded-lg p-3 text-sub transition hover:bg-panel2 hover:text-ink"
        aria-label={`${label.name} を編集`}
      >
        <Pencil className="h-4 w-4" />
      </button>
    </div>
  )
}

/** The "drop here" insertion indicator (glowing accent line). */
function DropLine() {
  return <div className="my-0.5 h-1 rounded-full bg-accent2 ring-2 ring-accent2/30" aria-hidden />
}
