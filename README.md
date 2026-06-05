# Lifeタスク — スマホから使う GitHub タスク管理 PWA

`pandas-mizugorou/life`（private）の **Issues + Projects v2（Project #1）** を、iPhone から快適に管理するための個人用 PWA。公式 GitHub アプリの代わりに、ワンタップの Status 移動・クイック追加・コメントを行う。

## 構成

```
[iPhone PWA (Cloudflare Pages)]
        │  X-App-Key: 合言葉
        ▼
[Cloudflare Worker: life-task-api]  ← GitHub PAT は Secret に保管（端末には置かない）
        │  Authorization: Bearer <PAT>
        ▼
[GitHub API]  REST=Issues/コメント, GraphQL=Projects v2（ボード）
```

- **PWA**: React 19 + Vite + Tailwind v4 + vite-plugin-pwa。GitHub 資格情報は一切持たず、合言葉（`X-App-Key`）だけを送る。
- **Worker**: GitHub PAT を Secret 保管。`owner/repo/project` をハードコードし、`pandas-mizugorou/life` と Project #1 以外を操作できないようガード。合言葉が漏れても被害はこの 1 リポジトリに限定（さらに合言葉の連続失敗は IP 単位でレート制限）。
- Projects v2 はユーザー所有のため、まずは **Classic PAT（`repo` + `project`）** で動かす。権限の絞り込みは後述の「セキュリティを高める」を参照。「削除」は GitHub 仕様上 Issue を物理削除できないため「クローズ」になる。

## 使い方・操作の注意

このアプリは GitHub のコピーを持たず、**実際の Issues / Project #1 ボードを直接操作**する（裏で GitHub API を呼ぶ）。操作はすべて本物に即反映される。

| アプリの操作 | GitHub 側で起きること |
|---|---|
| タスク追加 | `life` に新しい Issue を作成 → ボードに追加 → Status 設定（ラベルは Issue に付与） |
| ステータス変更 | Project #1 の Status 列を移動（Issue の open/closed とは別物） |
| コメント / 編集 | その Issue にコメント追加 / タイトル・本文を更新 |
| 完了にする | Issue を Close（ボードからは消える＝未完了のみ表示のため） |
| 再開する | Issue を再 Open |

完了（クローズ）したタスクは既定でボード非表示。**設定の「完了したタスクも表示」を ON** にすると Done 列に表示される。

### 「完了にする」と「ボードから外す」の違い
- **完了にする**（メイン操作）… やり終えたとき。Issue を Close して完了として記録（ボードから消える。履歴は GitHub に残り後から見返せる）。
- **ボードから外す**（控えめなサブ操作）… やらないことにした／ここで管理しないとき。完了にはせず、ボードのカードだけ消す（Issue 自体はリポジトリに残り、あとで戻せる）。

GitHub には Issue の完全削除 API が無いため、アプリからは物理削除しない（必要なら github.com で削除）。日常はほぼ「完了にする」で OK。

### 同期について
github.com 側（PC 等）で変更した場合、アプリを**開き直す / 前面に戻す / 右上の更新ボタン**で最新を読み直す（リアルタイム通知ではない）。常に GitHub が唯一の正。

## セットアップ

### 0. 依存インストール & アイコン生成
```bash
npm install
npm run icons
```

### 1. GitHub Classic PAT を作成
https://github.com/settings/tokens (classic) で **scopes: `repo`, `project`** のトークンを発行。

### 2. Worker をデプロイ
```bash
npm run deploy:worker
wrangler secret put GITHUB_PAT     --config worker/wrangler.toml   # ↑のPATを貼る
wrangler secret put APP_PASSPHRASE --config worker/wrangler.toml   # 任意の長い合言葉
```
出力された `https://life-task-api.<subdomain>.workers.dev` を控える。

### 3. PWA をビルド & デプロイ
```bash
cp .env.example .env.local       # VITE_WORKER_URL を↑のWorker URLに
npm run deploy:pages
```
出力された `https://life-task-pwa.pages.dev` をスマホで開き、ホーム画面に追加。

