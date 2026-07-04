import { useCallback, useRef, useState } from 'react'
import * as api from './api'
import { errMsg } from './haptics'

/** Accepted image MIME types — must match the Worker's allowlist (uploadImage). */
const ACCEPTED = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp'])

/** Pull image files out of a paste/drop payload (ignores non-image items). */
function imageFiles(items: DataTransferItemList | null, files: FileList | null): File[] {
  const out: File[] = []
  // Prefer items (paste gives a synthetic filename); fall back to files (drop).
  if (items) {
    for (const it of items) {
      if (it.kind === 'file' && ACCEPTED.has(it.type)) {
        const f = it.getAsFile()
        if (f) out.push(f)
      }
    }
  }
  if (out.length === 0 && files) {
    for (const f of files) if (ACCEPTED.has(f.type)) out.push(f)
  }
  return out
}

/** Insert `text` into `prev` at [start,end), returning the new string. */
function spliceAt(prev: string, start: number, end: number, text: string): string {
  return prev.slice(0, start) + text + prev.slice(end)
}

/**
 * Wire image paste/drag-drop into a controlled <textarea>.
 *
 * On paste/drop of an image it inserts an "アップロード中…" placeholder at the caret,
 * uploads the file, then swaps the placeholder for `![](url)` Markdown (or removes it
 * on failure). `onChange` MUST accept a functional updater (like a useState setter) so
 * every edit — the initial insert and each async swap — is applied to the freshest
 * value without stale closures or render-time refs. Returns handlers to spread onto
 * the textarea plus `uploading` (uploads in flight — disable submit while > 0).
 */
export function usePasteImage({
  onChange,
  onError,
}: {
  /** Functional state updater for the textarea's value (e.g. React's setState). */
  onChange: (updater: (prev: string) => string) => void
  onError?: (msg: string) => void
}) {
  const [uploading, setUploading] = useState(0)
  const seq = useRef(0)

  const upload = useCallback(
    async (el: HTMLTextAreaElement, files: File[]): Promise<void> => {
      for (const file of files) {
        const id = ++seq.current
        // Unique, human-readable placeholder. The token is matched verbatim on swap.
        const token = `![アップロード中… #${id}]()`
        // Insert at the caret, computed against whatever the value is right now.
        const start = el.selectionStart ?? Number.MAX_SAFE_INTEGER
        const end = el.selectionEnd ?? start
        onChange((prev) => {
          const s = Math.min(start, prev.length)
          const e = Math.min(end, prev.length)
          return spliceAt(prev, s, e, token + '\n')
        })
        setUploading((n) => n + 1)
        try {
          const url = await api.uploadImage(file)
          onChange((prev) => prev.replace(token, `![](${url})`))
        } catch (err) {
          // Pull the placeholder back out (with or without its trailing newline).
          onChange((prev) => prev.replace(token + '\n', '').replace(token, ''))
          onError?.(errMsg(err))
        } finally {
          setUploading((n) => n - 1)
        }
      }
    },
    [onChange, onError],
  )

  const onPaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>): void => {
      const files = imageFiles(e.clipboardData?.items ?? null, e.clipboardData?.files ?? null)
      if (files.length === 0) return // let normal text paste through
      e.preventDefault()
      void upload(e.currentTarget, files)
    },
    [upload],
  )

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLTextAreaElement>): void => {
      const files = imageFiles(e.dataTransfer?.items ?? null, e.dataTransfer?.files ?? null)
      if (files.length === 0) return
      e.preventDefault()
      void upload(e.currentTarget, files)
    },
    [upload],
  )

  // Suppress the browser's "open file" default so the textarea can accept the drop.
  const onDragOver = useCallback((e: React.DragEvent<HTMLTextAreaElement>): void => {
    if (Array.from(e.dataTransfer?.items ?? []).some((it) => it.kind === 'file')) {
      e.preventDefault()
    }
  }, [])

  return { onPaste, onDrop, onDragOver, uploading }
}
