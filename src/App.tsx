import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { FullSpinner } from './components/ui/Spinner'
import { useAuth } from './context/AuthContext'
import { BoardProvider } from './context/BoardContext'
import { Board } from './pages/Board'
import { Gate } from './pages/Gate'
import { Settings } from './pages/Settings'
import { TaskDetail } from './pages/TaskDetail'

export default function App() {
  const { ready, configured, unlocked } = useAuth()

  if (!ready) return <FullSpinner label="読み込み中…" />
  if (!configured) return <Settings firstRun />
  if (!unlocked) return <Gate />

  return (
    <BoardProvider>
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<Board />} />
            <Route path="/t/:number" element={<TaskDetail />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </BoardProvider>
  )
}
