import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '../lib/cn'

/**
 * Render GitHub-flavoured Markdown (issue body / comments) with dark-theme styling
 * (see the `.md` block in index.css). react-markdown does NOT render raw HTML by
 * default, so this is safe without an extra sanitizer. Links open in a new tab, and
 * images (when `onImageClick` is given) open a lightbox — both handled via one
 * delegated click, which avoids overriding the `a`/`img` renderers (that would force
 * passing react-markdown's `node` prop and trip the no-unused-vars lint).
 */
export function Markdown({
  children,
  className,
  onImageClick,
}: {
  children: string
  className?: string
  /** Called when an inline image is tapped (opens a lightbox in the parent). */
  onImageClick?: (src: string, alt: string) => void
}) {
  return (
    <div
      className={cn('md break-words text-sm leading-relaxed text-ink/90', className)}
      onClickCapture={(e) => {
        const t = e.target as HTMLElement
        // Links win over images: a linked image `[![alt](img)](href)` should follow
        // the link, so check `a` first and bail before the image branch.
        const a = t.closest('a')
        if (a?.href) {
          e.preventDefault()
          window.open(a.href, '_blank', 'noopener,noreferrer')
          return
        }
        const img = t.closest('img')
        if (onImageClick && img instanceof HTMLImageElement && img.currentSrc) {
          e.preventDefault()
          onImageClick(img.currentSrc, img.alt ?? '')
        }
      }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  )
}
