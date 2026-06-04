import { createContext, useContext, useEffect, useState } from 'react'
import * as api from '../lib/api'

interface AuthValue {
  /** initial check finished */
  ready: boolean
  /** a Worker URL is configured */
  configured: boolean
  workerUrl: string
  /** a valid passphrase is stored */
  unlocked: boolean
  unlock: (passphrase: string) => Promise<void>
  signOut: () => void
  saveWorkerUrl: (u: string) => void
}

const AuthCtx = createContext<AuthValue | null>(null)

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthValue {
  const v = useContext(AuthCtx)
  if (!v) throw new Error('useAuth must be used within AuthProvider')
  return v
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const [configured, setConfigured] = useState(api.isConfigured())
  const [workerUrl, setWorkerUrl] = useState(api.getWorkerUrl())
  const [unlocked, setUnlocked] = useState(false)

  // On boot, validate any stored passphrase against the Worker.
  useEffect(() => {
    let cancelled = false
    async function boot() {
      if (!api.isConfigured() || !api.getKey()) {
        if (!cancelled) setReady(true)
        return
      }
      try {
        await api.getMeta()
        if (!cancelled) setUnlocked(true)
      } catch (e) {
        if (e instanceof api.ApiError && e.status === 401) {
          api.clearKey()
          if (!cancelled) setUnlocked(false)
        } else if (!cancelled) {
          // network/other error — don't lock the user out over a transient failure
          setUnlocked(true)
        }
      } finally {
        if (!cancelled) setReady(true)
      }
    }
    boot()
    return () => {
      cancelled = true
    }
  }, [])

  const unlock = async (passphrase: string) => {
    const trimmed = passphrase.trim()
    if (!trimmed) throw new Error('合言葉を入力してください')
    api.setKey(trimmed)
    try {
      await api.getMeta()
      setUnlocked(true)
    } catch (e) {
      api.clearKey()
      setUnlocked(false)
      if (e instanceof api.ApiError && e.status === 401) throw new Error('合言葉が違います')
      throw e
    }
  }

  const signOut = () => {
    api.clearKey()
    setUnlocked(false)
  }

  const saveWorkerUrl = (u: string) => {
    api.setWorkerUrl(u)
    setWorkerUrl(api.getWorkerUrl())
    setConfigured(api.isConfigured())
  }

  return (
    <AuthCtx.Provider
      value={{ ready, configured, workerUrl, unlocked, unlock, signOut, saveWorkerUrl }}
    >
      {children}
    </AuthCtx.Provider>
  )
}
