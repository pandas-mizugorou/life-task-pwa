import * as RD from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn'

/** Bottom sheet (mobile-first) built on Radix Dialog. */
export const Sheet = RD.Root
export const SheetTrigger = RD.Trigger
export const SheetClose = RD.Close

export function SheetContent({
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
          'fa-sheet fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[88vh] w-full max-w-xl overflow-auto rounded-t-3xl border-t border-line bg-panel px-5 pt-3 shadow-2xl outline-none',
          className,
        )}
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 18px)' }}
        // Let an autoFocus field (e.g. the add/label inputs) take focus instead of the
        // drag handle; on mobile this also opens the keyboard immediately for forms.
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Dismiss by tapping the handle, the X, or outside the sheet. tabIndex -1 so it
            is not the keyboard/auto-focus target (the X and overlay also close). */}
        <RD.Close
          aria-label="閉じる"
          tabIndex={-1}
          className="mx-auto mb-3 block h-1.5 w-12 rounded-full bg-line transition hover:bg-sub"
        />
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <RD.Title className="text-lg font-bold text-ink">{title}</RD.Title>
            {description ? (
              <RD.Description className="mt-1 line-clamp-2 text-sm text-sub">
                {description}
              </RD.Description>
            ) : (
              <RD.Description className="sr-only">{title}</RD.Description>
            )}
          </div>
          <RD.Close
            aria-label="閉じる"
            className="-mr-1 shrink-0 rounded-lg p-1.5 text-sub transition hover:bg-panel2 hover:text-ink"
          >
            <X className="h-5 w-5" />
          </RD.Close>
        </div>
        {children}
      </RD.Content>
    </RD.Portal>
  )
}
