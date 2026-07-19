// Web Push (notify-hub / N-13). A standard notification path so any PC automation
// can reach the phone with one line. Subscriptions live in the PUSH_SUBS KV
// namespace (one entry per endpoint, key `sub:<sha256hex(endpoint)>`); sending
// fans out to all of them and prunes the ones the push service reports as gone.
//
// Library: @block65/webcrypto-web-push — the same Workers-compatible VAPID
// implementation the family-assets keepalive Worker already runs in production.

import { buildPushPayload } from '@block65/webcrypto-web-push'
import type { Env } from './types'
import { ApiError } from './github'

const SUB_PREFIX = 'sub:'

/** The browser PushSubscription shape we persist (endpoint + the two crypto keys). */
export interface StoredSubscription {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

/** Message envelope accepted by POST /api/push/send. */
export interface PushMessage {
  title: string
  body: string
  url?: string
  priority?: 'normal' | 'high'
}

async function sha256Hex(s: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function requireKv(env: Env): KVNamespace {
  if (!env.PUSH_SUBS) throw new ApiError('通知購読ストアが未設定です', 503)
  return env.PUSH_SUBS
}

/** Validate + normalize an incoming PushSubscription JSON from the PWA. */
function normalizeSubscription(input: unknown): StoredSubscription {
  const s = input as Partial<{ endpoint: unknown; keys: unknown }>
  const endpoint = typeof s?.endpoint === 'string' ? s.endpoint : ''
  const keys = (s?.keys ?? {}) as Partial<{ p256dh: unknown; auth: unknown }>
  const p256dh = typeof keys.p256dh === 'string' ? keys.p256dh : ''
  const auth = typeof keys.auth === 'string' ? keys.auth : ''
  if (!/^https:\/\//.test(endpoint) || !p256dh || !auth) {
    throw new ApiError('購読情報が不正です', 400)
  }
  return { endpoint, keys: { p256dh, auth } }
}

/** Register (or refresh) a subscription. Idempotent: same endpoint => same key. */
export async function subscribe(env: Env, input: unknown): Promise<{ ok: true }> {
  const kv = requireKv(env)
  const sub = normalizeSubscription(input)
  await kv.put(SUB_PREFIX + (await sha256Hex(sub.endpoint)), JSON.stringify(sub))
  return { ok: true }
}

/** Remove a subscription by its endpoint (called when the PWA toggle is turned off). */
export async function unsubscribe(env: Env, input: unknown): Promise<{ ok: true }> {
  const kv = requireKv(env)
  const endpoint = typeof (input as { endpoint?: unknown })?.endpoint === 'string'
    ? (input as { endpoint: string }).endpoint
    : ''
  if (!endpoint) throw new ApiError('endpoint が必要です', 400)
  await kv.delete(SUB_PREFIX + (await sha256Hex(endpoint)))
  return { ok: true }
}

/** Read every stored subscription (paginating KV list). */
async function listSubscriptions(kv: KVNamespace): Promise<{ key: string; sub: StoredSubscription }[]> {
  const out: { key: string; sub: StoredSubscription }[] = []
  let cursor: string | undefined
  do {
    const page = await kv.list({ prefix: SUB_PREFIX, cursor })
    for (const k of page.keys) {
      const raw = await kv.get(k.name)
      if (!raw) continue
      try {
        out.push({ key: k.name, sub: JSON.parse(raw) as StoredSubscription })
      } catch {
        // A corrupt entry shouldn't block delivery to the rest; drop it.
        await kv.delete(k.name)
      }
    }
    cursor = page.list_complete ? undefined : page.cursor
  } while (cursor)
  return out
}

/**
 * Send a message to every subscription. Failures on one endpoint never stop the
 * others; endpoints the push service reports as gone (404/410) are pruned from KV.
 * Returns a small summary (no secrets, no endpoints) for the caller to log.
 */
export async function sendToAll(
  env: Env,
  message: PushMessage,
): Promise<{ targets: number; sent: number; removed: number }> {
  const kv = requireKv(env)
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    throw new ApiError('VAPID 鍵が未設定です', 503)
  }
  const vapid = {
    subject: env.VAPID_SUBJECT || 'mailto:admin@example.com',
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY,
  }
  const urgency: 'high' | 'normal' = message.priority === 'high' ? 'high' : 'normal'
  const payloadMessage = {
    data: { title: message.title, body: message.body, url: message.url ?? '/' },
    options: { ttl: 24 * 60 * 60, urgency },
  }

  const subs = await listSubscriptions(kv)
  let sent = 0
  let removed = 0
  for (const { key, sub } of subs) {
    const subscription = { endpoint: sub.endpoint, expirationTime: null, keys: sub.keys }
    try {
      const payload = await buildPushPayload(payloadMessage, subscription, vapid)
      const r = await fetch(sub.endpoint, payload)
      if (r.status === 404 || r.status === 410) {
        await kv.delete(key)
        removed++
      } else if (r.ok) {
        sent++
      }
    } catch {
      // Network / crypto failure on one endpoint: skip it, keep going.
    }
  }
  return { targets: subs.length, sent, removed }
}

/** Parse + validate the POST /api/push/send body. */
export function parseSendBody(body: unknown): PushMessage {
  const b = body as Partial<PushMessage>
  const title = typeof b?.title === 'string' ? b.title.trim() : ''
  const text = typeof b?.body === 'string' ? b.body.trim() : ''
  if (!title || !text) throw new ApiError('title と body は必須です', 400)
  const msg: PushMessage = { title: title.slice(0, 120), body: text.slice(0, 300) }
  if (typeof b?.url === 'string' && b.url) msg.url = b.url.slice(0, 500)
  if (b?.priority === 'high') msg.priority = 'high'
  return msg
}
