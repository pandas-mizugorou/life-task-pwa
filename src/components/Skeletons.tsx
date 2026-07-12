import { ACTIVE_STATUSES, STATUS_META } from '../lib/status'

/** A card-shaped placeholder used while the board / a column loads. */
export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-line bg-panel p-3">
      <div className="h-3.5 w-4/5 rounded bg-panel2" />
      <div className="mt-2 h-3 w-3/5 rounded bg-panel2" />
      <div className="mt-3 flex gap-2">
        <div className="h-5 w-14 rounded-full bg-panel2" />
        <div className="h-5 w-10 rounded-full bg-panel2" />
      </div>
    </div>
  )
}

/**
 * Kanban-shaped loading state: real column headers (so the layout doesn't shift
 * when data arrives) + pulsing card placeholders. The pulse stops automatically
 * under prefers-reduced-motion (global rule in index.css).
 */
export function BoardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden" aria-hidden>
      <div className="shrink-0 px-4 pt-4">
        <div className="flex gap-2">
          {[48, 64, 52, 44].map((w, i) => (
            <div key={i} className="h-7 rounded-full bg-panel2" style={{ width: w }} />
          ))}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 animate-pulse gap-3 overflow-hidden px-4 pt-3">
        {ACTIVE_STATUSES.map((s, ci) => (
          <section key={s} className="flex h-full w-[52vw] max-w-[13rem] shrink-0 flex-col lg:w-0 lg:min-w-0 lg:max-w-none lg:flex-1">
            <div className="mb-2 flex items-center gap-2 px-1">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: STATUS_META[s].dot }}
              />
              <span className="text-sm font-bold text-ink">{STATUS_META[s].label}</span>
            </div>
            <div className="min-h-0 flex-1 space-y-2 rounded-2xl bg-panel2/30 p-2">
              {Array.from({ length: ci % 2 === 0 ? 3 : 2 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

/** Loading state for the task detail page (title + body + comments placeholders). */
export function TaskDetailSkeleton() {
  return (
    <div className="mx-auto h-full max-w-2xl space-y-4 px-4 pb-28 pt-4" aria-hidden>
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-lg bg-panel2" />
        <div className="h-4 w-10 rounded bg-panel2" />
      </div>
      <div className="animate-pulse space-y-4 rounded-2xl border border-line bg-panel p-4">
        <div className="h-5 w-3/4 rounded bg-panel2" />
        <div className="flex gap-2">
          <div className="h-6 w-20 rounded-full bg-panel2" />
          <div className="h-6 w-16 rounded-full bg-panel2" />
        </div>
        <div className="space-y-2 pt-1">
          <div className="h-3.5 w-full rounded bg-panel2" />
          <div className="h-3.5 w-11/12 rounded bg-panel2" />
          <div className="h-3.5 w-2/3 rounded bg-panel2" />
        </div>
      </div>
    </div>
  )
}
