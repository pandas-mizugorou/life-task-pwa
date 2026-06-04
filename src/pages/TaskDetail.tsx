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
import { LabelChip } from '../components/LabelChip'
import { CommentList } from '../components/CommentList'
import { StatusPickerSheet } from '../components/StatusPickerSheet'
import { useToast } from '../components/ui/Toast'
import { useBoard } from '../context/BoardContext'
import * as api from '../lib/api'
import { STATUS_META } from '../lib/status'
import { errMsg, haptic } from '../lib/haptics'
import type { Comment, Status, Task } from '../lib/types'

export function TaskDetail() {
  const { number: numStr } = useParams()
  const number = Number(numStr)
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

  const load = useCallback(() => {
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
  }, [number])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <FullSpinner label="読み込み中…" />
  if (error || !task) return <ErrorState message={error ?? 'タスクが見つかりません'} onRetry={load} />

  const meta = STATUS_META[task.status]

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

  const saveEdit = async () => {
    if (!title.trim()) return
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
      toast({ variant: 'success', title: closing ? '完了にしました' : '再開しました' })
    } catch (e) {
      toast({ variant: 'error', title: '失敗しました', description: errMsg(e) })
    } finally {
      setActing(false)
    }
  }

  const removeItem = async () => {
    if (!window.confirm('このタスクをボードから外しますか？（Issue は GitHub に残ります）')) return
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
          onClick={() => navigate(-1)}
          className="rounded-lg p-2 text-sub transition hover:bg-panel2 hover:text-ink"
          aria-label="戻る"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="text-sm text-sub">#{task.number}</span>
        <a
          href={task.url}
          target="_blank"
          rel="noreferrer"
          className="ml-auto rounded-lg p-2 text-sub transition hover:bg-panel2 hover:text-ink"
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
              <Input id="ed-title" value={title} onChange={(e) => setTitle(e.target.value)} />
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
              <Button onClick={saveEdit} disabled={saving || !title.trim()}>
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
                className="shrink-0 rounded-lg p-1.5 text-sub transition hover:bg-panel2 hover:text-ink"
                aria-label="編集"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setPicker(true)}
                className="rounded-full px-2.5 py-1 text-[12px] font-bold"
                style={{ background: meta.tint, color: meta.dot }}
              >
                {meta.label}
              </button>
              {task.labels.map((l) => (
                <LabelChip key={l.name} label={l} />
              ))}
              {task.state === 'CLOSED' && (
                <span className="rounded-full bg-bad/15 px-2 py-0.5 text-[11px] font-semibold text-bad">
                  クローズ済み
                </span>
              )}
            </div>
            {task.body.trim() ? (
              <div className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink/90">
                {task.body}
              </div>
            ) : (
              <p className="mt-3 text-sm text-sub/60">本文なし</p>
            )}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-[15px] font-bold text-ink/90">コメント</h2>
        <CommentList comments={comments} onAdd={addCmt} />
      </Card>

      <div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={task.state === 'OPEN' ? 'secondary' : 'primary'}
            onClick={toggleClose}
            disabled={acting}
          >
            {task.state === 'OPEN' ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                完了にする
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4" />
                再開する
              </>
            )}
          </Button>
          <Button variant="danger" onClick={removeItem} disabled={acting}>
            <Trash2 className="h-4 w-4" />
            ボードから外す
          </Button>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-sub/80">
          「完了にする」は Issue をクローズ（履歴は残ります）。「ボードから外す」はボードから取り除くだけで Issue は残ります。
          <span className="font-semibold text-sub">アプリから Issue の完全削除は行いません</span>（必要なら github.com で削除）。
        </p>
      </div>

      <StatusPickerSheet
        task={picker ? task : null}
        onClose={() => setPicker(false)}
        onPick={pickStatus}
      />
    </div>
  )
}
