import { useEffect, useRef, useState } from 'react'

/**
 * Pull-to-refresh for a touch surface. Engages only when the touched vertical
 * scroller is already at the top and the finger moves DOWN, so it doesn't fight
 * column scrolling or the long-press card drag (disable it while dragging).
 *
 * Gesture math lives in refs (no stale closures); React state is only for the
 * indicator. `onRefresh` should be stable (e.g. a useCallback).
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
  const g = useRef({ active: false, startY: 0, dist: 0, scroller: null as HTMLElement | null })

  useEffect(() => {
    disabledRef.current = disabled
  }, [disabled])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const THRESHOLD = 64
    const MAX = 96
    const RESIST = 0.5
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
      setPull(0)
    }

    const onStart = (e: TouchEvent) => {
      if (disabledRef.current || refreshingRef.current || e.touches.length !== 1) return
      const scroller = scrollerOf(e.target)
      if (scroller && scroller.scrollTop > 0) return // mid-scroll, not a pull
      g.current = { active: true, startY: e.touches[0].clientY, dist: 0, scroller }
    }
    const onMove = (e: TouchEvent) => {
      if (!g.current.active) return
      if (disabledRef.current) return reset()
      if (g.current.scroller && g.current.scroller.scrollTop > 0) return reset()
      const dy = e.touches[0].clientY - g.current.startY
      if (dy <= 0) {
        g.current.dist = 0
        setPull(0)
        return
      }
      const dist = Math.min(dy * RESIST, MAX)
      g.current.dist = dist
      setPull(dist)
      if (dist > 3 && e.cancelable) e.preventDefault() // take over from native overscroll
    }
    const onEnd = async () => {
      if (!g.current.active) return
      const dist = g.current.dist
      g.current.active = false
      g.current.dist = 0
      setPull(0)
      if (dist >= THRESHOLD && !refreshingRef.current) {
        refreshingRef.current = true
        setRefreshing(true)
        try {
          await onRefresh()
        } finally {
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

  return { pull, refreshing }
}
