// Browser-side Web Push enable/disable for notify-hub (N-13). The actual push
// handlers live in public/push-sw.js (imported into the Workbox service worker
// via vite.config.ts workbox.importScripts). This module only wires the
// PushManager subscription to the Worker's /api/push/* endpoints.

import * as api from './api'

/** True only where Web Push can actually work (needs SW + PushManager + Notification). */
export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/** VAPID public keys are base64url; PushManager wants a BufferSource (ArrayBuffer-backed). */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

/** Whether this browser currently holds a push subscription. */
export async function isSubscribed(): Promise<boolean> {
  if (!pushSupported()) return false
  const reg = await navigator.serviceWorker.ready
  return !!(await reg.pushManager.getSubscription())
}

/**
 * Ask for notification permission, subscribe via PushManager, and register the
 * subscription with the Worker. Throws a human-readable Error on any failure so
 * the caller can toast it. iOS requires the PWA be installed to the home screen.
 */
export async function enablePush(): Promise<void> {
  if (!pushSupported()) throw new Error('この端末では通知を利用できません（ホーム画面に追加してからお試しください）')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('通知が許可されませんでした')

  const reg = await navigator.serviceWorker.ready
  const { key } = await api.getVapidPublicKey()
  if (!key) throw new Error('サーバー側の通知設定が未完了です')

  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    })
  }
  await api.subscribePush(sub.toJSON())
}

/** Unsubscribe locally and tell the Worker to drop the subscription. */
export async function disablePush(): Promise<void> {
  if (!pushSupported()) return
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return
  const endpoint = sub.endpoint
  await sub.unsubscribe().catch(() => {})
  await api.unsubscribePush(endpoint).catch(() => {})
}
