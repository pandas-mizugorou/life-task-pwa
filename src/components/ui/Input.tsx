import { forwardRef } from 'react'
import { cn } from '../../lib/cn'

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full h-11 px-3.5 rounded-xl bg-panel2 text-ink border border-line outline-none transition placeholder:text-sub/50 focus:border-accent disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'w-full min-h-[88px] px-3.5 py-2.5 rounded-xl bg-panel2 text-ink border border-line outline-none transition placeholder:text-sub/50 focus:border-accent disabled:opacity-50 resize-y leading-relaxed',
      className,
    )}
    {...props}
  />
))
Textarea.displayName = 'Textarea'

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn('block text-[13px] font-semibold text-sub mb-1.5', className)} {...props} />
  )
}
