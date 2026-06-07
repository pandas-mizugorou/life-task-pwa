import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Reorder, useDragControls } from 'framer-motion'
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
import { errMsg, haptic } from '../lib/haptics'
import { LABEL_COLORS } from '../lib/labels'
import type { Label } from '../lib/types'

type Editor = { mode: 'create' } | { mode: 'edit'; original: string }

export function LabelManager() {
  const board = useBoard()
  const toast = useToast()
  const navigate = useNavigate()

  const [editor, setEditor] = useState<Editor | null>(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState(LABEL_COLORS[0])
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Live reorder: a local name order that the drag mutates in real time (rows slide
  // out of the way as you move). Re-sync from the board whenever the label set
  // changes and we're not mid-drag; persist to the device order only on drop.
  const [order, setOrder] = useState<string[]>(() => board.labels.map((l) => l.name))
  const draggingRef = useRef(false)
  const orderRef = useRef(order)
  useEffect(() => {
    orderRef.current = order
  }, [order])
  useEffect(() => {
    if (draggingRef.current) return
    setOrder(board.labels.map((l) => l.name))
  }, [board.labels])

  const labelByName = useMemo(
    () => new Map(board.labels.map((l) => [l.name, l] as const)),
    [board.labels],
  )

  const onDragStart = () => {
    draggingRef.current = true
    haptic(8)
  }
  const persistOrder = () => {
    draggingRef.current = false
    const next = orderRef.current
    const cur = board.labels.map((l) => l.name)
    const changed = next.length !== cur.length || next.some((n, i) => n !== cur[i])
    if (changed) board.reorderLabels(next)
  }

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

      {board.labels.length === 0 ? (
        <p className="py-8 text-center text-sm text-sub">
          ラベルがありません。「追加」から作成できます。
        </p>
      ) : (
        <Reorder.Group
          as="div"
          axis="y"
          values={order}
          onReorder={setOrder}
          className="space-y-2"
        >
          {order.map((nm) => {
            const l = labelByName.get(nm)
            if (!l) return null
            return (
              <LabelRow
                key={nm}
                name={nm}
                label={l}
                onEdit={() => openEdit(l)}
                onDragStart={onDragStart}
                onDragEnd={persistOrder}
              />
            )
          })}
        </Reorder.Group>
      )}

      <div className="space-y-1.5 px-1 text-xs leading-relaxed text-sub">
        <p>
          ＝ をドラッグで並び替え。順番は<span className="font-semibold text-ink/80">この端末のみ</span>
          に保存され、ボードのフィルタやラベル付けの表示順に反映されます。
        </p>
        <p>
          名称・色の変更と削除は<span className="font-semibold text-ink/80">GitHub に即反映</span>
          され、そのラベルが付いた全 Issue に及びます。
        </p>
      </div>

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

/** One reorderable label row. Drag is started only from the ＝ handle, so the edit
 *  button stays tappable and the page scrolls normally elsewhere. */
function LabelRow({
  name,
  label,
  onEdit,
  onDragStart,
  onDragEnd,
}: {
  name: string
  label: Label
  onEdit: () => void
  onDragStart: () => void
  onDragEnd: () => void
}) {
  const controls = useDragControls()
  return (
    <Reorder.Item
      as="div"
      value={name}
      dragListener={false}
      dragControls={controls}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      whileDrag={{ scale: 1.03, boxShadow: '0 12px 30px rgba(0,0,0,0.35)' }}
      className="fa-card flex touch-pan-y items-center gap-2 rounded-2xl border border-line bg-panel p-3.5"
    >
      <button
        onPointerDown={(e) => controls.start(e)}
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
    </Reorder.Item>
  )
}
