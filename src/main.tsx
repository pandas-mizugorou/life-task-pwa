import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { PwaUpdatePrompt } from './components/PwaUpdatePrompt'
import { ToastProvider } from './components/ui/Toast'
import { AuthProvider } from './context/AuthContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <AuthProvider>
        <App />
        <PwaUpdatePrompt />
      </AuthProvider>
    </ToastProvider>
  </StrictMode>,
)
