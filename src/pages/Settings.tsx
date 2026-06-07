import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ExternalLink, Link2, Lock, ShieldCheck, Tags } from 'lucide-react'
import { Card, CardTitle } from '../components/ui/Card'
import { Input, Label } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Switch } from '../components/ui/Switch'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../context/AuthContext'
import { useBoard } from '../context/BoardContext'
import * as api from '../lib/api'

export function Settings({ firstRun = false }: { firstRun?: boolean }) {
  const { workerUrl, saveWorkerUrl, signOut } = useAuth()
  const toast = useToast()
  const [url, setUrl] = useState(workerUrl)

  const save = () => {
    const res = api.normalizeWorkerUrl(url)
    if ('error' in res) {
      toast({ variant: 'error', title: res.error })
      return
    }
    setUrl(res.url) // reflect the cleaned URL back into the field
    saveWorkerUrl(res.url)
    toast({ variant: 'success', title: '接続先を保存しました' })
  }

  if (firstRun) {
    return (
      <div className="mx-auto flex min-h-[100dvh] max-w-md items-center px-4">
        <div className="w-full">
          <div className="mb-6 text-center">
            <span className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl bg-grad text-heroink shadow-lg">
              <Link2 className="h-8 w-8" />
            </span>
            <h1 className="text-2xl font-black text-ink">初期設定</h1>
            <p className="mt-1.5 text-sm text-sub">デプロイした Worker の URL を入力してください</p>
          </div>
          <Card>
            <Label htmlFor="wu">Worker URL</Label>
            <Input
              id="wu"
              inputMode="url"
              autoCapitalize="off"
              autoCorrect="off"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://life-task-api.xxx.workers.dev"
            />
            <p className="mt-2 text-xs leading-relaxed text-sub">
              デプロイした Cloudflare Worker の URL です（Cloudflare ダッシュボード →
              Workers で確認できます）。
            </p>
            <Button className="mt-4 w-full" onClick={save} disabled={!url.trim()}>
              保存して続ける
            </Button>
            <p className="mt-3 text-xs leading-relaxed text-sub">
              GitHub トークンはこの端末には保存されません。Worker 側の Secret に保管されます。
            </p>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto h-full max-w-2xl space-y-4 overflow-y-auto overscroll-y-contain px-4 pb-28 pt-4">
      <h1 className="text-lg font-black text-ink">設定</h1>

      <DriftWarning />
      <ShowClosedToggle />

      <Card>
        <CardTitle>
          <span className="inline-flex items-center gap-2">
            <Link2 className="h-4 w-4 text-accent" />
            接続先 Worker
          </span>
        </CardTitle>
        <Label htmlFor="wu">Worker URL</Label>
        <div className="flex gap-2">
          <Input
            id="wu"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://life-task-api.xxx.workers.dev"
          />
          <Button onClick={save} disabled={!url.trim()}>
            保存
          </Button>
        </div>
      </Card>

      <LabelsCard />

      <Card>
        <CardTitle>
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-accent2" />
            セキュリティ
          </span>
        </CardTitle>
        <p className="text-sm leading-relaxed text-sub">
          GitHub の Personal Access Token は Cloudflare Worker の Secret にのみ保管され、この端末・ブラウザには保存されません。操作は{' '}
          <b className="text-ink">pandas-mizugorou/life</b> リポジトリと Project #1 に限定されています。
        </p>
        <Button variant="danger" className="mt-3" onClick={signOut}>
          <Lock className="h-4 w-4" />
          ロックする（合言葉を再入力）
        </Button>
      </Card>

      <Card>
        <CardTitle>使い方・注意</CardTitle>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-sub">
          <li>
            このアプリの操作は、すべて<span className="font-semibold text-ink">本物の GitHub にすぐ反映</span>されます（アプリの中にコピーは持ちません）。
          </li>
          <li>
            <span className="font-semibold text-ink">「完了にする」</span>＝やり終えたとき。クローズして記録に残り、ボードから消えます（あとで見返せます）。
          </li>
          <li>
            <span className="font-semibold text-ink">「ボードから外す」</span>＝「やらない」と決めたとき。完了にはせず、ボードから消すだけです（タスク自体は GitHub に残ります）。
          </li>
          <li>
            タスクを<span className="font-semibold text-ink">完全に削除する機能はありません</span>（GitHub の仕様）。どうしても消したいときは github.com で削除してください。
          </li>
          <li>
            PC など別の場所で変更したときは、<span className="font-semibold text-ink">右上の更新ボタン</span>を押すか、アプリを開き直すと最新になります（自動では即時に反映されません）。
          </li>
          <li>
            このアプリが操作するのは <span className="font-semibold text-ink">life リポジトリの Project #1 だけ</span>です。
          </li>
        </ul>
      </Card>

      <a
        href="https://github.com/pandas-mizugorou/life"
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-center gap-2 text-sm text-sub transition hover:text-ink"
      >
        <ExternalLink className="h-4 w-4" />
        GitHub でリポジトリを開く
      </a>
      <p className="pt-1 text-center text-xs text-sub">Lifeタスク · GitHub Issues + Projects</p>
    </div>
  )
}

/** Warns if the live GitHub board's Status field/options drifted from the Worker's
 *  hardcoded ids (so a future status change can't silently land in the wrong column). */
function DriftWarning() {
  const [drift, setDrift] = useState<string[]>([])
  const [checkFailed, setCheckFailed] = useState(false)
  useEffect(() => {
    let alive = true
    api
      .getMeta()
      .then((m) => {
        if (alive) {
          setDrift(m.drift ?? [])
          setCheckFailed(false)
        }
      })
      .catch(() => {
        // Don't swallow silently: a failed check means the drift safety net didn't run.
        if (alive) setCheckFailed(true)
      })
    return () => {
      alive = false
    }
  }, [])
  if (drift.length === 0) {
    if (!checkFailed) return null
    return (
      <p className="px-1 text-center text-xs text-sub">
        ボード設定の整合性を確認できませんでした（通信状況をご確認ください）。
      </p>
    )
  }
  return (
    <Card className="border-warn/50 bg-warn/5">
      <CardTitle>
        <span className="inline-flex items-center gap-2 text-warn">
          <AlertTriangle className="h-4 w-4" />
          ボード設定の不一致を検出
        </span>
      </CardTitle>
      <p className="text-sm leading-relaxed text-sub">
        GitHub のボード（ステータス）の設定が、アプリ内部の想定と一致していません。ステータスの変更が正しく反映されないことがあります。github.com 側でステータスを作り直した場合は、設定の更新が必要です。
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm font-medium text-warn">
        {drift.map((d) => (
          <li key={d}>{d}</li>
        ))}
      </ul>
    </Card>
  )
}

function ShowClosedToggle() {
  const board = useBoard()
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-ink">完了したタスクも表示</div>
          <div className="mt-0.5 text-xs leading-relaxed text-sub">
            ON にすると、完了（クローズ）したタスクが末尾の「完了済み」列に表示されます（件数が多い場合があります）。
          </div>
        </div>
        <Switch
          checked={board.showClosed}
          onCheckedChange={board.setShowClosed}
          aria-label="完了したタスクも表示"
        />
      </div>
    </Card>
  )
}

function LabelsCard() {
  const navigate = useNavigate()
  return (
    <Card>
      <CardTitle>
        <span className="inline-flex items-center gap-2">
          <Tags className="h-4 w-4 text-accent" />
          ラベル
        </span>
      </CardTitle>
      <p className="text-sm leading-relaxed text-sub">
        タスクに付けるラベルの追加・名称変更・色変更・削除ができます（GitHub の life リポジトリに反映）。
      </p>
      <Button variant="secondary" className="mt-3" onClick={() => navigate('/labels')}>
        <Tags className="h-4 w-4" />
        ラベルを編集
      </Button>
    </Card>
  )
}
