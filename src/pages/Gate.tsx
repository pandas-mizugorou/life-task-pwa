import { useState } from 'react'
import { Check, KeyRound } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input, Label } from '../components/ui/Input'
import { Spinner } from '../components/ui/Spinner'
import { useAuth } from '../context/AuthContext'
import { errMsg } from '../lib/haptics'

export function Gate() {
  const { unlock } = useAuth()
  const [pass, setPass] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pass.trim() || busy) return
    setBusy(true)
    setErr(null)
    try {
      await unlock(pass)
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md items-center px-4">
      <div className="w-full">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl bg-grad text-heroink shadow-lg shadow-accent/25">
            <KeyRound className="h-8 w-8" />
          </span>
          <h1 className="text-2xl font-black text-ink">Lifeタスク</h1>
          <p className="mt-1.5 text-sm text-sub">合言葉を入力してロックを解除</p>
        </div>
        <Card>
          <form onSubmit={submit}>
            <Label htmlFor="pass">合言葉</Label>
            <Input
              id="pass"
              type="password"
              autoComplete="current-password"
              autoFocus
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="合言葉"
            />
            {err && <p className="mt-2 text-sm text-bad">{err}</p>}
            <Button type="submit" className="mt-4 w-full" disabled={busy || !pass.trim()}>
              {busy ? <Spinner className="h-5 w-5" /> : 'ロックを解除'}
            </Button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs leading-relaxed text-sub">
              <Check className="h-3.5 w-3.5 text-accent2" />
              GitHub トークンは端末に保存されません
            </p>
          </form>
        </Card>
      </div>
    </div>
  )
}
