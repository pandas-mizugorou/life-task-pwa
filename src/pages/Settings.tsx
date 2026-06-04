import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExternalLink, Link2, Lock, ShieldCheck, Tags } from 'lucide-react'
import { Card, CardTitle } from '../components/ui/Card'
import { Input, Label } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Switch } from '../components/ui/Switch'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../context/AuthContext'
import { useBoard } from '../context/BoardContext'

export function Settings({ firstRun = false }: { firstRun?: boolean }) {
  const { workerUrl, saveWorkerUrl, signOut } = useAuth()
  const toast = useToast()
  const [url, setUrl] = useState(workerUrl)

  const save = () => {
    if (!url.trim()) return
    saveWorkerUrl(url)
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
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-sub">
          <li>
            操作は<span className="font-semibold text-ink">実際の GitHub に即反映</span>されます（ローカルにコピーは持ちません）。
          </li>
          <li>
            <span className="font-semibold text-ink">削除はありません</span>。「完了にする」＝Issue をクローズ、「ボードから外す」＝ボードから取り除くだけ（Issue は残る）。完全削除は github.com で行います。
          </li>
          <li>
            完了したタスクは既定で非表示です。上の<span className="font-semibold text-ink">「完了したタスクも表示」</span>を ON にすると Done 列に出ます。
          </li>
          <li>
            他の端末・PC で変更したら、右上の<span className="font-semibold text-ink">更新ボタン</span>か開き直しで同期します（リアルタイム通知ではありません）。
          </li>
          <li>
            操作対象は <span className="font-semibold text-ink">life リポジトリ + Project #1</span> のみです。
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

function ShowClosedToggle() {
  const board = useBoard()
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-ink">完了したタスクも表示</div>
          <div className="mt-0.5 text-xs leading-relaxed text-sub">
            ON にすると、クローズ済みのタスクが「Done」列に表示されます（件数が多い場合があります）。
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
