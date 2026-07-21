import type { Label } from './types'

export type LabelFilterMode = 'include' | 'exclude'

export interface LabelFilter {
  mode: LabelFilterMode
  labels: string[]
}

export const EMPTY_LABEL_FILTER: LabelFilter = { mode: 'include', labels: [] }

/** 保存済みの端末状態を検証する。不正なモードや空選択は安全に解除する。 */
export function normalizeLabelFilter(value: unknown): LabelFilter {
  if (!value || typeof value !== 'object') return EMPTY_LABEL_FILTER
  const candidate = value as Partial<LabelFilter>
  if (candidate.mode !== 'include' && candidate.mode !== 'exclude') return EMPTY_LABEL_FILTER
  if (!Array.isArray(candidate.labels)) return EMPTY_LABEL_FILTER
  const labels = [...new Set(candidate.labels.filter((label): label is string => typeof label === 'string'))]
  return labels.length > 0 ? { mode: candidate.mode, labels } : EMPTY_LABEL_FILTER
}

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
  return normalizeLabelFilter({
    ...filter,
    labels: filter.labels.map((name) => (name === oldName ? newName : name)),
  })
}

export function removeLabelFromFilter(filter: LabelFilter, name: string): LabelFilter {
  if (!filter.labels.includes(name)) return filter
  return normalizeLabelFilter({ ...filter, labels: filter.labels.filter((label) => label !== name) })
}

/** 再起動中または他端末でGitHubから消えたラベルを、復元した条件から外す。 */
export function pruneLabelFilter(filter: LabelFilter, availableNames: Iterable<string>): LabelFilter {
  const available = new Set(availableNames)
  return normalizeLabelFilter({
    ...filter,
    labels: filter.labels.filter((name) => available.has(name)),
  })
}
