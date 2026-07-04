import { describe, expect, it } from 'vitest'
import worker, { TASK_PATH_RE, timingSafeEqual } from './index'
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
