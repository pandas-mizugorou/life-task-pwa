import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import {
  TransformWrapper,
  TransformComponent,
  type ReactZoomPanPinchRef,
} from 'react-zoom-pan-pinch'

/**
 * Full-screen image viewer opened by tapping an image in a comment / body Markdown.
 * Shows the image fit-to-screen (object-contain), and supports pinch-to-zoom, pan
 * (drag while zoomed), and double-tap to toggle zoom — via react-zoom-pan-pinch.
 *
 * Close model: the × button and Esc ALWAYS close (a guaranteed escape hatch, even
 * while zoomed). Tapping the backdrop or the image closes ONLY at 1× — while zoomed
 * a tap is left to the pan/double-tap gestures so it doesn't dismiss mid-inspection.
 * We read the live scale from the library ref (no re-render needed just to decide).
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
  const rootRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef<ReactZoomPanPinchRef | null>(null)

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)

    // iOS Safari: stop the overlay's pinch from becoming a *page* zoom, without
    // touching the viewport meta (that would hurt a11y elsewhere). gesturestart/
    // change/end are WebKit-only; preventing them blocks the page-level zoom while
    // leaving react-zoom-pan-pinch's own (pointer-based) pinch/pan untouched. We do
    // NOT intercept touchmove — the library sets touch-action and preventDefaults
    // internally, so a blanket touchmove block here would fight its pan/pinch.
    const root = rootRef.current
    const stopGesture = (e: Event) => {
      if (e.cancelable) e.preventDefault()
    }
    root?.addEventListener('gesturestart', stopGesture, { passive: false })
    root?.addEventListener('gesturechange', stopGesture, { passive: false })
    root?.addEventListener('gestureend', stopGesture, { passive: false })

    return () => {
      window.removeEventListener('keydown', onKey)
      root?.removeEventListener('gesturestart', stopGesture)
      root?.removeEventListener('gesturechange', stopGesture)
      root?.removeEventListener('gestureend', stopGesture)
      document.body.style.overflow = prevOverflow
      prevFocus?.focus?.()
    }
  }, [onClose])

  // Close on a *backdrop* tap (the black margin around the image), and only at 1×.
  // We deliberately do NOT close on an image tap: that tap belongs to the library's
  // gestures (a double-tap must zoom, not dismiss on its first click; a pan must not
  // dismiss). The × button and Esc remain the always-available way to close.
  const onBackdropClick = (e: React.MouseEvent) => {
    const t = e.target as HTMLElement
    if (t.closest('img') || t.closest('button')) return // image / × handled elsewhere
    const scale = zoomRef.current?.state.scale ?? 1
    if (scale <= 1.01) onClose()
  }

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={alt || '画像'}
      onClick={onBackdropClick}
      className="fixed inset-0 z-50 overscroll-contain bg-black/90 [animation:fa-overlay-in_0.16s_ease-out] [touch-action:manipulation]"
    >
      <button
        ref={closeRef}
        onClick={onClose}
        aria-label="閉じる"
        className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-10 rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>

      <TransformWrapper
        ref={zoomRef}
        minScale={1}
        maxScale={4}
        centerOnInit
        doubleClick={{ mode: 'toggle', step: 1.6 }}
        wheel={{ step: 0.2 }}
        panning={{ velocityDisabled: true }}
      >
        <TransformComponent
          // Fill the overlay so the image is centred and the tap area covers the screen.
          wrapperStyle={{ width: '100%', height: '100%' }}
          contentStyle={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* The image is left to the library's gestures (pinch / pan / double-tap).
              Dismissal is via backdrop tap (at 1×), the × button, or Esc. */}
          <img
            src={src}
            alt={alt}
            draggable={false}
            className="max-h-[100dvh] max-w-full select-none object-contain"
          />
        </TransformComponent>
      </TransformWrapper>
    </div>
  )
}
