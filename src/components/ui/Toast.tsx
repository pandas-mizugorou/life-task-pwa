import * as RT from '@radix-ui/react-toast'
import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { cn } from '../../lib/cn'

type ToastVariant = 'default' | 'success' | 'error'
interface ToastItem {
  id: number
  title: string
  description?: string
  variant: ToastVariant
}
type ToastInput = { title: string; description?: string; variant?: ToastVariant }

const ToastCtx = createContext<(t: ToastInput) => void>(() => {})

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  return useContext(ToastCtx)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const counter = useRef(0)

  const toast = useCallback((t: ToastInput) => {
    const id = ++counter.current
    setItems((s) => [...s, { id, variant: 'default', ...t }])
  }, [])

  const remove = (id: number) => setItems((s) => s.filter((i) => i.id !== id))

  return (
    <ToastCtx.Provider value={toast}>
      <RT.Provider swipeDirection="right" duration={4200}>
        {children}
        {items.map((it) => (
          <RT.Root
            key={it.id}
            duration={4200}
            onOpenChange={(open) => {
              if (!open) remove(it.id)
            }}
            className="fa-toast flex items-start gap-3 rounded-xl border border-line bg-panel p-3.5 shadow-2xl"
          >
            <span
              className={cn(
                'mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full',
                it.variant === 'success' && 'bg-accent2',
                it.variant === 'error' && 'bg-bad',
                it.variant === 'default' && 'bg-accent',
              )}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <RT.Title className="text-[14px] font-bold text-ink">{it.title}</RT.Title>
              {it.description && (
                <RT.Description className="mt-0.5 text-[13px] leading-snug text-sub">
                  {it.description}
                </RT.Description>
              )}
            </div>
          </RT.Root>
        ))}
        <RT.Viewport className="fixed bottom-0 right-0 z-[100] m-4 flex w-[min(92vw,380px)] list-none flex-col gap-2 p-0 outline-none" />
      </RT.Provider>
    </ToastCtx.Provider>
  )
}
