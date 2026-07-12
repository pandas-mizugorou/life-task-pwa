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

// Tailwind v4 の `lg` は 64rem（＝ブラウザ既定フォント基準の rem）。px 固定にすると
// ユーザーがブラウザのフォントサイズを変えたとき CSS(lg) と JS 判定がズレて、PC/モバイル
// のレイアウトが混在する。メディアクエリの rem もフォント基準なので lg と常に一致する。
/** Tailwind の `lg`（64rem）以上か。ブレークポイント定数を1箇所に集約する。 */
export const useIsDesktop = () => useMediaQuery('(min-width: 64rem)')
