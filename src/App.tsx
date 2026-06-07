import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { FullSpinner } from './components/ui/Spinner'
import { useAuth } from './context/AuthContext'
import { BoardProvider } from './context/BoardContext'
import { Board } from './pages/Board'
import { Gate } from './pages/Gate'
import { LabelManager } from './pages/LabelManager'
import { Settings } from './pages/Settings'
import { TaskDetail } from './pages/TaskDetail'

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
        <Routes location={location}>
          <Route path="/" element={<Board />} />
          <Route path="/t/:number" element={<TaskDetail />} />
          <Route path="/labels" element={<LabelManager />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
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
