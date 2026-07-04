import { useSyncExternalStore } from 'react'

/**
 * メディアクエリの一致状態を購読する hook。`useSyncExternalStore` を使うことで
 * 初回描画から正しい値を返し（モバイル→PC のちらつきを防ぐ）、ブレークポイント
 * 変化にも追従する。SSR/テスト環境ではフォールバックで `false` を返す。
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = (cb: () => void) => {
    const mql = window.matchMedia(query)
    mql.addEventListener('change', cb)
    return () => mql.removeEventListener('change', cb)
  }
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Tailwind の `lg`（1024px）以上か。ブレークポイント定数を1箇所に集約する。 */
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)')
