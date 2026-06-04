import { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/cn'

const button = cva(
  'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all select-none whitespace-nowrap disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary: 'bg-grad text-heroink shadow-lg shadow-accent/20 hover:brightness-105',
        secondary: 'bg-panel2 text-ink border border-line hover:border-accent/60',
        outline: 'border border-line text-ink hover:bg-panel2',
        ghost: 'text-sub hover:text-ink hover:bg-panel2',
        danger: 'bg-bad/15 text-bad border border-bad/30 hover:bg-bad/25',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 px-4 text-[15px]',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10 shrink-0',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(button({ variant, size }), className)} {...props} />
  ),
)
Button.displayName = 'Button'
