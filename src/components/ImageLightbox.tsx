import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

/**
 * Full-screen image viewer for tapping an image in a comment / body Markdown.
 * The pasted images render small inline; on phones they're hard to read, so a tap
 * opens this overlay and shows the image fit-to-screen (object-contain). Closes on
 * backdrop tap, the × button, or Esc. No pinch-zoom — fit-to-screen solves the
 * "too small to see" problem; the original is always reachable via "GitHub で開く".
 */
export function ImageLightbox({
  src,
  alt,
  onClose,
}: {
  src: string
  alt: string
  onClose: () => void
}) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    // Remember what had focus so we can restore it after closing (a11y).
    const prevFocus = document.activeElement as HTMLElement | null
    // Lock background scroll while the overlay is open.
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Move focus to the close button so Esc / Enter act on the overlay.
    closeRef.current?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)

    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      prevFocus?.focus?.()
    }
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt || '画像'}
      onClick={onClose} // backdrop OR image tap closes (standard lightbox behaviour)
      // fa-overlay-in is the existing opacity-only fade keyframe (index.css); reused
      // here directly. prefers-reduced-motion is neutralised globally in index.css.
      className="fixed inset-0 z-50 flex items-center justify-center overscroll-contain bg-black/90 p-4 [animation:fa-overlay-in_0.16s_ease-out]"
    >
      <button
        ref={closeRef}
        onClick={onClose}
        aria-label="閉じる"
        // Offset for the iOS notch / status bar so the button isn't under it.
        className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>
      {/* 100dvh (dynamic viewport) avoids the iOS Safari 100vh overflow. */}
      <img
        src={src}
        alt={alt}
        className="max-h-[100dvh] max-w-full object-contain"
        // Tapping the image itself also closes (onClick bubbles to the backdrop).
      />
    </div>
  )
}
