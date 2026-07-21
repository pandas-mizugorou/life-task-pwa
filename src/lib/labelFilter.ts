import type { Label } from './types'

export type LabelFilterMode = 'include' | 'exclude'

export interface LabelFilter {
  mode: LabelFilterMode
  labels: string[]
}

export const EMPTY_LABEL_FILTER: LabelFilter = { mode: 'include', labels: [] }

export function hasActiveLabelFilter(filter: LabelFilter): boolean {
  return filter.labels.length > 0
}

/**
 * 複数ラベルの一致判定。include / exclude とも OR で評価し、選択なしは全件表示する。
 * exclude では一致しなかったラベルなしタスクもそのまま残る。
 */
export function matchesLabelFilter(
  taskLabels: readonly Pick<Label, 'name'>[],
  filter: LabelFilter,
): boolean {
  if (!hasActiveLabelFilter(filter)) return true
  const selected = new Set(filter.labels)
  const matchesAny = taskLabels.some((label) => selected.has(label.name))
  return filter.mode === 'include' ? matchesAny : !matchesAny
}

export function renameLabelInFilter(
  filter: LabelFilter,
  oldName: string,
  newName: string,
): LabelFilter {
  if (!filter.labels.includes(oldName) || oldName === newName) return filter
  return {
    ...filter,
    labels: filter.labels.map((name) => (name === oldName ? newName : name)),
  }
}

export function removeLabelFromFilter(filter: LabelFilter, name: string): LabelFilter {
  if (!filter.labels.includes(name)) return filter
  return { ...filter, labels: filter.labels.filter((label) => label !== name) }
}
