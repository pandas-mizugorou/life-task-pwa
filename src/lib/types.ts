// Shared shapes are defined once in /shared/types.ts (imported by both the PWA and
// the Worker). Only client-only shapes are defined here.

import type { Status } from '../../shared/types'

export type { Status, Label, Task, Comment, Meta } from '../../shared/types'

export interface NewTask {
  title: string
  status: Status
  labels?: string[]
  body?: string
}

export interface TaskPatch {
  title?: string
  body?: string
  state?: 'open' | 'closed'
}
