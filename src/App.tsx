import { Suspense, lazy } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { FullSpinner } from './components/ui/Spinner'
import { useAuth } from './context/AuthContext'
import { BoardProvider } from './context/BoardContext'
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
 * Routes with a light cross-fade between pages so navigation doesn't feel like a
 * hard reload. mode="wait" unmounts the old page before mounting the new one, so
 * only one is ever mounted — scroll restoration (which runs on mount) is untouched.
 * The fade is disabled under prefers-reduced-motion.
 */
function AnimatedRoutes() {
  const location = useLocation()
  const reduce = useReducedMotion()
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
    <BoardProvider>
      <BrowserRouter>
        <AppShell>
          <AnimatedRoutes />
        </AppShell>
      </BrowserRouter>
    </BoardProvider>
  )
}
