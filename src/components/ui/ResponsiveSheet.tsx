import { Sheet, SheetContent } from './Sheet'
import { DialogContent } from './Dialog'
import { useIsDesktop } from '../../lib/useMediaQuery'

// Sheet と Dialog はどちらも Radix Dialog（同じ Root）で、Content の props シグネチャも
// 完全一致（{ children, className, title, description }）。そのため Root は共有し、
// Content だけ画面幅で入れ替える。モバイル＝下から出るシート、PC＝中央ダイアログ。

/** ルートは Sheet（＝ Radix Dialog Root）を共有。呼び出し側はこれをそのまま使う。 */
export const ResponsiveSheet = Sheet

type ContentProps = {
  children: React.ReactNode
  className?: string
  title: string
  description?: string
}

/** PC ではダイアログ、モバイルではボトムシートとして中身を描画する。 */
export function ResponsiveSheetContent(props: ContentProps) {
  const isDesktop = useIsDesktop()
  return isDesktop ? <DialogContent {...props} /> : <SheetContent {...props} />
}
