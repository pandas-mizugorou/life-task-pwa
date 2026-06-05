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
}
