import { cn } from '../../lib/cn'

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('fa-card bg-panel border border-line rounded-2xl p-5', className)}
      {...props}
    />
  )
}

export function CardTitle({
  children,
  className,
  right,
}: {
  children: React.ReactNode
  className?: string
  right?: React.ReactNode
}) {
  return (
    <div className={cn('mb-4 flex items-center gap-2.5', className)}>
      <span className="h-4 w-1 shrink-0 rounded bg-grad" aria-hidden />
      <h2 className="text-[15px] font-bold text-ink/90">{children}</h2>
      {right && <div className="ml-auto">{right}</div>}
    </div>
  )
}
