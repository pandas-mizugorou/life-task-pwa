import { ListChecks, RefreshCw, Settings as SettingsIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { NavLink } from 'react-router-dom'
import { cn } from '../lib/cn'
import { haptic } from '../lib/haptics'
import { useBoard } from '../context/BoardContext'

const NAV = [
  { to: '/', label: 'ボード', icon: ListChecks, end: true },
  { to: '/settings', label: '設定', icon: SettingsIcon, end: false },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const { refresh, loading } = useBoard()
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
            className="ml-auto rounded-lg p-2 text-sub transition hover:bg-panel2 hover:text-ink"
            aria-label="更新"
          >
            <RefreshCw className={cn('h-5 w-5', loading && 'animate-spin')} />
          </button>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain">
        <div className="mx-auto max-w-2xl px-4 pb-28 pt-4">{children}</div>
      </main>

      <nav
        className="z-40 border-t border-line bg-panel/90 backdrop-blur-xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto grid max-w-2xl grid-cols-2">
          {NAV.map((n) => {
            const Icon = n.icon
            return (
              <NavLink key={n.to} to={n.to} end={n.end} className="relative" onClick={() => haptic(8)}>
                {({ isActive }) => (
                  <div className="relative flex flex-col items-center gap-1 py-2.5">
                    {isActive && (
                      <motion.span
                        layoutId="nav-pill"
                        className="absolute inset-x-10 inset-y-1 rounded-2xl bg-accent2/12"
                        transition={{ type: 'spring', stiffness: 480, damping: 38 }}
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
                )}
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
