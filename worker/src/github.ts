// GitHub client + all task operations. Every call is hardcoded to ONE repo and
// ONE project, so a leaked passphrase can never reach another repo or account.

import type { Comment, Env, Label, Meta, Status, Task } from './types'
import {
  ADD_ITEM_MUTATION,
  BOARD_QUERY,
  DELETE_ITEM_MUTATION,
  META_QUERY,
  ONE_ISSUE_QUERY,
  SET_STATUS_MUTATION,
  TASK_DETAIL_QUERY,
} from './graphql'

// ---- hardcoded guards (the blast-radius boundary) ---------------------------
const OWNER = 'pandas-mizugorou'
const REPO = 'life'
const PROJECT_ID = 'PVT_kwHOEMRrd84BZq2b'
const STATUS_FIELD_ID = 'PVTSSF_lAHOEMRrd84BZq2bzhUn6mk'

/** status name -> single-select option id. The ONE thing to re-check if the
 *  board's Status options are restructured (rename keeps the id; a brand-new
 *  option gets a fresh id). /api/meta re-derives these live for verification. */
const STATUS_OPTIONS: Record<Status, string> = {
  Backlog: '0846b24a',
  Todo: '8ab06b61',
  'In Progress': '0ed0e106',
  Pending: '41340191',
  Done: 'f4b06e0b',
}

export const STATUS_ORDER: Status[] = ['Backlog', 'Todo', 'In Progress', 'Pending', 'Done']

/** Normalize a hex color to GitHub's 6-digit form (no '#'); fall back to neutral gray. */
function normalizeColor(c?: string): string {
  const v = (c ?? '').replace(/^#/, '').trim()
  return /^[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : '8b97b8'
}

function isStatus(s: unknown): s is Status {
  return typeof s === 'string' && (STATUS_ORDER as string[]).includes(s)
}

// ---- errors -----------------------------------------------------------------
export class ApiError extends Error {
  status: number
  constructor(message: string, status = 500) {
    super(message)
    this.status = status
  }
}

// ---- low-level clients ------------------------------------------------------
function ghHeaders(env: Env, rest = false): Record<string, string> {
  const h: Record<string, string> = {
    Authorization: `Bearer ${env.GITHUB_PAT}`,
    'User-Agent': 'life-task-api',
    'Content-Type': 'application/json',
  }
  if (rest) {
    h.Accept = 'application/vnd.github+json'
    h['X-GitHub-Api-Version'] = '2022-11-28'
  }
  return h
}

async function ghGraphQL<T = unknown>(
  env: Env,
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: ghHeaders(env),
    body: JSON.stringify({ query, variables }),
  })
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] }
  if (!res.ok || json.errors?.length) {
    const msg = json.errors?.map((e) => e.message).join('; ') || `GraphQL ${res.status}`
    throw new ApiError(`GitHub GraphQL: ${msg}`, res.ok ? 502 : res.status)
  }
  return json.data as T
}

async function ghRest(
  env: Env,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<any> {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: ghHeaders(env, true),
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new ApiError(`GitHub ${method} ${path} -> ${res.status}: ${txt.slice(0, 300)}`, 502)
  }
  if (res.status === 204) return null
  return res.json()
}

// ---- mappers ----------------------------------------------------------------
function mapLabels(labels: any): Label[] {
  return (labels?.nodes ?? []).map((l: any) => ({ name: l.name, color: l.color }))
}

/** From issue.projectItems (GraphQL), find this project's item id + Status. */
function projectStatus(projectItems: any): { itemId: string; status: Status } {
  const nodes: any[] = projectItems?.nodes ?? []
  const pi = nodes.find((n) => n?.project?.id === PROJECT_ID)
  const name = pi?.fieldValueByName?.name
  return { itemId: pi?.id ?? '', status: isStatus(name) ? name : 'Backlog' }
}

function issueToTask(issue: any): Task {
  const { itemId, status } = projectStatus(issue.projectItems)
  return {
    number: issue.number,
    itemId,
    title: issue.title,
    body: issue.body ?? '',
    state: issue.state,
    status,
    labels: mapLabels(issue.labels),
    url: issue.url,
    updatedAt: issue.updatedAt,
    commentCount: issue.comments?.totalCount ?? 0,
  }
}

