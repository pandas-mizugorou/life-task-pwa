import { useRef, useState } from 'react'
import { ImagePlus, Send } from 'lucide-react'
import { Textarea } from './ui/Input'
import { Button } from './ui/Button'
import { Spinner } from './ui/Spinner'
import { Markdown } from './Markdown'
import { useAutoGrow } from '../lib/useAutoGrow'
import { imageFiles, usePasteImage } from '../lib/usePasteImage'
import type { Comment } from '../lib/types'

export function CommentList({
  comments,
  onAdd,
  onError,
  onImageClick,
}: {
  comments: Comment[]
  onAdd: (body: string) => Promise<void>
  /** Surface an image-upload failure (parent shows a toast). */
  onError?: (msg: string) => void
  /** Open a tapped comment image in a lightbox (handled by the parent). */
  onImageClick?: (src: string, alt: string) => void
}) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const ref = useAutoGrow(text)
  const paste = usePasteImage({ onChange: setText, onError })
  // Hidden file input driven by the "写真を追加" button — the phone-friendly way to
  // attach (opens the photo library / camera sheet) alongside paste & drop.
  const fileRef = useRef<HTMLInputElement>(null)
  const onPickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = imageFiles(null, e.target.files) // re-check MIME (input accept is loose)
    ref.current?.focus() // restore the caret so the image inserts where they were typing
    if (files.length && ref.current) void paste.upload(ref.current, files)
    e.target.value = '' // let the same photo be picked again next time
  }

  const submit = async () => {
    if (!text.trim() || busy || paste.uploading > 0) return // wait for uploads to resolve
    const body = text.trim()
    setText('') // optimistic: clear instantly; restore if the send fails
    setBusy(true)
    try {
      await onAdd(body)
    } catch {
      setText(body) // onAdd (parent) already surfaced the error toast
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="space-y-3">
        {comments.length === 0 && <p className="text-sm text-sub">コメントはまだありません。</p>}
        {comments.map((c) => (
          <div key={c.id} className="rounded-xl border border-line bg-panel2/60 p-3">
            <div className="mb-1 flex items-center gap-2 text-xs text-sub">
              <span className="font-semibold text-ink/80">{c.author}</span>
              <span>{fmtDate(c.createdAt)}</span>
            </div>
            <Markdown onImageClick={onImageClick}>{c.body}</Markdown>
          </div>
        ))}
      </div>
      <div className="mt-3">
        <Textarea
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPaste={paste.onPaste}
          onDrop={paste.onDrop}
          onDragOver={paste.onDragOver}
          className="max-h-[40vh] resize-none"
          onKeyDown={(e) => {
            // Plain Enter = newline (multi-line comments); ⌘/Ctrl+Enter sends.
            // Ignore the Enter that confirms an IME (Japanese) conversion.
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !e.nativeEvent.isComposing) {
              e.preventDefault()
              void submit()
            }
          }}
          placeholder="コメントを書く…（⌘/Ctrl+Enter で送信）"
        />
        {/* Hidden picker: the button below drives it. accept=image/* + no capture ⇒
            iOS shows the photo-library / camera sheet; multiple allows several shots. */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={onPickPhoto}
        />
        <div className="mt-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={paste.uploading > 0}
            aria-label="写真を追加"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-semibold text-sub transition hover:bg-panel2 hover:text-ink disabled:opacity-50"
          >
            {paste.uploading > 0 ? (
              <>
                <Spinner className="h-3.5 w-3.5" /> 追加中…
              </>
            ) : (
              <>
                <ImagePlus className="h-4 w-4" /> 写真を追加
              </>
            )}
          </button>
          <Button onClick={submit} disabled={busy || !text.trim() || paste.uploading > 0} size="sm">
            {busy ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <>
                <Send className="h-4 w-4" /> コメント
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`
}
