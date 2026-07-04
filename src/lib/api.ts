// Typed fetch wrapper to the Cloudflare Worker. The PWA holds no GitHub
// credential — only the Worker URL and the shared passphrase (X-App-Key).

import type { Comment, Label, Meta, NewTask, Status, Task, TaskPatch } from './types'

const KEY_STORAGE = 'ltp-key'
const URL_STORAGE = 'ltp-worker-url'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export function getWorkerUrl(): string {
  const stored = localStorage.getItem(URL_STORAGE)
  return (stored || import.meta.env.VITE_WORKER_URL || '').trim().replace(/\/+$/, '')
}
export function setWorkerUrl(u: string) {
  localStorage.setItem(URL_STORAGE, u.trim().replace(/\/+$/, ''))
}

/**
 * Validate + normalize a user-entered Worker URL. Accepts a bare host (prepends
 * https://), requires https, and reduces to the origin (Workers serve the API at
 * root). Returns the cleaned URL or a human-readable error — so a malformed value
 * is rejected up front instead of failing mysteriously at the auth gate later.
 */
export function normalizeWorkerUrl(input: string): { url: string } | { error: string } {
  let s = input.trim()
  if (!s) return { error: 'URL を入力してください' }
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s
  let u: URL
  try {
    u = new URL(s)
  } catch {
    return { error: 'URL の形式が正しくありません' }
  }
  if (u.protocol !== 'https:') return { error: 'https:// で始まる URL を入力してください' }
  if (!u.hostname.includes('.')) return { error: 'URL の形式が正しくありません' }
  return { url: u.origin }
}
export function getKey(): string {
  return localStorage.getItem(KEY_STORAGE) || ''
}
export function setKey(k: string) {
  localStorage.setItem(KEY_STORAGE, k)
}
export function clearKey() {
  localStorage.removeItem(KEY_STORAGE)
}
export function isConfigured(): boolean {
  return !!getWorkerUrl()
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getWorkerUrl()
  if (!base) throw new ApiError('Worker URL が未設定です（設定画面で入力してください）', 0)
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new ApiError('オフラインです。電波の良い場所で、もう一度お試しください。', 0)
  }
  let res: Response
  try {
    res = await fetch(base + path, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'X-App-Key': getKey(),
        ...(init?.headers ?? {}),
      },
    })
  } catch {
    // fetch rejects on network failure (offline, DNS, server unreachable, CORS block)
    throw new ApiError('接続できませんでした。電波状況を確認して、もう一度お試しください。', 0)
  }
  if (!res.ok) {
    let msg = `通信エラー (HTTP ${res.status})`
    try {
      const b = (await res.json()) as { error?: string }
      if (b?.error) msg = b.error
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(msg, res.status)
  }
  return res.json() as Promise<T>
}

/**
 * Upload one image to the Worker (R2-backed) and get its public URL back.
 * Sends the raw bytes (NOT JSON) — the browser sets Content-Type from the Blob,
 * which the Worker reads to validate the format. Callers embed the URL as Markdown.
 */
export async function uploadImage(file: Blob): Promise<string> {
  const base = getWorkerUrl()
  if (!base) throw new ApiError('Worker URL が未設定です（設定画面で入力してください）', 0)
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new ApiError('オフラインです。電波の良い場所で、もう一度お試しください。', 0)
  }
  let res: Response
  try {
    res = await fetch(base + '/api/upload', {
      method: 'POST',
      // Content-Type comes from the Blob (e.g. image/png); do NOT set application/json here.
      headers: { 'Content-Type': file.type || 'application/octet-stream', 'X-App-Key': getKey() },
      body: file,
    })
  } catch {
    throw new ApiError('接続できませんでした。電波状況を確認して、もう一度お試しください。', 0)
  }
  if (!res.ok) {
    let msg = `アップロードに失敗しました (HTTP ${res.status})`
    try {
      const b = (await res.json()) as { error?: string }
      if (b?.error) msg = b.error
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(msg, res.status)
  }
  const { url } = (await res.json()) as { url: string }
  return url
}

export const getMeta = () => call<Meta>('/api/meta')

export const getBoard = (includeClosed = false) =>
  call<{ tasks: Task[]; statuses: Status[]; truncated?: boolean }>(
    `/api/board${includeClosed ? '?include=closed' : ''}`,
  )

export const getTask = (n: number) => call<{ task: Task; comments: Comment[] }>(`/api/tasks/${n}`)

export const addTask = (b: NewTask) =>
  call<{ task: Task }>('/api/tasks', { method: 'POST', body: JSON.stringify(b) })

export const setStatus = (n: number, status: Status) =>
  call<{ task: Task }>(`/api/tasks/${n}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })

export const patchTask = (n: number, p: TaskPatch) =>
  call<{ task: Task }>(`/api/tasks/${n}`, { method: 'PATCH', body: JSON.stringify(p) })

export const addComment = (n: number, body: string) =>
  call<{ comment: Comment }>(`/api/tasks/${n}/comments`, { method: 'POST', body: JSON.stringify({ body }) })

export const editComment = (id: string, body: string) =>
  call<{ comment: Comment }>(`/api/comments/${id}`, { method: 'PATCH', body: JSON.stringify({ body }) })

export const deleteComment = (id: string) =>
  call<{ ok: true }>(`/api/comments/${id}`, { method: 'DELETE' })

export const removeFromBoard = (n: number) =>
  call<{ ok: true }>(`/api/tasks/${n}/item`, { method: 'DELETE' })

export const setTaskLabels = (n: number, labels: string[]) =>
  call<{ task: Task }>(`/api/tasks/${n}/labels`, { method: 'PUT', body: JSON.stringify({ labels }) })

export const reorderTask = (n: number, itemId: string, afterItemId: string | null) =>
  call<{ ok: true }>(`/api/tasks/${n}/position`, {
    method: 'PATCH',
    body: JSON.stringify({ itemId, afterItemId }),
  })

// ---- labels ----
export const getLabels = () => call<{ labels: Label[] }>('/api/labels')

export const createLabel = (name: string, color: string) =>
  call<{ label: Label }>('/api/labels', { method: 'POST', body: JSON.stringify({ name, color }) })

export const renameLabel = (name: string, patch: { newName?: string; color?: string }) =>
  call<{ label: Label }>(`/api/labels/${encodeURIComponent(name)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })

export const deleteLabel = (name: string) =>
  call<{ ok: true }>(`/api/labels/${encodeURIComponent(name)}`, { method: 'DELETE' })