### 4. CORS を設定（重要）
Worker は **fail-close**（`ALLOWED_ORIGIN` 未設定や許可外 Origin にはブラウザ用 CORS ヘッダを返さない）。`worker/wrangler.toml` の `ALLOWED_ORIGIN` を本番 Pages URL にして再デプロイ：
```bash
npm run deploy:worker
```

## ローカル開発

```bash
cp worker/.dev.vars.example worker/.dev.vars   # GITHUB_PAT / APP_PASSPHRASE を記入
npm run dev:worker      # → http://127.0.0.1:8787
# 別ターミナル
npm run dev             # → http://localhost:5173 （初回に Worker URL に 127.0.0.1:8787 を入力）
```

テスト / CI:
```bash
npm test                # Worker の純粋ロジックの Vitest（normalizeColor / isStatus / ルート正規表現 等）
```
push / PR では GitHub Actions（`.github/workflows/ci.yml`）が lint・build・worker 型チェック・test を実行する。

## エンドポイント（Worker）

| Method | Path | 用途 |
|---|---|---|
| GET | `/api/meta` | 合言葉検証 / Status・ラベル ID 確認 |
| GET | `/api/board` | 盤面全件（`?include=closed` で完了も） |
| GET | `/api/tasks/:n` | 詳細 + コメント |
| POST | `/api/tasks` | クイック追加 |
| PATCH | `/api/tasks/:n/status` | Status 変更 |
| PATCH | `/api/tasks/:n` | タイトル/本文/クローズ・再開 |
| POST | `/api/tasks/:n/comments` | コメント追加 |
| DELETE | `/api/tasks/:n/item` | ボードから外す（Issue は残す） |

## セキュリティを高める（任意）

単独ユーザーの個人運用では現状でも実用十分だが、さらに守りを固めるなら：

### PAT の権限を絞る（被害範囲の縮小）
Classic PAT の `repo` は「所有する全 private リポジトリ」へのフルアクセスを含むため、万一漏れたときの影響が広い。`life` だけに絞るには：

- **Fine-grained PAT**（推奨候補）: GitHub は user 所有 Projects v2 への fine-grained PAT 対応を提供している。対象リポジトリを `life` のみにし、権限を **Issues: Read and write** ＋ **Projects: Read and write** ＋ **Metadata: Read** に絞って発行する。切替後は必ずアプリでステータス変更・追加・並べ替え（GraphQL ミューテーション）が通るか実機確認すること（環境により Projects 操作の可否が異なるため）。
- **専用マシンユーザー**: `life` だけを所有する別 GitHub アカウントを作り、そのアカウントの Classic PAT を使う。`repo` スコープでも個人の他リポジトリには届かない。

どちらもコード変更は不要（Worker はトークン種別を問わない）。`wrangler secret put GITHUB_PAT --config worker/wrangler.toml` で差し替えるだけ。PAT には有効期限を付け、定期的にローテーションする。

### すでに有効な防御
- **合言葉のレート制限**: 認証失敗を IP 単位で制限（20 回 / 60 秒 → 429）。`worker/wrangler.toml` の `[[unsafe.bindings]]`（Cloudflare Rate Limiting）。再デプロイで有効化。
- **CORS fail-close**: 許可 Origin 以外にはブラウザ用 CORS ヘッダを返さない。
- **エラーの秘匿**: GitHub 由来の詳細はサーバ側ログ（Workers Logs / `[observability]`）のみに記録し、クライアントには汎用メッセージを返す。
- **リクエストサイズ上限**: 64KB を超える本文は 413 で拒否。

## トークン / 合言葉のローテーション

- **PAT**: GitHub で再生成 → `wrangler secret put GITHUB_PAT --config worker/wrangler.toml`（再デプロイ不要）。
- **合言葉**: `wrangler secret put APP_PASSPHRASE --config worker/wrangler.toml` → スマホで再入力。

## 注意

- `worker/.dev.vars`（実 PAT）は **絶対にコミットしない**（`.gitignore` 済み）。
- ボードの Status 選択肢を作り直した場合のみ、`worker/src/github.ts` の `STATUS_OPTIONS` を `/api/meta` の出力で確認・更新する（リネームだけなら不要）。
