import * as RD from '@radix-ui/react-dialog'
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
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line" aria-hidden />
        <RD.Title className="text-lg font-bold text-ink">{title}</RD.Title>
        {description ? (
          <RD.Description className="mt-1 line-clamp-2 text-sm text-sub">{description}</RD.Description>
        ) : (
          <RD.Description className="sr-only">{title}</RD.Description>
        )}
        <div className="mt-4">{children}</div>
      </RD.Content>
    </RD.Portal>
  )
}
