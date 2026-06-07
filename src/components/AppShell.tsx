import { useEffect, useState } from 'react'
import { ListChecks, RefreshCw, Settings as SettingsIcon } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '../lib/cn'
import { haptic } from '../lib/haptics'
import { useAuth } from '../context/AuthContext'
import { useBoard } from '../context/BoardContext'

// Sub-routes light up their parent tab so the user never looks "lost" in the PWA:
// /t/:number belongs to the board, /labels belongs to settings.
const NAV = [
  {
    to: '/',
    label: 'ボード',
    icon: ListChecks,
    match: (p: string) => p === '/' || p.startsWith('/t/'),
  },
  {
    to: '/settings',
    label: '設定',
    icon: SettingsIcon,
    match: (p: string) => p.startsWith('/settings') || p.startsWith('/labels'),
  },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const { refresh, loading } = useBoard()
  const { unverified } = useAuth()
  const { pathname } = useLocation()
  const reduce = useReducedMotion()
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])
  return (
    <div className="flex h-screen flex-col" style={{ height: '100dvh' }}>
      <header
        className="z-40 border-b border-line/70 bg-bg/80 backdrop-blur-md"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">
          <div className="flex items-center gap-2 font-bold">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-grad text-heroink">
              <ListChecks className="h-4 w-4" />
            </span>
            <span className="text-ink">Lifeタスク</span>
          </div>
          <button
            onClick={() => {
              haptic(8)
              refresh()
            }}
            className="ml-auto rounded-lg p-3 text-sub transition hover:bg-panel2 hover:text-ink"
            aria-label="更新"
          >
            <RefreshCw className={cn('h-5 w-5', loading && 'animate-spin')} />
          </button>
        </div>
      </header>

      {!online && (
        <div
          role="status"
          className="bg-warn/15 px-4 py-1.5 text-center text-xs font-semibold text-warn"
        >
          オフラインです — 操作できません（電波の良い場所で再度お試しください）
        </div>
      )}

      {online && unverified && (
        <div
          role="status"
          className="bg-panel2 px-4 py-1.5 text-center text-xs font-semibold text-sub"
        >
          オフライン中に起動したため、接続を確認しています…
        </div>
      )}

      {/* No scroll here — each page manages its own (Board = full-height kanban). */}
      <main className="min-h-0 flex-1 overflow-hidden">{children}</main>

      <nav
        className="z-40 border-t border-line bg-panel/90 backdrop-blur-xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto grid max-w-2xl grid-cols-2">
          {NAV.map((n) => {
            const Icon = n.icon
            const isActive = n.match(pathname)
            return (
              <Link
                key={n.to}
                to={n.to}
                className="relative"
                onClick={() => haptic(8)}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className="relative flex flex-col items-center gap-1 py-2.5">
                  {isActive && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-x-10 inset-y-1 rounded-2xl bg-accent2/12"
                      transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 480, damping: 38 }}
                      aria-hidden
                    />
                  )}
                  <Icon
                    className={cn('relative h-[22px] w-[22px] transition-colors', isActive ? 'text-accent2' : 'text-sub')}
                  />
                  <span
                    className={cn('relative text-[11px] font-semibold transition-colors', isActive ? 'text-accent2' : 'text-sub')}
                  >
                    {n.label}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
