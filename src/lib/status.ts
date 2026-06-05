import type { Status } from './types'

/** All Status values that exist on the board's single-select (incl. legacy Done). */
export const STATUS_ORDER: Status[] = ['Backlog', 'Todo', 'In Progress', 'Pending', 'Done']

/**
 * Columns shown on the board (for dragging / adding). "Done" is intentionally
 * excluded: completing a task = closing the issue (see 完了にする), not a status.
 * Closed tasks appear in a separate 完了済み (archive) column.
 */
export const ACTIVE_STATUSES: Status[] = ['Backlog', 'Todo', 'In Progress', 'Pending']

/** Visual treatment per status (dot color + soft tint for active pills). */
export const STATUS_META: Record<Status, { label: string; dot: string; tint: string }> = {
  Backlog: { label: 'Backlog', dot: '#8b949e', tint: 'rgba(139,148,158,0.16)' },
  Todo: { label: 'Todo', dot: '#539bf5', tint: 'rgba(83,155,245,0.16)' },
  'In Progress': { label: 'In Progress', dot: '#d29922', tint: 'rgba(210,153,34,0.18)' },
  Pending: { label: 'Pending', dot: '#db6d28', tint: 'rgba(219,109,40,0.16)' },
  Done: { label: 'Done', dot: '#3fb950', tint: 'rgba(63,185,80,0.16)' },
}