function boardItemToTask(node: any): Task | null {
  const issue = node?.content
  if (!issue || typeof issue.number !== 'number') return null // draft / PR / deleted
  const name = node.fieldValueByName?.name
  return {
    number: issue.number,
    itemId: node.id,
    title: issue.title,
    body: '', // bodies are fetched lazily in the detail view to keep the board lean
    state: issue.state,
    status: isStatus(name) ? name : 'Backlog',
    labels: mapLabels(issue.labels),
    url: issue.url,
    updatedAt: issue.updatedAt,
    commentCount: issue.comments?.totalCount ?? 0,
  }
}

/** Fetch one issue + its board item (no comment bodies). null if not found. */
async function fetchIssue(env: Env, number: number): Promise<{ nodeId: string; task: Task } | null> {
  const data = await ghGraphQL<any>(env, ONE_ISSUE_QUERY, { owner: OWNER, repo: REPO, number })
  const issue = data?.repository?.issue
  if (!issue) return null
  return { nodeId: issue.id, task: issueToTask(issue) }
}

// ---- operations -------------------------------------------------------------
export async function getMeta(env: Env): Promise<Meta> {
  const data = await ghGraphQL<any>(env, META_QUERY, { project: PROJECT_ID })
  const field = data?.node?.field
  const statuses = (field?.options ?? []).map((o: any) => ({ name: o.name, optionId: o.id }))
  return {
    projectId: PROJECT_ID,
    statusFieldId: field?.id ?? STATUS_FIELD_ID,
    statuses,
    labels: await listLabels(env),
  }
}

export async function getBoard(env: Env, includeClosed: boolean): Promise<Task[]> {
  const tasks: Task[] = []
  let cursor: string | null = null
  for (let page = 0; page < 25; page++) {
    const data: any = await ghGraphQL(env, BOARD_QUERY, { project: PROJECT_ID, cursor })
    const conn: any = data?.node?.items
    if (!conn) break
    for (const node of conn.nodes ?? []) {
      const t = boardItemToTask(node)
      if (!t) continue
      if (!includeClosed && t.state === 'CLOSED') continue
      tasks.push(t)
    }
    if (!conn.pageInfo?.hasNextPage) break
    cursor = conn.pageInfo.endCursor ?? null
  }
  return tasks
}

export async function getTaskDetail(env: Env, number: number): Promise<{ task: Task; comments: Comment[] }> {
  const data = await ghGraphQL<any>(env, TASK_DETAIL_QUERY, { owner: OWNER, repo: REPO, number })
  const issue = data?.repository?.issue
  if (!issue) throw new ApiError(`Issue #${number} が見つかりません`, 404)
  const comments: Comment[] = (issue.comments?.nodes ?? []).map((n: any) => ({
    id: n.id,
    author: n.author?.login ?? '(unknown)',
    body: n.body,
    createdAt: n.createdAt,
  }))
  return { task: issueToTask(issue), comments }
}

export async function createTask(
  env: Env,
  input: { title?: string; status?: string; label?: string; body?: string },
): Promise<Task> {
  const title = (input?.title ?? '').trim()
  if (!title) throw new ApiError('タイトルを入力してください', 400)
  const status: Status = isStatus(input?.status) ? input.status : 'Backlog'
  const label = input?.label
  const body = typeof input?.body === 'string' ? input.body : undefined

  // 1. create the issue (REST), with the label on the issue (the board mirrors it)
  const issue = await ghRest(env, 'POST', `/repos/${OWNER}/${REPO}/issues`, {
    title,
    body,
    labels: label ? [label] : [],
  })
  // 2. add it to the board
  const add = await ghGraphQL<any>(env, ADD_ITEM_MUTATION, { project: PROJECT_ID, content: issue.node_id })
  const itemId = add.addProjectV2ItemById.item.id
  // 3. set its Status
  await ghGraphQL(env, SET_STATUS_MUTATION, {
    project: PROJECT_ID,
    item: itemId,
    field: STATUS_FIELD_ID,
    opt: STATUS_OPTIONS[status],
  })
  return {
    number: issue.number,
    itemId,
    title: issue.title,
    body: issue.body ?? '',
    state: 'OPEN',
    status,
    labels: (issue.labels ?? []).map((l: any) => ({ name: l.name, color: l.color })),
    url: issue.html_url,
    updatedAt: issue.updated_at,
    commentCount: 0,
  }
}

