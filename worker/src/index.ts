// HTTP router for the GitHub task proxy. Validates the X-App-Key passphrase on
// every request, then dispatches to github.ts. The PWA never speaks GraphQL.

import type { Env } from './types'
import * as github from './github'
import { ApiError, STATUS_ORDER } from './github'

/** Routes for /api/tasks/:number and its sub-resources (exported for tests). */
export const TASK_PATH_RE =
  /^\/api\/tasks\/(\d+)(\/status|\/comments|\/item|\/labels|\/position)?$/

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const cors = corsHeaders(request, env)

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })

    const url = new URL(request.url)
    if (!url.pathname.startsWith('/api/')) return json({ error: 'not found' }, 404, cors)

    // Unauthenticated liveness probe — no secrets, no GitHub call. For uptime monitors.
    if (url.pathname === '/api/health' && request.method === 'GET') {
      return json({ ok: true }, 200, cors)
    }

    // Signed image proxy — served BEFORE the X-App-Key gate because a browser <img>
    // can't send that header. Access is instead proven by the HMAC `sig` query
    // param (keyed by APP_PASSPHRASE), which github.fetchImage verifies. Cached at
    // the edge so repeat views don't re-hit GitHub. Image bytes are non-sensitive
    // to CORS (an <img> load isn't a CORS-gated fetch), but we still emit `cors`.
    if (url.pathname.startsWith('/api/image/') && request.method === 'GET') {
      const cache = caches.default
      const cached = await cache.match(request)
      if (cached) return cached
      try {
        const path = decodeURIComponent(url.pathname.slice('/api/image/'.length))
        const sig = url.searchParams.get('sig') ?? ''
        const res = await github.fetchImage(env, path, sig)
        // Attach CORS + cache the successful image response for next time.
        for (const [k, v] of Object.entries(cors)) res.headers.set(k, v)
        ctx.waitUntil(cache.put(request, res.clone()))
        return res
      } catch (e) {
        const isApi = e instanceof ApiError
        const status = isApi ? e.status : 500
        const message = isApi ? e.message : 'サーバーエラーが発生しました'
        if (status >= 500) {
          const detail = isApi ? e.detail : e instanceof Error ? `${e.message}\n${e.stack ?? ''}` : String(e)
          console.error(`[life-task-api] GET ${url.pathname} -> ${status}: ${message}` + (detail ? ` :: ${detail}` : ''))
        }
        return json({ error: message }, status, cors)
      }
    }

    // ---- auth: constant-time passphrase check, with per-IP throttling of failures ----
    const key = request.headers.get('X-App-Key') ?? ''
    if (!env.APP_PASSPHRASE || !(await timingSafeEqual(key, env.APP_PASSPHRASE))) {
      // Brute-force guard: count failed attempts per IP and 429 once over the limit.
      // No-op if the RATE_LIMITER binding isn't configured (older deploy / local dev).
      if (env.RATE_LIMITER) {
        const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
        const { success } = await env.RATE_LIMITER.limit({ key: `auth:${ip}` })
        if (!success) {
          return json(
            { error: '試行回数が多すぎます。しばらくしてから再度お試しください。' },
            429,
            cors,
          )
        }
      }
      return json({ error: '認証に失敗しました' }, 401, cors)
    }

    // Image upload is binary and larger than the JSON limit below — handle it here,
    // AFTER auth but BEFORE the 64KB JSON guard. github.uploadImage enforces its own
    // (image-appropriate) size + MIME limits.
    if (url.pathname === '/api/upload' && request.method === 'POST') {
      try {
        const contentType = (request.headers.get('Content-Type') ?? '').split(';')[0].trim()
        const bytes = await request.arrayBuffer()
        const imageUrl = await github.uploadImage(env, bytes, contentType)
        return json({ url: imageUrl }, 200, cors)
      } catch (e) {
        const isApi = e instanceof ApiError
        const status = isApi ? e.status : 500
        const message = isApi ? e.message : 'サーバーエラーが発生しました'
        if (status >= 500) {
          const detail = isApi ? e.detail : e instanceof Error ? `${e.message}\n${e.stack ?? ''}` : String(e)
          console.error(`[life-task-api] POST /api/upload -> ${status}: ${message}` + (detail ? ` :: ${detail}` : ''))
        }
        return json({ error: message }, status, cors)
      }
    }

    // Reject oversized bodies (defense-in-depth; titles/comments/labels are all small).
    const contentLength = Number(request.headers.get('Content-Length') ?? '0')
    if (contentLength > 64 * 1024) return json({ error: 'リクエストが大きすぎます' }, 413, cors)

    try {
      const result = await route(request, env, url)
      return json(result, 200, cors)
    } catch (e) {
      if (e instanceof SyntaxError) return json({ error: 'リクエスト形式が正しくありません' }, 400, cors)
      const isApi = e instanceof ApiError
      const status = isApi ? e.status : 500
      const message = isApi ? e.message : 'サーバーエラーが発生しました'
      // Server-side only: log detail for diagnosis; it is never returned to the client.
      const detail = isApi
        ? e.detail
        : e instanceof Error
          ? `${e.message}\n${e.stack ?? ''}`
          : String(e)
      if (status >= 500 || status === 429) {
        console.error(
          `[life-task-api] ${request.method} ${url.pathname} -> ${status}: ${message}` +
            (detail ? ` :: ${detail}` : ''),
        )
      }
      return json({ error: message }, status, cors)
    }
  },
}

