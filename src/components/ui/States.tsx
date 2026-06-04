import type { ReactNode } from 'react'
import { Button } from './Button'
import { Spinner } from './Spinner'

export function Loading({ label }: { label?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-10 text-sub"
      role="status"
      aria-live="polite"
    >
      <Spinner className="h-7 w-7 text-accent" />
      <p className={label ? 'text-sm' : 'sr-only'}>{label ?? '読み込み中'}</p>
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      {icon && (
        <div className="mb-1 text-3xl" aria-hidden>
          {icon}
        </div>
      )}
      <p className="font-bold text-ink">{title}</p>
      {description && <p className="max-w-xs text-sm leading-relaxed text-sub">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center" role="alert">
      <p className="max-w-xs text-sm leading-relaxed text-sub">{message ?? '読み込みに失敗しました'}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          再試行
        </Button>
      )}
    </div>
  )
}
