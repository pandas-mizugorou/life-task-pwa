// Typed fetch wrapper to the Cloudflare Worker. The PWA holds no GitHub
// credential — only the Worker URL and the shared passphrase (X-App-Key).

import type { Comment, Meta, NewTask, Status, Task, TaskPatch } from './types'

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
  const res = await fetch(base + path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-App-Key': getKey(),
      ...(init?.headers ?? {}),
    },
  })
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

export const getMeta = () => call<Meta>('/api/meta')

export const getBoard = (includeClosed = false) =>
  call<{ tasks: Task[]; statuses: Status[] }>(`/api/board${includeClosed ? '?include=closed' : ''}`)

export const getTask = (n: number) => call<{ task: Task; comments: Comment[] }>(`/api/tasks/${n}`)

export const addTask = (b: NewTask) =>
  call<{ task: Task }>('/api/tasks', { method: 'POST', body: JSON.stringify(b) })

export const setStatus = (n: number, status: Status) =>
  call<{ task: Task }>(`/api/tasks/${n}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })

export const patchTask = (n: number, p: TaskPatch) =>
  call<{ task: Task }>(`/api/tasks/${n}`, { method: 'PATCH', body: JSON.stringify(p) })

export const addComment = (n: number, body: string) =>
  call<{ comment: Comment }>(`/api/tasks/${n}/comments`, { method: 'POST', body: JSON.stringify({ body }) })

export const removeFromBoard = (n: number) =>
  call<{ ok: true }>(`/api/tasks/${n}/item`, { method: 'DELETE' })
