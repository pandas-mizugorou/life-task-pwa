import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '../lib/cn'

/**
 * Render GitHub-flavoured Markdown (issue body / comments) with dark-theme styling
 * (see the `.md` block in index.css). react-markdown does NOT render raw HTML by
 * default, so this is safe without an extra sanitizer. Links open in a new tab via a
 * delegated click — avoids overriding the `a` renderer (which would force passing
 * react-markdown's `node` prop and trip the no-unused-vars lint).
 */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div
      className={cn('md break-words text-sm leading-relaxed text-ink/90', className)}
      onClickCapture={(e) => {
        const a = (e.target as HTMLElement).closest('a')
        if (a?.href) {
          e.preventDefault()
          window.open(a.href, '_blank', 'noopener,noreferrer')
        }
      }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  )
}
