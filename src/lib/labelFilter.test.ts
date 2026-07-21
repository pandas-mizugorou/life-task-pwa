import { describe, expect, it } from 'vitest'
import {
  EMPTY_LABEL_FILTER,
  matchesLabelFilter,
  normalizeLabelFilter,
  pruneLabelFilter,
  removeLabelFromFilter,
  renameLabelInFilter,
  type LabelFilter,
} from './labelFilter'

const labels = (...names: string[]) => names.map((name) => ({ name }))

describe('matchesLabelFilter', () => {
  it('選択なしは全タスクを表示する', () => {
    expect(matchesLabelFilter(labels('仕事'), EMPTY_LABEL_FILTER)).toBe(true)
    expect(matchesLabelFilter([], EMPTY_LABEL_FILTER)).toBe(true)
  })

  it('include は選択ラベルのいずれかに一致すれば表示する', () => {
    const filter: LabelFilter = { mode: 'include', labels: ['仕事', '個人'] }
    expect(matchesLabelFilter(labels('仕事'), filter)).toBe(true)
    expect(matchesLabelFilter(labels('個人', '重要'), filter)).toBe(true)
    expect(matchesLabelFilter(labels('重要'), filter)).toBe(false)
    expect(matchesLabelFilter([], filter)).toBe(false)
  })

  it('exclude は選択ラベルのいずれかに一致すれば隠す', () => {
    const filter: LabelFilter = { mode: 'exclude', labels: ['保留', 'あとで'] }
    expect(matchesLabelFilter(labels('保留'), filter)).toBe(false)
    expect(matchesLabelFilter(labels('重要', 'あとで'), filter)).toBe(false)
    expect(matchesLabelFilter(labels('重要'), filter)).toBe(true)
    expect(matchesLabelFilter([], filter)).toBe(true)
  })
})

describe('フィルター中のラベル変更', () => {
  it('名称変更を選択状態へ反映する', () => {
    expect(
      renameLabelInFilter({ mode: 'include', labels: ['仕事', '個人'] }, '仕事', '業務'),
    ).toEqual({ mode: 'include', labels: ['業務', '個人'] })
  })

  it('削除されたラベルだけを選択状態から外す', () => {
    expect(
      removeLabelFromFilter({ mode: 'exclude', labels: ['保留', '個人'] }, '保留'),
    ).toEqual({ mode: 'exclude', labels: ['個人'] })
  })

  it('選択ラベルがすべて削除されたら絞り込みなしへ戻す', () => {
    expect(removeLabelFromFilter({ mode: 'exclude', labels: ['保留'] }, '保留')).toEqual(
      EMPTY_LABEL_FILTER,
    )
  })
})

describe('保存済みフィルターの復元', () => {
  it('不正な保存値は絞り込みなしとして扱う', () => {
    expect(normalizeLabelFilter({ mode: 'all', labels: ['仕事'] })).toEqual(EMPTY_LABEL_FILTER)
    expect(normalizeLabelFilter({ mode: 'include', labels: '仕事' })).toEqual(EMPTY_LABEL_FILTER)
  })

  it('重複を除き、GitHubから消えたラベルを復元時に外す', () => {
    const restored = normalizeLabelFilter({ mode: 'exclude', labels: ['仕事', '仕事', '個人'] })
    expect(pruneLabelFilter(restored, ['個人', '重要'])).toEqual({ mode: 'exclude', labels: ['個人'] })
  })
})
