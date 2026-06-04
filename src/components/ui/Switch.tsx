import * as RS from '@radix-ui/react-switch'
import { cn } from '../../lib/cn'

export function Switch({
  checked,
  onCheckedChange,
  className,
  'aria-label': ariaLabel,
}: {
  checked: boolean
  onCheckedChange: (v: boolean) => void
  className?: string
  'aria-label'?: string
}) {
  return (
    <RS.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-label={ariaLabel}
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-full border border-line bg-panel2 transition-colors data-[state=checked]:border-accent2 data-[state=checked]:bg-accent2',
        className,
      )}
    >
      <RS.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[22px]" />
    </RS.Root>
  )
}
