import { describe, expect, it } from 'vitest'
import worker, { COMMENT_PATH_RE, TASK_PATH_RE, timingSafeEqual } from './index'
import type { Env } from './types'

// A no-op ExecutionContext for the fetch handler (only /api/image uses waitUntil).
const ctx = { waitUntil() {}, passThroughOnException() {} } as unknown as ExecutionContext

describe('GET /api/health', () => {
  it('returns ok without authentication', async () => {
    const res = await worker.fetch(new Request('https://x/api/health'), {} as Env, ctx)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })
  it('does not bypass auth for other routes', async () => {
    const res = await worker.fetch(new Request('https://x/api/board'), {} as Env, ctx)
    expect(res.status).toBe(401)
  })
})

describe('POST /api/push/send auth', () => {
  const body = JSON.stringify({ title: 't', body: 'b' })
  it('401s when NOTIFY_KEY is unset (no key configured)', async () => {
    const res = await worker.fetch(
      new Request('https://x/api/push/send', { method: 'POST', body }),
      {} as Env,
      ctx,
    )
    expect(res.status).toBe(401)
  })
  it('401s when X-Notify-Key does not match', async () => {
    const res = await worker.fetch(
      new Request('https://x/api/push/send', {
        method: 'POST',
        headers: { 'X-Notify-Key': 'wrong' },
        body,
      }),
      { NOTIFY_KEY: 'right' } as Env,
      ctx,
    )
    expect(res.status).toBe(401)
  })
  it('does not require the X-App-Key passphrase (separate gate)', async () => {
    // With the correct notify key but no PUSH_SUBS binding, it passes auth and
    // fails at send with 503 — proving the app-key gate was not what blocked it.
    const res = await worker.fetch(
      new Request('https://x/api/push/send', {
        method: 'POST',
        headers: { 'X-Notify-Key': 'right' },
        body,
      }),
      { NOTIFY_KEY: 'right' } as Env,
      ctx,
    )
    expect(res.status).toBe(503)
  })
})

describe('POST /api/capture (quick-capture / N-11)', () => {
  const cap = (headers: Record<string, string>, body: unknown, env: Partial<Env>) =>
    worker.fetch(
      new Request('https://x/api/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
      }),
      env as Env,
      ctx,
    )

  it('401s with no credentials', async () => {
    const res = await cap({}, { title: 't' }, { APP_PASSPHRASE: 'pass', CAPTURE_TOKEN: 'cap' })
    expect(res.status).toBe(401)
  })
  it('401s with a wrong X-Capture-Token', async () => {
    const res = await cap({ 'X-Capture-Token': 'nope' }, { title: 't' }, { CAPTURE_TOKEN: 'cap' })
    expect(res.status).toBe(401)
  })
  it('401s with a wrong X-App-Key when no CAPTURE_TOKEN is set', async () => {
    const res = await cap({ 'X-App-Key': 'nope' }, { title: 't' }, { APP_PASSPHRASE: 'pass' })
    expect(res.status).toBe(401)
  })
  it('passes auth via X-Capture-Token, then 400s on empty title (no GitHub call)', async () => {
    const res = await cap({ 'X-Capture-Token': 'cap' }, { title: '' }, { CAPTURE_TOKEN: 'cap' })
    expect(res.status).toBe(400)
  })
  it('passes auth via X-App-Key, then 400s on empty title (no GitHub call)', async () => {
    const res = await cap({ 'X-App-Key': 'pass' }, { title: '   ' }, { APP_PASSPHRASE: 'pass' })
    expect(res.status).toBe(400)
  })
  it('400s on an over-long title (validation before network)', async () => {
    const res = await cap(
      { 'X-Capture-Token': 'cap' },
      { title: 'x'.repeat(201) },
      { CAPTURE_TOKEN: 'cap' },
    )
    expect(res.status).toBe(400)
  })
})

describe('TASK_PATH_RE', () => {
  it('matches a bare task path', () => {
    const m = '/api/tasks/123'.match(TASK_PATH_RE)
    expect(m?.[1]).toBe('123')
    expect(m?.[2]).toBeUndefined()
  })
  it('matches each sub-resource', () => {
    for (const sub of ['/status', '/comments', '/item', '/labels', '/position']) {
      const m = `/api/tasks/7${sub}`.match(TASK_PATH_RE)
      expect(m?.[1]).toBe('7')
      expect(m?.[2]).toBe(sub)
    }
  })
  it('rejects non-numeric ids and unknown sub-paths', () => {
    expect('/api/tasks/abc'.match(TASK_PATH_RE)).toBeNull()
    expect('/api/tasks/1/bogus'.match(TASK_PATH_RE)).toBeNull()
    expect('/api/tasks/'.match(TASK_PATH_RE)).toBeNull()
  })
})

describe('COMMENT_PATH_RE', () => {
  it('matches a numeric comment id and captures it', () => {
    const m = '/api/comments/123456'.match(COMMENT_PATH_RE)
    expect(m?.[1]).toBe('123456')
  })
  it('rejects non-numeric ids and extra segments (no path injection)', () => {
    expect('/api/comments/abc'.match(COMMENT_PATH_RE)).toBeNull()
    expect('/api/comments/123/extra'.match(COMMENT_PATH_RE)).toBeNull()
    expect('/api/comments/'.match(COMMENT_PATH_RE)).toBeNull()
    expect('/api/comments/12x'.match(COMMENT_PATH_RE)).toBeNull()
    expect('/api/comments/../secrets'.match(COMMENT_PATH_RE)).toBeNull()
  })
})

describe('timingSafeEqual', () => {
  it('is true for equal strings', async () => {
    expect(await timingSafeEqual('secret-123', 'secret-123')).toBe(true)
  })
  it('is false for different strings (including different lengths)', async () => {
    expect(await timingSafeEqual('secret-123', 'secret-124')).toBe(false)
    expect(await timingSafeEqual('short', 'longer-string')).toBe(false)
    expect(await timingSafeEqual('', 'x')).toBe(false)
  })
})
