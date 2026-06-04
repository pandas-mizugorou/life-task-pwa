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
  Backlog: { label: 'Backlog', dot: '#9aa6c8', tint: 'rgba(154,166,200,0.16)' },
  Todo: { label: 'Todo', dot: '#5b8cff', tint: 'rgba(91,140,255,0.18)' },
  'In Progress': { label: 'In Progress', dot: '#f7b955', tint: 'rgba(247,185,85,0.18)' },
  Pending: { label: 'Pending', dot: '#f06868', tint: 'rgba(240,104,104,0.16)' },
  Done: { label: 'Done', dot: '#36d399', tint: 'rgba(54,211,153,0.18)' },
}
