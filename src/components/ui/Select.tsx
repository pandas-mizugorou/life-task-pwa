import { forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/cn'

/** Styled native <select> — best UX on mobile (uses the OS picker). */
export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          'w-full h-11 pl-3.5 pr-10 rounded-xl bg-panel2 text-ink border border-line outline-none transition appearance-none focus:border-accent disabled:opacity-50',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sub"
        aria-hidden
      />
    </div>
  ),
)
Select.displayName = 'Select'
