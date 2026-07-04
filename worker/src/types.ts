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
   * R2 bucket that stores images pasted into comments / task bodies. Optional so
   * older deploys (before the image feature) keep serving the rest of the API;
   * /api/upload returns 501 when it's absent.
   */
  IMAGES?: R2Bucket
  /**
   * Public URL base for objects in IMAGES, WITHOUT a trailing slash
   * (e.g. "https://img.example.com"). The stored object key is appended to form
   * the URL embedded in Markdown. Required for /api/upload to work.
   */
  IMAGES_BASE_URL?: string
}

/** Minimal R2Bucket surface we use (avoids depending on @cloudflare/workers-types). */
export interface R2Bucket {
  put(
    key: string,
    value: ArrayBuffer | ArrayBufferView | ReadableStream | string,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>
}
