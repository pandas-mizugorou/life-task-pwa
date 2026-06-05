// Single source of truth for the shapes shared by the PWA and the Worker.
// Imported (as types only) by src/lib/types.ts and worker/src/types.ts.

export type Status = 'Backlog' | 'Todo' | 'In Progress' | 'Pending' | 'Done'

export interface Label {
  name: string
  /** 6-digit hex, no leading '#'. */
  color: string
}

export interface Task {
  number: number
  /** ProjectV2Item id — required for status/remove. '' only when not on the board. */
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
