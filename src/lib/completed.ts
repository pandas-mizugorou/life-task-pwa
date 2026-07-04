import type { Task } from './types'

/** 完了済みタスクを「最近クローズした順」（closedAt 降順）で返す。
 *  closedAt が null/不正なもの（旧データ）は末尾。同時刻・null 同士は issue 番号の
 *  降順で決定論的に安定させる。入力配列は破壊しない。 */
export function sortCompleted(tasks: Task[]): Task[] {
  return tasks.slice().sort((a, b) => {
    const ta = a.closedAt ? Date.parse(a.closedAt) : NaN
    const tb = b.closedAt ? Date.parse(b.closedAt) : NaN
    const va = Number.isNaN(ta) ? -Infinity : ta
    const vb = Number.isNaN(tb) ? -Infinity : tb
    if (va !== vb) return vb - va // closedAt 降順（-Infinity=null は末尾）
    return b.number - a.number // 決定論的なタイブレーク（新しい issue が上）
  })
}
