import * as RD from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn'

export const Dialog = RD.Root
export const DialogTrigger = RD.Trigger
export const DialogClose = RD.Close

export function DialogContent({
  children,
  className,
  title,
  description,
}: {
  children: React.ReactNode
  className?: string
  title: string
  description?: string
}) {
  return (
    <RD.Portal>
      <RD.Overlay className="fa-overlay fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
      <RD.Content
        className={cn(
          'fa-pop fixed left-1/2 top-1/2 z-50 w-[min(94vw,460px)] max-h-[88vh] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-2xl border border-line bg-panel p-5 shadow-2xl outline-none',
          className,
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <RD.Title className="text-lg font-bold text-ink">{title}</RD.Title>
            {/* description 未指定でも sr-only の Description を出す（Radix の
                aria-describedby 警告回避。Sheet と同じ扱い）。 */}
            {description ? (
              <RD.Description className="mt-1 text-sm text-sub">{description}</RD.Description>
            ) : (
              <RD.Description className="sr-only">{title}</RD.Description>
            )}
          </div>
          <RD.Close
            className="relative rounded-lg p-1 text-sub transition before:absolute before:-inset-2 before:content-[''] hover:bg-panel2 hover:text-ink"
            aria-label="閉じる"
          >
            <X className="h-5 w-5" />
          </RD.Close>
        </div>
        {children}
      </RD.Content>
    </RD.Portal>
  )
}
