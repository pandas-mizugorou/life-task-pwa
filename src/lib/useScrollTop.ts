import { useLayoutEffect } from 'react'

/**
 * Reset a scroll container to the top whenever `key` changes (e.g. the route
 * param). Most pages remount on navigation (already top), but same-route param
 * changes (e.g. /t/1 → /t/2) keep the component mounted and retain scroll — this
 * makes scroll-to-top deterministic instead of remount-timing dependent.
 */
export function useScrollTop(ref: React.RefObject<HTMLElement | null>, key: unknown) {
  useLayoutEffect(() => {
    ref.current?.scrollTo({ top: 0 })
  }, [ref, key])
}
