// Shared response shapes. Kept in sync with the PWA's src/lib/types.ts.

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

export type Status = 'Backlog' | 'Todo' | 'In Progress' | 'Pending' | 'Done'

export interface Label {
  name: string
  /** 6-digit hex, no leading '#'. */
  color: string
}

export interface Task {
  /** Issue number — the client-facing identifier used in REST routes. */
  number: number
  /**
   * ProjectV2Item node id. REQUIRED for status/remove mutations.
   * May be '' only for an issue that is not yet on the board (then add-on-demand).
   */
  itemId: string
  title: string
  body: string
  state: 'OPEN' | 'CLOSED'
  status: Status
  labels: Label[]
  url: string
  updatedAt: string
  commentCount: number
}

export interface Comment {
  id: string
  author: string
  body: string
  createdAt: string
}

export interface Meta {
  projectId: string
  statusFieldId: string
  statuses: { name: string; optionId: string }[]
  labels: Label[]
  /** Non-empty when the live board's Status field/options no longer match the
   *  Worker's hardcoded ids (drift). Each entry is a human-readable warning. */
  drift?: string[]
}
