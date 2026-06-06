import { useEffect, useRef, useState } from 'react'
import { haptic } from './haptics'

const THRESHOLD = 72 // content travel (px) at which releasing triggers a refresh
const MAX = 132 // hard cap on how far the surface follows the finger
const MIN_SPIN = 650 // keep the spinner up at least this long so a fast refresh registers

/**
 * Pull-to-refresh for a touch surface. Engages only when the touched vertical
 * scroller is already at the top and the finger moves DOWN, so it doesn't fight
 * column scrolling or the long-press card drag (disable it while dragging).
 *
 * The returned `pull` (px) is meant to be applied as a translateY to the content
 * so the surface physically follows the finger; `armed` (pulled past the trigger
 * point) lets the caller flip the affordance to "release to refresh". The refresh
 * is held visible for at least MIN_SPIN so an instant network refresh still reads
 * as "it refreshed".
 *
 * Gesture math lives in refs (no stale closures); React state drives the
 * indicator/content offset. `onRefresh` should be stable (e.g. a useCallback).
 *
 * NB: haptics are best-effort and a no-op on iOS — Safari/PWA does not expose the
 * Vibration API. The felt quality on iPhone comes from the visual response, not
 * the Taptic engine.
 */
export function usePullToRefresh(
  rootRef: React.RefObject<HTMLElement | null>,
  onRefresh: () => Promise<void> | void,
  disabled = false,
) {
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const disabledRef = useRef(disabled)
  const refreshingRef = useRef(false)
  const g = useRef({
    active: false,
    startY: 0,
    startX: 0,
    dist: 0,
    armed: false,
    scroller: null as HTMLElement | null,
  })

  useEffect(() => {
    disabledRef.current = disabled
  }, [disabled])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const stopAt = root.parentElement

    const scrollerOf = (el: EventTarget | null): HTMLElement | null => {
      let n = el as HTMLElement | null
      while (n && n !== stopAt) {
        if (n.scrollHeight > n.clientHeight + 1) {
          const oy = getComputedStyle(n).overflowY
          if (oy === 'auto' || oy === 'scroll') return n
        }
        n = n.parentElement
      }
      return null
    }

    const reset = () => {
      g.current.active = false
      g.current.dist = 0
      g.current.armed = false
      setPull(0)
    }

    const onStart = (e: TouchEvent) => {
      if (disabledRef.current || refreshingRef.current || e.touches.length !== 1) return
      const scroller = scrollerOf(e.target)
      if (scroller && scroller.scrollTop > 0) return // mid-scroll, not a pull
      g.current = {
        active: true,
        startY: e.touches[0].clientY,
        startX: e.touches[0].clientX,
        dist: 0,
        armed: false,
        scroller,
      }
    }
    const onMove = (e: TouchEvent) => {
      if (!g.current.active) return
      if (disabledRef.current) return reset()
      if (g.current.scroller && g.current.scroller.scrollTop > 0) return reset()
      const dy = e.touches[0].clientY - g.current.startY
      const dx = e.touches[0].clientX - g.current.startX
      // Horizontal swipe (kanban column paging) → hand it back to the native scroller
      // and stay out of the way, so left/right scrolling stays smooth.
      if (g.current.dist === 0 && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 6) return reset()
      if (dy <= 0) {
        g.current.dist = 0
        g.current.armed = false
        setPull(0)
        return
      }
      // Track the finger 1:1 up to the trigger point (responsive), then rubber-band
      // with growing resistance so the surface feels physical and "catches" when armed.
      const dist = Math.min(dy <= THRESHOLD ? dy : THRESHOLD + (dy - THRESHOLD) * 0.42, MAX)
      g.current.dist = dist
      const nowArmed = dist >= THRESHOLD
      if (nowArmed && !g.current.armed) haptic(16) // crossed into "release to refresh" (no-op on iOS)
      g.current.armed = nowArmed
      setPull(dist)
      if (dist > 3 && e.cancelable) e.preventDefault() // take over from native overscroll
    }
    const onEnd = async () => {
      if (!g.current.active) return
      const armed = g.current.armed
      g.current.active = false
      g.current.dist = 0
      g.current.armed = false
      setPull(0)
      if (armed && !refreshingRef.current) {
        refreshingRef.current = true
        setRefreshing(true)
        haptic([12, 28, 12]) // refresh kicked off (no-op on iOS)
        const startedAt = Date.now()
        try {
          await onRefresh()
        } finally {
          const elapsed = Date.now() - startedAt
          if (elapsed < MIN_SPIN) await new Promise((r) => setTimeout(r, MIN_SPIN - elapsed))
          refreshingRef.current = false
          setRefreshing(false)
        }
      }
    }

    root.addEventListener('touchstart', onStart, { passive: true })
    root.addEventListener('touchmove', onMove, { passive: false })
    root.addEventListener('touchend', onEnd)
    root.addEventListener('touchcancel', onEnd)
    return () => {
      root.removeEventListener('touchstart', onStart)
      root.removeEventListener('touchmove', onMove)
      root.removeEventListener('touchend', onEnd)
      root.removeEventListener('touchcancel', onEnd)
    }
  }, [rootRef, onRefresh])

  return { pull, refreshing, armed: pull >= THRESHOLD }
}
