// Shared shapes are defined once in /shared/types.ts (imported by both the PWA and
// the Worker). Only the Worker's runtime Env is defined here.

export type { Status, Label, Task, Comment, Meta } from '../../shared/types'

export interface Env {
  /** GitHub Classic PAT (scopes: repo, project). Set via `wrangler secret put`. */
  GITHUB_PAT: string
  /** Shared passphrase the PWA sends as X-App-Key. Set via `wrangler secret put`. */
  APP_PASSPHRASE: string
  /** Comma-separated CORS origin allowlist, or "*". */
  ALLOWED_ORIGIN?: string
  /**
   * Cloudflare Rate Limiting binding (optional). Used to throttle repeated failed
   * passphrase attempts per IP. No-op if the binding isn't configured.
   */
  RATE_LIMITER?: { limit: (opts: { key: string }) => Promise<{ success: boolean }> }
  /**
   * The Worker's own public URL (no trailing slash), e.g.
   * "https://life-task-api.xxx.workers.dev". Used to build the signed image-proxy
   * URLs (/api/image/<path>?sig=…) embedded in Markdown. Required for image upload;
   * /api/upload returns 501 when it's absent.
   */
  WORKER_PUBLIC_URL?: string

  // ---- Web Push (notify-hub / N-13) — all optional so existing deploys keep working ----
  /**
   * KV namespace holding one entry per active Web Push subscription (key `sub:<hash>`).
   * Absent => push subscribe/send return 503. Create with:
   *   wrangler kv namespace create PUSH_SUBS --config worker/wrangler.toml
   */
  PUSH_SUBS?: KVNamespace
  /**
   * Shared key the PC bridge (Notify-Phone.ps1) sends as X-Notify-Key to POST
   * /api/push/send. Separate from APP_PASSPHRASE so the "send a notification"
   * capability can be rotated independently of the full task API. Set via
   * `wrangler secret put NOTIFY_KEY`. Absent => /api/push/send returns 401.
   */
  NOTIFY_KEY?: string
  /** VAPID `mailto:` subject. Set as a [vars] entry in wrangler.toml. */
  VAPID_SUBJECT?: string
  /** VAPID public key (base64url). Handed to the PWA for PushManager.subscribe. Set via `wrangler secret put`. */
  VAPID_PUBLIC_KEY?: string
  /** VAPID private key (base64url). Signs push requests. Set via `wrangler secret put`. */
  VAPID_PRIVATE_KEY?: string

  // ---- quick-capture (N-11) — optional so existing deploys keep working ----
  /**
   * Capture-only token for POST /api/capture, sent as X-Capture-Token. Lets a device
   * (iOS Shortcut) file an inbox fragment WITHOUT holding the full APP_PASSPHRASE, so a
   * leaked shortcut token only enables capture (revoke by rotating this one secret) and
   * never the task API or the PAT. Set via `wrangler secret put CAPTURE_TOKEN`. Absent =>
   * only X-App-Key (the authenticated PWA) may call /api/capture.
   */
  CAPTURE_TOKEN?: string
}
