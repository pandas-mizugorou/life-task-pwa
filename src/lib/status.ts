import type { Status } from './types'

/** All Status values that exist on the board's single-select (incl. legacy Done). */
export const STATUS_ORDER: Status[] = ['Backlog', 'Todo', 'In Progress', 'Pending', 'Done']

/**
 * Columns shown on the board (for dragging / adding). "Done" is intentionally
 * excluded: completing a task = closing the issue (see 完了にする), not a status.
 * Closed tasks appear in a separate 完了済み (archive) column.
 */
export const ACTIVE_STATUSES: Status[] = ['Backlog', 'Todo', 'In Progress', 'Pending']

/**
 * Visual treatment per status (dot color + soft tint for active pills).
 * Colours come from CSS variables defined in index.css (single source of truth),
 * so the board stays in sync with the theme. Tints are derived via color-mix.
 */
export const STATUS_META: Record<Status, { label: string; dot: string; tint: string }> = {
  Backlog: {
    label: 'Backlog',
    dot: 'var(--status-backlog)',
    tint: 'color-mix(in srgb, var(--status-backlog) 16%, transparent)',
  },
  Todo: {
    label: 'Todo',
    dot: 'var(--status-todo)',
    tint: 'color-mix(in srgb, var(--status-todo) 16%, transparent)',
  },
  'In Progress': {
    label: 'In Progress',
    dot: 'var(--status-inprogress)',
    tint: 'color-mix(in srgb, var(--status-inprogress) 18%, transparent)',
  },
  Pending: {
    label: 'Pending',
    dot: 'var(--status-pending)',
    tint: 'color-mix(in srgb, var(--status-pending) 18%, transparent)',
  },
  Done: {
    label: 'Done',
    dot: 'var(--status-done)',
    tint: 'color-mix(in srgb, var(--status-done) 16%, transparent)',
  },
}
