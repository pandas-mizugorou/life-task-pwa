import { Suspense, lazy } from 'react'
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'framer-motion'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { DesktopBoardLayout } from './components/DesktopBoardLayout'
import { FullSpinner } from './components/ui/Spinner'
import { useAuth } from './context/AuthContext'
import { BoardProvider } from './context/BoardContext'
import { useIsDesktop } from './lib/useMediaQuery'
import { Board } from './pages/Board'
import { Gate } from './pages/Gate'
import { Settings } from './pages/Settings'

// Code-split the secondary pages so their code (incl. the markdown renderer pulled
// in by TaskDetail) isn't in the initial board bundle. Board/Settings stay eager
// (Board is the home screen; Settings is also the first-run setup screen).
const TaskDetail = lazy(() =>
  import('./pages/TaskDetail').then((m) => ({ default: m.TaskDetail })),
)
const LabelManager = lazy(() =>
  import('./pages/LabelManager').then((m) => ({ default: m.LabelManager })),
)

/**
 * ルーティングを画面幅で分岐する。
 *
 * - PC（lg 以上）: Board を常時マウントしたまま右に詳細パネルを出す2ペイン
 *   （`/` と `/t/:number` を同じ DesktopBoardLayout に割り当てて Board を保持）。
 *   AnimatePresence のフェードは使わない（ボードを毎回消したくないため）。
 * - モバイル: 従来どおり mode="wait" のクロスフェードで1画面ずつ切り替える。
 *   old ページを先にアンマウントするのでスクロール復元（マウント時実行）も無傷。
 *   フェードは prefers-reduced-motion で無効化。
 *
 * `/labels`・`/settings` はどちらの幅でも全画面ページのまま。
 */
function AppRoutes() {
  const isDesktop = useIsDesktop()
  const location = useLocation()
  const reduce = useReducedMotion()

  if (isDesktop) {
    return (
      <Suspense fallback={<FullSpinner label="読み込み中…" />}>
        <Routes location={location}>
          <Route path="/" element={<DesktopBoardLayout />} />
          <Route path="/t/:number" element={<DesktopBoardLayout />} />
          <Route path="/labels" element={<LabelManager />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    )
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        className="h-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduce ? 0 : 0.14, ease: 'easeOut' }}
      >
        <Suspense fallback={<FullSpinner label="読み込み中…" />}>
          <Routes location={location}>
            <Route path="/" element={<Board />} />
            <Route path="/t/:number" element={<TaskDetail />} />
            <Route path="/labels" element={<LabelManager />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  )
}

export default function App() {
  const { ready, configured, unlocked } = useAuth()

  if (!ready) return <FullSpinner label="読み込み中…" />
  if (!configured) return <Settings firstRun />
  if (!unlocked) return <Gate />

  return (
    // reducedMotion="user": framer-driven animations (incl. the label Reorder list,
    // which has no per-component reduce check) follow the OS reduce-motion setting.
    <MotionConfig reducedMotion="user">
      <BoardProvider>
        <BrowserRouter>
          <AppShell>
            <AppRoutes />
          </AppShell>
        </BrowserRouter>
      </BoardProvider>
    </MotionConfig>
  )
}
