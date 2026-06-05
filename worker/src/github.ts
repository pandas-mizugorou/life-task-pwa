// GitHub client + all task operations. Every call is hardcoded to ONE repo and
// ONE project, so a leaked passphrase can never reach another repo or account.

import type { Comment, Env, Label, Meta, Status, Task } from './types'
import {
  ADD_ITEM_MUTATION,
  BOARD_QUERY,
  DELETE_ITEM_MUTATION,
  META_QUERY,
  MOVE_ITEM_MUTATION,
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
export const STATUS_OPTIONS: Record<Status, string> = {
  Backlog: '0846b24a',
  Todo: '8ab06b61',
  'In Progress': '0ed0e106',
  Pending: '41340191',
  Done: 'f4b06e0b',
}

export const STATUS_ORDER: Status[] = ['Backlog', 'Todo', 'In Progress', 'Pending', 'Done']

/** Normalize a hex color to GitHub's 6-digit form (no '#'); fall back to neutral gray. */
export function normalizeColor(c?: string): string {
  const v = (c ?? '').replace(/^#/, '').trim()
  return /^[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : '8b97b8'
}

export function isStatus(s: unknown): s is Status {
  return typeof s === 'string' && (STATUS_ORDER as string[]).includes(s)
}

// ---- errors -----------------------------------------------------------------
export class ApiError extends Error {
  status: number
  /** Server-only diagnostic detail. Logged in the Worker, never returned to the client. */
  detail?: string
  constructor(message: string, status = 500, detail?: string) {
    super(message)
    this.status = status
    this.detail = detail
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

const GH_TIMEOUT_MS = 10_000
const GH_MAX_RETRIES = 1

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
function backoffMs(attempt: number): number {
  // small jittered backoff so a transient blip doesn't turn into a retry storm
  return 200 + attempt * 300 + Math.floor(Math.random() * 200)
}

/** fetch with a 10s timeout + one retry on network error / transient 5xx. */
async function ghFetch(url: string, init: RequestInit): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), GH_TIMEOUT_MS)
    try {
      const res = await fetch(url, { ...init, signal: ctrl.signal })
      clearTimeout(timer)
      if (res.status >= 500 && res.status <= 599 && attempt < GH_MAX_RETRIES) {
        await sleep(backoffMs(attempt))
        continue
      }
      return res
    } catch (e) {
      clearTimeout(timer)
      if (attempt < GH_MAX_RETRIES) {
        await sleep(backoffMs(attempt))
        continue
      }
      throw new ApiError(
        'GitHub に接続できませんでした（タイムアウトまたはネットワークエラー）',
        502,
        `ghFetch ${url}: ${e instanceof Error ? e.message : String(e)}`,
      )
    }
  }
}

/** Throw a clear 429 if the response indicates GitHub primary/secondary rate limiting. */
function throwIfRateLimited(res: Response): void {
  const remaining = res.headers.get('x-ratelimit-remaining')
  if (res.status === 429 || (res.status === 403 && remaining === '0')) {
    const retryAfter = res.headers.get('retry-after')
    throw new ApiError(
      `GitHub のレート制限に達しました。${retryAfter ? `約${retryAfter}秒` : 'しばらく'}おいて再度お試しください。`,
      429,
      `rate limited (status ${res.status}, remaining ${remaining}, retry-after ${retryAfter})`,
    )
  }
}

async function ghGraphQL<T = unknown>(
  env: Env,
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const res = await ghFetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: ghHeaders(env),
    body: JSON.stringify({ query, variables }),
  })
  throwIfRateLimited(res)
  const json = (await res.json()) as { data?: T; errors?: { message: string; type?: string }[] }
  if (!res.ok || json.errors?.length) {
    if (json.errors?.some((e) => e.type === 'RATE_LIMITED')) {
      throw new ApiError('GitHub のレート制限に達しました。しばらくおいて再度お試しください。', 429)
    }
    const detail = json.errors?.map((e) => e.message).join('; ') || `GraphQL ${res.status}`
    throw new ApiError('GitHub の処理に失敗しました。', res.ok ? 502 : res.status, detail)
  }
  return json.data as T
}

