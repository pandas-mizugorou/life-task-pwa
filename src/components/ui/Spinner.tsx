import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/cn'

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('animate-spin', className)} aria-hidden />
}

export function FullSpinner({ label }: { label?: string }) {
  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-sub"
      role="status"
      aria-live="polite"
    >
      <Spinner className="h-7 w-7 text-accent" />
      <p className={label ? 'text-sm' : 'sr-only'}>{label ?? '読み込み中…'}</p>
    </div>
  )
}
