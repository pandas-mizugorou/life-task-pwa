import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input, Label as FieldLabel } from '../components/ui/Input'
import { Spinner } from '../components/ui/Spinner'
import { Sheet, SheetContent } from '../components/ui/Sheet'
import { LabelChip } from '../components/LabelChip'
import { useToast } from '../components/ui/Toast'
import { useBoard } from '../context/BoardContext'
import { cn } from '../lib/cn'
import { errMsg } from '../lib/haptics'
import { LABEL_COLORS } from '../lib/labels'

type Editor = { mode: 'create' } | { mode: 'edit'; original: string }

export function LabelManager() {
  const board = useBoard()
  const toast = useToast()
  const navigate = useNavigate()

  const [editor, setEditor] = useState<Editor | null>(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState(LABEL_COLORS[0])
  const [busy, setBusy] = useState(false)

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
    if (
      !window.confirm(
        `ラベル「${editor.original}」を削除しますか？\n各 Issue からこのラベルが外れます（Issue 自体は残ります）。`,
      )
    )
      return
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
          className="rounded-lg p-2 text-sub transition hover:bg-panel2 hover:text-ink"
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

      <div className="space-y-2">
        {board.labels.length === 0 && (
          <p className="py-8 text-center text-sm text-sub">
            ラベルがありません。「追加」から作成できます。
          </p>
        )}
        {board.labels.map((l) => (
          <Card key={l.name} className="flex items-center gap-3 p-3.5">
            <LabelChip label={l} />
            <span className="min-w-0 flex-1 truncate text-sm text-sub">{l.name}</span>
            <button
              onClick={() => openEdit(l)}
              className="rounded-lg p-2 text-sub transition hover:bg-panel2 hover:text-ink"
              aria-label={`${l.name} を編集`}
            >
              <Pencil className="h-4 w-4" />
            </button>
          </Card>
        ))}
      </div>

      <p className="px-1 text-xs leading-relaxed text-sub/70">
        ラベルは GitHub の life リポジトリに即反映されます。名称・色の変更や削除は、そのラベルが付いた全 Issue に反映されます。
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
                  <Button variant="danger" onClick={remove} disabled={busy}>
                    <Trash2 className="h-4 w-4" />
                    削除
                  </Button>
                )}
              </div>
            </div>
          </SheetContent>
        )}
      </Sheet>
    </div>
  )
}
