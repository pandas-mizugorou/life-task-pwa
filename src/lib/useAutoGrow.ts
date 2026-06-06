import { useLayoutEffect, useRef } from 'react'

/**
 * Auto-grow a <textarea> to fit its content (iOS Safari has no `field-sizing`).
 * Attach the returned ref to the textarea and pass its current value so the height
 * recomputes on every change. Pair with `resize-none` + a `max-h-*` cap.
 */
export function useAutoGrow(value: string) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])
  return ref
}
