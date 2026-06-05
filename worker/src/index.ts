// HTTP router for the GitHub task proxy. Validates the X-App-Key passphrase on
// every request, then dispatches to github.ts. The PWA never speaks GraphQL.

import type { Env } from './types'
import * as github from './github'
import { ApiError, STATUS_ORDER } from './github'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(request, env)

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })

    const url = new URL(request.url)
    if (!url.pathname.startsWith('/api/')) return json({ error: 'not found' }, 404, cors)

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

    try {
      const result = await route(request, env, url)
      return json(result, 200, cors)
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 500
      return json({ error: (e as Error)?.message ?? 'サーバーエラー' }, status, cors)
    }
  },
}

async function route(request: Request, env: Env, url: URL): Promise<unknown> {
  const p = url.pathname
  const m = request.method

  if (p === '/api/meta' && m === 'GET') return github.getMeta(env)

  if (p === '/api/board' && m === 'GET') {
    const includeClosed = url.searchParams.get('include') === 'closed'
    return { tasks: await github.getBoard(env, includeClosed), statuses: STATUS_ORDER }
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

  const mm = p.match(/^\/api\/tasks\/(\d+)(\/status|\/comments|\/item|\/labels|\/position)?$/)
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
async function timingSafeEqual(a: string, b: string): Promise<boolean> {
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
