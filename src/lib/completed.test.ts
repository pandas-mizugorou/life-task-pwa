import { describe, expect, it } from 'vitest'
import { sortCompleted } from './completed'
import type { Task } from './types'

// closedAt とソート判定に効くフィールドだけ変えた最小の Task を作る。
function task(number: number, closedAt: string | null): Task {
  return {
    number,
    itemId: `PVTI_${number}`,
    title: `task ${number}`,
    body: '',
    state: 'CLOSED',
    status: 'Done',
    labels: [],
    url: `https://example.com/${number}`,
    updatedAt: '2026-01-01T00:00:00Z',
    closedAt,
    commentCount: 0,
  }
}

describe('sortCompleted', () => {
  it('closedAt の降順（最近クローズしたものが先頭）', () => {
    const input = [
      task(1, '2026-07-01T10:00:00Z'),
      task(2, '2026-07-03T10:00:00Z'),
      task(3, '2026-07-02T10:00:00Z'),
    ]
    expect(sortCompleted(input).map((t) => t.number)).toEqual([2, 3, 1])
  })

  it('closedAt が null / undefined のものは末尾にまとまる', () => {
    const input = [
      task(1, null),
      task(2, '2026-07-03T10:00:00Z'),
      { ...task(3, null), closedAt: undefined },
      task(4, '2026-07-01T10:00:00Z'),
    ]
    // 有効な closedAt を持つ 2, 4 が先（降順）、null 系の 3, 1 が末尾（番号降順で決定論的）
    expect(sortCompleted(input).map((t) => t.number)).toEqual([2, 4, 3, 1])
  })

  it('closedAt 同値は issue 番号の降順で決定論的に並ぶ', () => {
    const same = '2026-07-04T12:00:00Z'
    const input = [task(10, same), task(30, same), task(20, same)]
    expect(sortCompleted(input).map((t) => t.number)).toEqual([30, 20, 10])
  })

  it('不正な closedAt 文字列は null と同様に末尾へ', () => {
    const input = [task(1, 'not-a-date'), task(2, '2026-07-03T10:00:00Z')]
    expect(sortCompleted(input).map((t) => t.number)).toEqual([2, 1])
  })

  it('入力配列を破壊しない', () => {
    const input = [
      task(1, '2026-07-01T10:00:00Z'),
      task(2, '2026-07-03T10:00:00Z'),
    ]
    const snapshot = input.map((t) => t.number)
    sortCompleted(input)
    expect(input.map((t) => t.number)).toEqual(snapshot)
  })
})