export async function setStatus(env: Env, number: number, statusInput: unknown): Promise<Task> {
  if (!isStatus(statusInput)) throw new ApiError(`未知のステータス: ${String(statusInput)}`, 400)
  const status = statusInput
  const raw = await fetchIssue(env, number)
  if (!raw) throw new ApiError(`Issue #${number} が見つかりません`, 404)
  let itemId = raw.task.itemId
  if (!itemId) {
    // issue exists but isn't on the board yet — add it, then set status
    const add = await ghGraphQL<any>(env, ADD_ITEM_MUTATION, { project: PROJECT_ID, content: raw.nodeId })
    itemId = add.addProjectV2ItemById.item.id
  }
  await ghGraphQL(env, SET_STATUS_MUTATION, {
    project: PROJECT_ID,
    item: itemId,
    field: STATUS_FIELD_ID,
    opt: STATUS_OPTIONS[status],
  })
  return { ...raw.task, itemId, status }
}

export async function patchTask(
  env: Env,
  number: number,
  patch: { title?: string; body?: string; state?: string },
): Promise<Task> {
  const body: Record<string, unknown> = {}
  if (typeof patch?.title === 'string') {
    if (!patch.title.trim()) throw new ApiError('タイトルは空にできません', 400)
    body.title = patch.title
  }
  if (typeof patch?.body === 'string') body.body = patch.body
  if (patch?.state !== undefined) {
    if (patch.state !== 'open' && patch.state !== 'closed') throw new ApiError('state が不正です', 400)
    body.state = patch.state
  }
  if (Object.keys(body).length === 0) throw new ApiError('変更内容がありません', 400)
  await ghRest(env, 'PATCH', `/repos/${OWNER}/${REPO}/issues/${number}`, body)
  const raw = await fetchIssue(env, number)
  if (!raw) throw new ApiError(`Issue #${number} が見つかりません`, 404)
  return raw.task
}

export async function addComment(env: Env, number: number, bodyText: unknown): Promise<Comment> {
  const text = typeof bodyText === 'string' ? bodyText.trim() : ''
  if (!text) throw new ApiError('コメントが空です', 400)
  const c = await ghRest(env, 'POST', `/repos/${OWNER}/${REPO}/issues/${number}/comments`, { body: text })
  return { id: String(c.id), author: c.user?.login ?? '', body: c.body, createdAt: c.created_at }
}

export async function removeFromBoard(env: Env, number: number): Promise<void> {
  const raw = await fetchIssue(env, number)
  if (!raw) throw new ApiError(`Issue #${number} が見つかりません`, 404)
  if (!raw.task.itemId) return // not on the board — nothing to remove (idempotent)
  await ghGraphQL(env, DELETE_ITEM_MUTATION, { project: PROJECT_ID, item: raw.task.itemId })
}

// ---- labels (REST; scoped to OWNER/REPO) ------------------------------------
export async function listLabels(env: Env): Promise<Label[]> {
  const arr = await ghRest(env, 'GET', `/repos/${OWNER}/${REPO}/labels?per_page=100`)
  return (arr ?? []).map((l: any) => ({ name: l.name, color: l.color }))
}

export async function createLabel(env: Env, input: { name?: string; color?: string }): Promise<Label> {
  const name = (input?.name ?? '').trim()
  if (!name) throw new ApiError('ラベル名を入力してください', 400)
  const l = await ghRest(env, 'POST', `/repos/${OWNER}/${REPO}/labels`, {
    name,
    color: normalizeColor(input?.color),
  })
  return { name: l.name, color: l.color }
}

export async function renameLabel(
  env: Env,
  name: string,
  input: { newName?: string; color?: string },
): Promise<Label> {
  const body: Record<string, unknown> = {}
  if (typeof input?.newName === 'string' && input.newName.trim()) body.new_name = input.newName.trim()
  if (input?.color !== undefined) body.color = normalizeColor(input.color)
  if (Object.keys(body).length === 0) throw new ApiError('変更内容がありません', 400)
  const l = await ghRest(
    env,
    'PATCH',
    `/repos/${OWNER}/${REPO}/labels/${encodeURIComponent(name)}`,
    body,
  )
  return { name: l.name, color: l.color }
}

export async function deleteLabel(env: Env, name: string): Promise<void> {
  await ghRest(env, 'DELETE', `/repos/${OWNER}/${REPO}/labels/${encodeURIComponent(name)}`)
}
