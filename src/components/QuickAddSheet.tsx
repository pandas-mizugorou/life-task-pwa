import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { Sheet, SheetContent } from './ui/Sheet'
import { Input, Label } from './ui/Input'
import { Select } from './ui/Select'
import { Button } from './ui/Button'
import { Spinner } from './ui/Spinner'
import { LabelToggleChips } from './LabelToggleChips'
import { useToast } from './ui/Toast'
import { useBoard } from '../context/BoardContext'
import { ACTIVE_STATUSES, STATUS_META } from '../lib/status'
import { errMsg, haptic } from '../lib/haptics'
import type { Status } from '../lib/types'

export function QuickAddSheet({
  open,
  onClose,
  initialStatus = 'Backlog',
}: {
  open: boolean
  onClose: () => void
  initialStatus?: Status
}) {
  const board = useBoard()
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [labels, setLabels] = useState<string[]>([])
  const [status, setStatus] = useState<Status>('Backlog')
  const [busy, setBusy] = useState(false)

  // Start each open fresh, with the status of the column that triggered it.
  useEffect(() => {
    if (open) {
      setTitle('')
      setLabels([])
      setStatus(initialStatus)
    }
  }, [open, initialStatus])

  const toggleLabel = (name: string) =>
    setLabels((s) => (s.includes(name) ? s.filter((n) => n !== name) : [...s, name]))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || busy) return
    setBusy(true)
    try {
      await board.addTask({ title: title.trim(), status, labels })
      haptic(12)
      toast({ variant: 'success', title: '追加しました' })
      onClose()
    } catch (e) {
      toast({ variant: 'error', title: '追加に失敗', description: errMsg(e) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <SheetContent title="タスクを追加">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="qa-title">タイトル</Label>
            <Input
              id="qa-title"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="何をする？"
            />
          </div>
          <div>
            <Label>ラベル（任意・複数可）</Label>
            <LabelToggleChips selected={labels} onToggle={toggleLabel} labels={board.labels} />
          </div>
          <div>
            <Label htmlFor="qa-status">ステータス</Label>
            <Select id="qa-status" value={status} onChange={(e) => setStatus(e.target.value as Status)}>
              {ACTIVE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_META[s].label}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={busy || !title.trim()}>
            {busy ? (
              <Spinner className="h-5 w-5" />
            ) : (
              <>
                <Plus className="h-4 w-4" /> 追加
              </>
            )}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
