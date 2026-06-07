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
  /** unlocked tentatively (booted offline) — auth not yet confirmed with the Worker */
  unverified: boolean
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
  // True when we let the user in without confirming the passphrase (booted offline).
  // A stale/invalid key then stays "in" with failing requests — so we re-verify when
  // connectivity returns and route to the gate if it turns out to be wrong.
  const [unverified, setUnverified] = useState(false)

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
        if (!cancelled) {
          setUnlocked(true)
          setUnverified(false)
        }
      } catch (e) {
        if (e instanceof api.ApiError && e.status === 401) {
          api.clearKey()
          if (!cancelled) setUnlocked(false)
        } else if (!cancelled) {
          // network/other error — don't lock the user out over a transient failure,
          // but remember the auth is unconfirmed so we can re-check later.
          setUnlocked(true)
          setUnverified(true)
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

  // While unverified, re-check auth as soon as we can reach the Worker (on the
  // online event, on foreground, and once immediately). A confirmed key clears the
  // flag; a 401 finally routes to the gate instead of silently failing forever.
  useEffect(() => {
    if (!unverified) return
    let cancelled = false
    const reverify = async () => {
      if (document.visibilityState === 'hidden') return
      if (!api.isConfigured() || !api.getKey()) return
      try {
        await api.getMeta()
        if (!cancelled) {
          setUnlocked(true)
          setUnverified(false)
        }
      } catch (e) {
        if (e instanceof api.ApiError && e.status === 401 && !cancelled) {
          api.clearKey()
          setUnlocked(false)
          setUnverified(false)
        }
        // otherwise still unreachable — keep the flag and retry on the next event
      }
    }
    reverify()
    window.addEventListener('online', reverify)
    document.addEventListener('visibilitychange', reverify)
    return () => {
      cancelled = true
      window.removeEventListener('online', reverify)
      document.removeEventListener('visibilitychange', reverify)
    }
  }, [unverified])

  const unlock = async (passphrase: string) => {
    const trimmed = passphrase.trim()
    if (!trimmed) throw new Error('合言葉を入力してください')
    api.setKey(trimmed)
    try {
      await api.getMeta()
      setUnlocked(true)
      setUnverified(false)
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
      value={{ ready, configured, workerUrl, unlocked, unverified, unlock, signOut, saveWorkerUrl }}
    >
      {children}
    </AuthCtx.Provider>
  )
}
