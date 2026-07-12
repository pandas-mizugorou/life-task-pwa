import { Suspense, lazy } from 'react'
import { useMatch, useNavigate } from 'react-router-dom'
import { Board } from '../pages/Board'
import { FullSpinner } from './ui/Spinner'

// TaskDetail は markdown レンダラを引き込むため、初期ボードのバンドルに含めない
// （App.tsx のモバイル側と同じ理由で遅延読み込み）。
const TaskDetail = lazy(() =>
  import('../pages/TaskDetail').then((m) => ({ default: m.TaskDetail })),
)

/**
 * PC（lg 以上）用の2ペインレイアウト。Board を常時マウントしたまま、
 * URL に `/t/:number` が含まれるときだけ右側に詳細パネルを開く。
 * `/` と `/t/:number` の両方をこの同じコンポーネント型に割り当てることで、
 * React が同位置・同型として Board を保持し続け、詳細を開閉してもボードが
 * 再マウントされない（＝ドラッグ状態・スクロール位置が保たれる）。
 */
export function DesktopBoardLayout() {
  const match = useMatch('/t/:number')
  const number = match?.params.number
  const navigate = useNavigate()

  // 閉じたらフォーカスを起点のカードへ戻す。素の aside は Dialog と違いフォーカス管理が
  // ないため、aside 内の閉じるボタンにフォーカスがあるまま消えると body に落ちてしまう
  // （キーボード利用者がボード先頭まで Tab し直す羽目になる）。data-task で復帰先を特定。
  const closePanel = () => {
    const n = number
    navigate('/')
    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(`[data-task="${n}"]`)?.focus()
    })
  }

  return (
    <div className="flex h-full min-h-0">
      <div className="min-w-0 flex-1">
        <Board />
      </div>
      {number != null && (
        <aside
          aria-label="タスク詳細"
          className="w-[var(--panel-w)] shrink-0 border-l border-line bg-panel/40"
        >
          <Suspense fallback={<FullSpinner label="読み込み中…" />}>
            {/* key={number} で別タスクへ切り替えるたびリマウント＝現行のルート遷移と同じ挙動。 */}
            <TaskDetail key={number} panel onClose={closePanel} />
          </Suspense>
        </aside>
      )}
    </div>
  )
}
