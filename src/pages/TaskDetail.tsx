import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Pencil,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input, Label, Textarea } from '../components/ui/Input'
import { FullSpinner, Spinner } from '../components/ui/Spinner'
import { ErrorState } from '../components/ui/States'
import { LabelToggleChips } from '../components/LabelToggleChips'
import { CommentList } from '../components/CommentList'
import { StatusPickerSheet } from '../components/StatusPickerSheet'
import { useToast } from '../components/ui/Toast'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useBoard } from '../context/BoardContext'
import * as api from '../lib/api'
import { STATUS_META } from '../lib/status'
import { errMsg, haptic } from '../lib/haptics'
import type { Comment, Status, Task } from '../lib/types'

export function TaskDetail() {
  const { number: numStr } = useParams()
  // Guard malformed deep links (e.g. /task/abc, /task/12.5): only positive integer
  // ids are valid issue numbers. Invalid ids short-circuit to not-found below
  // instead of firing a doomed /api/tasks/NaN request.
  const validNumber = numStr !== undefined && /^\d+$/.test(numStr) && Number(numStr) > 0
  const number = validNumber ? Number(numStr) : Number.NaN
  const navigate = useNavigate()
  const board = useBoard()
  const toast = useToast()

  const [task, setTask] = useState<Task | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [picker, setPicker] = useState(false)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [acting, setActing] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)

  const load = useCallback(() => {
    if (!validNumber) {
      setError('タスクが見つかりません')
      setLoading(false)
      return Promise.resolve()
    }
    setLoading(true)
    setError(null)
    return api
      .getTask(number)
      .then(({ task, comments }) => {
        setTask(task)
        setComments(comments)
        setTitle(task.title)
        setBody(task.body)
      })
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false))
  }, [number, validNumber])

  useEffect(() => {
    load()
  }, [load])

  // Warn before a full tab close/reload while there are unsaved edits.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (editing && task && (title !== task.title || body !== task.body)) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [editing, title, body, task])

  if (loading) return <FullSpinner label="読み込み中…" />
  if (error || !task) return <ErrorState message={error ?? 'タスクが見つかりません'} onRetry={load} />

  const meta = STATUS_META[task.status]

  const dirty = editing && (title !== task.title || body !== task.body)
  const goBack = () => {
    if (dirty && !window.confirm('編集中の内容は保存されていません。破棄して戻りますか？')) return
    navigate(-1)
  }

  const pickStatus = async (s: Status) => {
    setPicker(false)
    const prev = task
    setTask({ ...task, status: s })
    haptic(12)
    try {
      const { task: updated } = await api.setStatus(number, s)
      setTask(updated)
      board.updateTaskLocal(updated)
    } catch (e) {
      setTask(prev)
      toast({ variant: 'error', title: 'ステータス変更に失敗', description: errMsg(e) })
    }
  }

  const toggleLabel = async (name: string) => {
    const selected = task.labels.map((l) => l.name)
    const next = selected.includes(name) ? selected.filter((n) => n !== name) : [...selected, name]
    const prev = task
    const objs = next.map((n) => board.labels.find((l) => l.name === n) ?? { name: n, color: '8b97b8' })
    setTask({ ...task, labels: objs })
    try {
      const updated = await board.setTaskLabels(task.number, next)
      setTask(updated)
    } catch {
      setTask(prev) // board.setTaskLabels already showed a toast
    }
  }

  const saveEdit = async () => {
    if (!title.trim() || (title === task.title && body === task.body)) return // no change → no write
    setSaving(true)
    try {
      const { task: updated } = await api.patchTask(number, { title: title.trim(), body })
      setTask(updated)
      board.updateTaskLocal(updated)
      setEditing(false)
      toast({ variant: 'success', title: '保存しました' })
    } catch (e) {
      toast({ variant: 'error', title: '保存に失敗', description: errMsg(e) })
    } finally {
      setSaving(false)
    }
  }

  const toggleClose = async () => {
    const closing = task.state === 'OPEN'
    setActing(true)
    try {
      const { task: updated } = await api.patchTask(number, { state: closing ? 'closed' : 'open' })
      setTask(updated)
      board.updateTaskLocal(updated) // keep in cache; the board hides/shows it per the 完了表示 toggle
      toast({ variant: 'success', title: closing ? '完了にしました' : '未完了に戻しました' })
    } catch (e) {
      toast({ variant: 'error', title: '失敗しました', description: errMsg(e) })
    } finally {
      setActing(false)
    }
  }

  const removeItem = async () => {
    setActing(true)
    try {
      await api.removeFromBoard(number)
      board.removeTaskLocal(number)
      toast({ variant: 'success', title: 'ボードから外しました' })
      navigate('/')
    } catch (e) {
      toast({ variant: 'error', title: '失敗しました', description: errMsg(e) })
    } finally {
      setActing(false)
    }
  }

  const addCmt = async (text: string) => {
    const { comment } = await api.addComment(number, text)
    setComments((cs) => [...cs, comment])
    const next = { ...task, commentCount: task.commentCount + 1 }
    setTask(next)
    board.updateTaskLocal(next)
    toast({ variant: 'success', title: 'コメントしました' })
  }

  return (
    <div className="mx-auto h-full max-w-2xl space-y-4 overflow-y-auto overscroll-y-contain px-4 pb-28 pt-4">
      <div className="flex items-center gap-2">
        <button
          onClick={goBack}
          className="rounded-lg p-3 text-sub transition hover:bg-panel2 hover:text-ink"
          aria-label="戻る"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="text-sm text-sub">#{task.number}</span>
        <a
          href={task.url}
          target="_blank"
          rel="noreferrer"
          className="ml-auto rounded-lg p-3 text-sub transition hover:bg-panel2 hover:text-ink"
          aria-label="GitHub で開く"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      <Card>
        {editing ? (
          <div className="space-y-3">
            <div>
              <Label htmlFor="ed-title">タイトル</Label>
              <Input
                id="ed-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                enterKeyHint="done"
                onKeyDown={(e) => {
                  // Enter saves; ignore the Enter that confirms an IME (Japanese) conversion.
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                    e.preventDefault()
                    saveEdit()
                  }
                }}
              />
            </div>
            <div>
              <Label htmlFor="ed-body">本文</Label>
              <Textarea
                id="ed-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="min-h-[140px]"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={saveEdit} disabled={saving || !title.trim() || !dirty}>
                {saving ? <Spinner className="h-5 w-5" /> : '保存'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setEditing(false)
                  setTitle(task.title)
                  setBody(task.body)
                }}
              >
                <X className="h-4 w-4" />
                キャンセル
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-start gap-2">
              <h1 className="min-w-0 flex-1 text-lg font-bold leading-snug text-ink">{task.title}</h1>
              <button
                onClick={() => setEditing(true)}
                className="shrink-0 rounded-lg p-3 text-sub transition hover:bg-panel2 hover:text-ink"
                aria-label="編集"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setPicker(true)}
                className="relative rounded-full px-3 py-1.5 text-[12px] font-bold before:absolute before:-inset-2 before:content-['']"
                style={{ background: meta.tint, color: meta.dot }}
                aria-label={`ステータス: ${meta.label}（タップで変更）`}
              >
                {meta.label}
              </button>
              {task.state === 'CLOSED' && (
                <span className="rounded-full bg-bad/15 px-2 py-0.5 text-[11px] font-semibold text-bad">
                  完了済み
                </span>
              )}
            </div>
            {task.body.trim() ? (
              <div className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink/90">
                {task.body}
              </div>
            ) : (
              <p className="mt-3 text-sm text-sub">本文なし</p>
            )}
            <div className="mt-4 border-t border-line/60 pt-3">
              <div className="mb-2 text-[13px] font-semibold text-sub">ラベル</div>
              <LabelToggleChips
                selected={task.labels.map((l) => l.name)}
                onToggle={toggleLabel}
                labels={board.labels}
              />
            </div>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-[15px] font-bold text-ink/90">コメント</h2>
        <CommentList comments={comments} onAdd={addCmt} />
      </Card>

      {task.state === 'OPEN' ? (
        <div className="space-y-3">
          <div>
            <Button variant="primary" className="w-full" onClick={toggleClose} disabled={acting}>
              <CheckCircle2 className="h-4 w-4" />
              完了にする
            </Button>
            <p className="mt-1.5 px-1 text-xs leading-relaxed text-sub">
              <span className="font-semibold text-ink">やり終えたとき。</span>
              完了として記録され、ボードから消えます（GitHub に履歴は残るので後から見返せます）。
            </p>
          </div>
          <div className="border-t border-line/50 pt-3">
            <button
              onClick={() => setConfirmRemove(true)}
              disabled={acting}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-bad transition hover:opacity-80 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              ボードから外す
            </button>
            <p className="mt-1.5 px-1 text-xs leading-relaxed text-sub">
              <span className="font-semibold text-ink">やらない／ここで管理しないとき。</span>
              完了にはせず、ボードのカードだけ消します（タスク自体は GitHub に残るので、あとで戻せます）。
            </p>
          </div>
        </div>
      ) : (
        <div>
          <Button variant="primary" className="w-full" onClick={toggleClose} disabled={acting}>
            <RotateCcw className="h-4 w-4" />
            未完了に戻す
          </Button>
          <p className="mt-1.5 px-1 text-xs leading-relaxed text-sub">
            完了を取り消して、もう一度ボードに表示します。
          </p>
        </div>
      )}

      <StatusPickerSheet
        task={picker ? task : null}
        onClose={() => setPicker(false)}
        onPick={pickStatus}
      />
      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title="ボードから外しますか？"
        description="完了にはせず、ボードのカードだけ消します。タスク自体は GitHub に残るので、あとで戻せます。"
        confirmLabel="ボードから外す"
        destructive
        onConfirm={removeItem}
      />
    </div>
  )
}
