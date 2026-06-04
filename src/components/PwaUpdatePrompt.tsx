import { AnimatePresence, motion } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import { useRegisterSW } from 'virtual:pwa-register/react'

/** Bottom prompt shown when a new app version is available. Tap to update. */
export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, r) {
      // hourly background check for updates
      if (r) setInterval(() => r.update(), 60 * 60 * 1000)
    },
  })

  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.div
          initial={{ y: 90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 90, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          className="fixed inset-x-0 bottom-0 z-[110] mx-auto flex w-[min(92vw,420px)] items-center gap-3 rounded-2xl border border-line bg-panel px-4 py-3 shadow-2xl"
          style={{ marginBottom: 'calc(env(safe-area-inset-bottom) + 76px)' }}
        >
          <RefreshCw className="h-5 w-5 shrink-0 text-accent" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-ink">新しいバージョンがあります</div>
            <div className="text-xs text-sub">最新の機能・修正を取り込めます</div>
          </div>
          <button
            onClick={() => updateServiceWorker(true)}
            className="bg-grad shrink-0 rounded-xl px-3.5 py-2 text-sm font-bold text-heroink"
          >
            更新
          </button>
          <button onClick={() => setNeedRefresh(false)} className="shrink-0 px-1 text-xs text-sub">
            後で
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
