import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Env } from './types'

// Stub the VAPID crypto so tests don't need real keys — we only assert the KV
// bookkeeping and fan-out logic here, not the (library-owned) payload encryption.
vi.mock('@block65/webcrypto-web-push', () => ({
  buildPushPayload: vi.fn(async () => ({ method: 'POST', headers: {}, body: '' })),
}))

import { parseSendBody, sendToAll, subscribe, unsubscribe } from './push'
import { ApiError } from './github'

/** Minimal in-memory KVNamespace covering put/get/delete/list(prefix,cursor). */
function fakeKv() {
  const store = new Map<string, string>()
  return {
    store,
    async get(k: string) {
      return store.get(k) ?? null
    },
    async put(k: string, v: string) {
      store.set(k, v)
    },
    async delete(k: string) {
      store.delete(k)
    },
    async list({ prefix = '' }: { prefix?: string; cursor?: string } = {}) {
      const keys = [...store.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name }))
      return { keys, list_complete: true as const, cursor: undefined }
    },
  }
}

const validSub = {
  endpoint: 'https://push.example.com/abc',
  keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
}

function envWith(kv: ReturnType<typeof fakeKv>): Env {
  return {
    PUSH_SUBS: kv as unknown as KVNamespace,
    VAPID_PUBLIC_KEY: 'pub',
    VAPID_PRIVATE_KEY: 'priv',
    VAPID_SUBJECT: 'mailto:t@example.com',
  } as unknown as Env
}

afterEach(() => vi.restoreAllMocks())

describe('subscribe', () => {
  it('stores a valid subscription under a sub: key', async () => {
    const kv = fakeKv()
    const res = await subscribe(envWith(kv), validSub)
    expect(res).toEqual({ ok: true })
    const keys = [...kv.store.keys()]
    expect(keys).toHaveLength(1)
    expect(keys[0].startsWith('sub:')).toBe(true)
    expect(JSON.parse(kv.store.get(keys[0])!)).toEqual(validSub)
  })

  it('is idempotent for the same endpoint', async () => {
    const kv = fakeKv()
    await subscribe(envWith(kv), validSub)
    await subscribe(envWith(kv), validSub)
    expect(kv.store.size).toBe(1)
  })

  it('rejects a subscription with no endpoint / keys', async () => {
    const kv = fakeKv()
    await expect(subscribe(envWith(kv), { endpoint: '', keys: {} })).rejects.toBeInstanceOf(ApiError)
    await expect(subscribe(envWith(kv), { endpoint: 'http://insecure', keys: validSub.keys })).rejects.toBeInstanceOf(
      ApiError,
    )
  })

  it('returns 503 when the KV binding is absent', async () => {
    await expect(subscribe({} as Env, validSub)).rejects.toMatchObject({ status: 503 })
  })
})

describe('unsubscribe', () => {
  it('removes the subscription for an endpoint', async () => {
    const kv = fakeKv()
    await subscribe(envWith(kv), validSub)
    await unsubscribe(envWith(kv), { endpoint: validSub.endpoint })
    expect(kv.store.size).toBe(0)
  })
})

describe('sendToAll', () => {
  it('sends to every subscription and prunes 410/404 endpoints', async () => {
    const kv = fakeKv()
    const gone = { endpoint: 'https://push.example.com/gone', keys: validSub.keys }
    await subscribe(envWith(kv), validSub)
    await subscribe(envWith(kv), gone)

    vi.stubGlobal(
      'fetch',
      vi.fn(async (endpoint: string) =>
        endpoint.endsWith('/gone') ? new Response('', { status: 410 }) : new Response('', { status: 201 }),
      ),
    )

    const res = await sendToAll(envWith(kv), { title: 't', body: 'b' })
    expect(res).toEqual({ targets: 2, sent: 1, removed: 1 })
    expect(kv.store.size).toBe(1) // the gone endpoint was deleted
  })

  it('one endpoint failure does not stop the others', async () => {
    const kv = fakeKv()
    await subscribe(envWith(kv), validSub)
    await subscribe(envWith(kv), { endpoint: 'https://push.example.com/two', keys: validSub.keys })
    vi.stubGlobal(
      'fetch',
      vi.fn(async (endpoint: string) => {
        if (endpoint.endsWith('/two')) throw new Error('network down')
        return new Response('', { status: 201 })
      }),
    )
    const res = await sendToAll(envWith(kv), { title: 't', body: 'b' })
    expect(res.sent).toBe(1)
    expect(res.targets).toBe(2)
  })

  it('returns 503 when VAPID keys are missing', async () => {
    const kv = fakeKv()
    await subscribe(envWith(kv), validSub)
    const env = { PUSH_SUBS: kv as unknown as KVNamespace } as unknown as Env
    await expect(sendToAll(env, { title: 't', body: 'b' })).rejects.toMatchObject({ status: 503 })
  })
})

describe('parseSendBody', () => {
  it('requires title and body', () => {
    expect(() => parseSendBody({ title: '', body: 'x' })).toThrow(ApiError)
    expect(() => parseSendBody({ title: 'x' })).toThrow(ApiError)
  })
  it('caps lengths and passes url/priority through', () => {
    const msg = parseSendBody({ title: 'a'.repeat(200), body: 'b', url: '/x', priority: 'high' })
    expect(msg.title.length).toBe(120)
    expect(msg.url).toBe('/x')
    expect(msg.priority).toBe('high')
  })
  it('drops an unknown priority', () => {
    const msg = parseSendBody({ title: 't', body: 'b', priority: 'urgent' as unknown as 'high' })
    expect(msg.priority).toBeUndefined()
  })
})