async function route(request: Request, env: Env, url: URL): Promise<unknown> {
  const p = url.pathname
  const m = request.method

  if (p === '/api/meta' && m === 'GET') return github.getMeta(env)

  if (p === '/api/board' && m === 'GET') {
    const includeClosed = url.searchParams.get('include') === 'closed'
    const { tasks, truncated } = await github.getBoard(env, includeClosed)
    return { tasks, statuses: STATUS_ORDER, truncated }
  }

  if (p === '/api/labels' && m === 'GET') return { labels: await github.listLabels(env) }
  if (p === '/api/labels' && m === 'POST') {
    const b = (await request.json()) as any
    return { label: await github.createLabel(env, b) }
  }
  const lm = p.match(/^\/api\/labels\/(.+)$/)
  if (lm) {
    const name = decodeURIComponent(lm[1])
    if (m === 'PATCH') {
      const b = (await request.json()) as any
      return { label: await github.renameLabel(env, name, b) }
    }
    if (m === 'DELETE') {
      await github.deleteLabel(env, name)
      return { ok: true }
    }
  }

  if (p === '/api/tasks' && m === 'POST') {
    const b = (await request.json()) as any
    return { task: await github.createTask(env, b) }
  }

  const mm = p.match(TASK_PATH_RE)
  if (mm) {
    const number = parseInt(mm[1], 10)
    const sub = mm[2]
    if (!sub && m === 'GET') return github.getTaskDetail(env, number)
    if (!sub && m === 'PATCH') {
      const b = (await request.json()) as any
      return { task: await github.patchTask(env, number, b) }
    }
    if (sub === '/labels' && m === 'PUT') {
      const b = (await request.json()) as any
      return { task: await github.setTaskLabels(env, number, b?.labels) }
    }
    if (sub === '/position' && m === 'PATCH') {
      const b = (await request.json()) as any
      await github.reorderTask(env, b?.itemId, b?.afterItemId)
      return { ok: true }
    }
    if (sub === '/status' && m === 'PATCH') {
      const b = (await request.json()) as any
      return { task: await github.setStatus(env, number, b?.status) }
    }
    if (sub === '/comments' && m === 'POST') {
      const b = (await request.json()) as any
      return { comment: await github.addComment(env, number, b?.body) }
    }
    if (sub === '/item' && m === 'DELETE') {
      await github.removeFromBoard(env, number)
      return { ok: true }
    }
  }

  throw new ApiError('not found', 404)
}

// ---- helpers ----------------------------------------------------------------
function json(data: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  })
}

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin') ?? ''
  const allowed = (env.ALLOWED_ORIGIN ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-App-Key',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
  // Fail closed: only emit Access-Control-Allow-Origin when the request's Origin is
  // explicitly allowlisted. Unset or non-matching ALLOWED_ORIGIN => no CORS header =>
  // browsers block cross-origin calls. List "*" to intentionally allow any origin
  // (the X-App-Key passphrase stays the real gate for non-browser callers).
  if (allowed.includes('*')) headers['Access-Control-Allow-Origin'] = '*'
  else if (origin && allowed.includes(origin)) headers['Access-Control-Allow-Origin'] = origin
  return headers
}

/** Compare two strings in constant time via SHA-256 digests (avoids timing/length leaks). */
export async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder()
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b)),
  ])
  const va = new Uint8Array(ha)
  const vb = new Uint8Array(hb)
  let diff = 0
  for (let i = 0; i < va.length; i++) diff |= va[i] ^ vb[i]
  return diff === 0
}