async function ghRest(
  env: Env,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<any> {
  const res = await ghFetch(`https://api.github.com${path}`, {
    method,
    headers: ghHeaders(env, true),
    body: body ? JSON.stringify(body) : undefined,
  })
  throwIfRateLimited(res)
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    // Generic, client-safe message; the upstream body/path stays server-side in `detail`.
    throw new ApiError(
      `GitHub への操作に失敗しました (HTTP ${res.status})`,
      res.status >= 500 ? 502 : res.status,
      `${method} ${path} -> ${res.status}: ${txt.slice(0, 300)}`,
    )
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

  // Drift detection: compare the LIVE Status field/options against the hardcoded
  // ids this Worker writes with. If GitHub's ids no longer match (a Status option
  // was recreated, renamed away, or added), surface it so drift is *detected* here
  // instead of silently writing to the wrong column later.
  const drift: string[] = []
  const liveById = new Map<string, string>(
    statuses.map((s: any): [string, string] => [s.name, s.optionId]),
  )
  for (const name of STATUS_ORDER) {
    const liveId = liveById.get(name)
    if (!liveId) drift.push(`ステータス「${name}」が見つかりません`)
    else if (liveId !== STATUS_OPTIONS[name]) drift.push(`「${name}」のオプションIDが変わりました`)
  }
  for (const s of statuses) {
    if (!(STATUS_ORDER as string[]).includes(s.name)) {
      drift.push(`未知のステータス「${s.name}」が追加されています`)
    }
  }
  if (field?.id && field.id !== STATUS_FIELD_ID) drift.push('Status フィールドのIDが変わりました')

  return {
    projectId: PROJECT_ID,
    statusFieldId: field?.id ?? STATUS_FIELD_ID,
    statuses,
    labels: await listLabels(env),
    drift,
  }
}

const BOARD_MAX_PAGES = 50 // 50 x 100 = 5000 project items

export async function getBoard(
  env: Env,
  includeClosed: boolean,
): Promise<{ tasks: Task[]; truncated: boolean }> {
  const tasks: Task[] = []
  let cursor: string | null = null
  let truncated = false
  for (let page = 0; page < BOARD_MAX_PAGES; page++) {
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
    if (page === BOARD_MAX_PAGES - 1) truncated = true // more pages remain but we stop here
  }
  return { tasks, truncated }
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
  input: { title?: string; status?: string; labels?: string[]; body?: string },
): Promise<Task> {
  const title = (input?.title ?? '').trim()
  if (!title) throw new ApiError('タイトルを入力してください', 400)
  const status: Status = isStatus(input?.status) ? input.status : 'Backlog'
  const labels = Array.isArray(input?.labels)
    ? input.labels.filter((x): x is string => typeof x === 'string')
    : []
  const body = typeof input?.body === 'string' ? input.body : undefined

  // 1. create the issue (REST), with labels on the issue (the board mirrors them)
  const issue = await ghRest(env, 'POST', `/repos/${OWNER}/${REPO}/issues`, {
    title,
    body,
    labels,
  })
  // 2-3. add to the board + set Status. The issue already exists, so if these steps
  // fail, surface its number instead of letting it silently vanish from the app.
  let itemId: string
  try {
    const add = await ghGraphQL<any>(env, ADD_ITEM_MUTATION, {
      project: PROJECT_ID,
      content: issue.node_id,
    })
    itemId = add.addProjectV2ItemById.item.id
    await ghGraphQL(env, SET_STATUS_MUTATION, {
      project: PROJECT_ID,
      item: itemId,
      field: STATUS_FIELD_ID,
      opt: STATUS_OPTIONS[status],
    })
  } catch (e) {
    throw new ApiError(
      `タスク（issue #${issue.number}）は作成できましたが、ボードへの登録に失敗しました。更新して確認するか、時間をおいて再度お試しください。`,
      502,
      `createTask post-create failed for #${issue.number}: ${e instanceof Error ? e.message : String(e)}`,
    )
  }
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
  let raw = await fetchIssue(env, number)
  if (!raw) throw new ApiError(`Issue #${number} が見つかりません`, 404)
  // Reopening an issue that had been removed from the board: add it back so it
  // reappears and is reorderable (otherwise it returns with an empty itemId).
  if (patch?.state === 'open' && !raw.task.itemId) {
    const add = await ghGraphQL<any>(env, ADD_ITEM_MUTATION, {
      project: PROJECT_ID,
      content: raw.nodeId,
    })
    const newItemId = add.addProjectV2ItemById.item.id
    await ghGraphQL(env, SET_STATUS_MUTATION, {
      project: PROJECT_ID,
      item: newItemId,
      field: STATUS_FIELD_ID,
      opt: STATUS_OPTIONS[raw.task.status] ?? STATUS_OPTIONS.Backlog,
    })
    raw = (await fetchIssue(env, number)) ?? raw
  }
  return raw.task
}

export async function addComment(env: Env, number: number, bodyText: unknown): Promise<Comment> {
  const text = typeof bodyText === 'string' ? bodyText.trim() : ''
  if (!text) throw new ApiError('コメントが空です', 400)
  const c = await ghRest(env, 'POST', `/repos/${OWNER}/${REPO}/issues/${number}/comments`, { body: text })
  return { id: String(c.id), author: c.user?.login ?? '', body: c.body, createdAt: c.created_at }
}

/** Replace the full set of labels on an issue (the board mirrors issue labels). */
export async function setTaskLabels(env: Env, number: number, labels: unknown): Promise<Task> {
  if (!Array.isArray(labels) || labels.some((l) => typeof l !== 'string')) {
    throw new ApiError('labels が不正です', 400)
  }
  await ghRest(env, 'PUT', `/repos/${OWNER}/${REPO}/issues/${number}/labels`, { labels })
  const raw = await fetchIssue(env, number)
  if (!raw) throw new ApiError(`Issue #${number} が見つかりません`, 404)
  return raw.task
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

/** Coerce an afterItemId input to a non-empty string, or null (= top of the list). */
export function normalizeAfterId(afterItemId: unknown): string | null {
  return typeof afterItemId === 'string' && afterItemId ? afterItemId : null
}

/** Reorder: place `itemId` right after `afterItemId` in the project order (null = top). */
export async function reorderTask(env: Env, itemId: unknown, afterItemId: unknown): Promise<void> {
  if (typeof itemId !== 'string' || !itemId) throw new ApiError('itemId が不正です', 400)
  await ghGraphQL(env, MOVE_ITEM_MUTATION, {
    project: PROJECT_ID,
    item: itemId,
    after: normalizeAfterId(afterItemId),
  })
}
