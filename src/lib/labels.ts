import type { Label } from './types'

/** The repo's label set (pandas-mizugorou/life). Colors are 6-digit hex, no '#'. */
export const LABELS: Label[] = [
  { name: 'IIJ', color: '1f6feb' },
  { name: 'AIx', color: '8957e5' },
  { name: 'プライベート', color: '2da44e' },
  { name: 'Swift', color: 'f05138' },
  { name: '副業', color: 'bf8700' },
]

export function labelColor(name: string): string {
  return LABELS.find((l) => l.name === name)?.color ?? '8b97b8'
}
