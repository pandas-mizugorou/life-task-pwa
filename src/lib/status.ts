import type { Status } from './types'

/** Display + mutation order of the board's Status single-select. */
export const STATUS_ORDER: Status[] = ['Backlog', 'Todo', 'In Progress', 'Pending', 'Done']

/** Visual treatment per status (dot color + soft tint for active pills). */
export const STATUS_META: Record<Status, { label: string; dot: string; tint: string }> = {
  Backlog: { label: 'Backlog', dot: '#9aa6c8', tint: 'rgba(154,166,200,0.16)' },
  Todo: { label: 'Todo', dot: '#5b8cff', tint: 'rgba(91,140,255,0.18)' },
  'In Progress': { label: 'In Progress', dot: '#f7b955', tint: 'rgba(247,185,85,0.18)' },
  Pending: { label: 'Pending', dot: '#f06868', tint: 'rgba(240,104,104,0.16)' },
  Done: { label: 'Done', dot: '#36d399', tint: 'rgba(54,211,153,0.18)' },
}
