# Lifeタスク — スマホから使う GitHub タスク管理 PWA

`pandas-mizugorou/life`（private）の **Issues + Projects v2（Project #1）** を、iPhone から**ボード（カンバン）レイアウトで**快適に管理するための個人用 PWA。公式 GitHub モバイルアプリがサポートしない「スマホでのボード運用」を実現する（ワンタップ／ドラッグでの Status 移動・クイック追加・コメント）。

## 開発目的（なぜ作ったか）

**スマホから「ボード（カンバン）レイアウト」で GitHub のタスクを管理できるようにする。** これがこのアプリを作った唯一にして最大の理由。

タスクは GitHub の **Issues + Projects v2（カンバンボード）** で管理している。しかし **公式の GitHub モバイルアプリは、Projects のダッシュボードのボード（カンバン）レイアウトをサポートしていない。** Issue の一覧やひとつひとつの表示はできても、

- ボードの列（Backlog / Todo / In Progress / Pending）を**スマホで一望し**、
- カードを**ドラッグして Status を動かす**、

という「ボードでのタスク管理」がスマホからは事実上できなかった。PC を開けばできるのに、移動中や外出先のスマホでは同じ運用ができない——これが不便の核心だった。

そこで、**PC のプロジェクトダッシュボードと同じボード運用をスマホで再現する**専用クライアントを自作した。狙いは次の一点に尽きる：

> **「公式アプリに無い “モバイルでのボード運用” という穴を埋める」**

具体的には、

- スマホで**列ごとのカンバンを横スクロールで見渡せる**
- カードを**長押し→ドラッグで Status を移動**／列内で並べ替え
- **ワンタップで追加・編集・コメント・完了**まで、画面遷移を最小にして指だけで完結

データの実体はこのアプリ側に持たず、**GitHub の Issues / Projects v2 が唯一の正**（本アプリは薄い操作クライアント）。だから「PC で見ても、公式アプリで見ても、このアプリで見ても、つねに同じ状態」になる。GitHub のタスク管理はそのままに、**スマホからのボード運用だけを足す**ことが目的。

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

完了（クローズ）したタスクは既定でボード非表示。**設定の「完了したタスクも表示」を ON** にすると、右端の「完了済み」列に表示される。

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

### 5. 画像ペースト機能を有効化（任意・R2 が必要）
コメント欄・本文編集欄に**画像を貼り付け／ドロップ**すると、Cloudflare R2 に保存して `![](URL)` として本文に挿入する。使わないなら未設定のままで OK（`/api/upload` が 501 を返すだけで、他機能は無影響）。

1. **R2 を有効化**（初回のみ）: Cloudflare ダッシュボード → R2 で有効化（クレジットカード登録が必要。個人利用なら無料枠内で実質 0 円）。
2. **バケットを作成**:
   ```bash
   wrangler r2 bucket create life-task-images --config worker/wrangler.toml
   ```
3. **公開 URL を取得**: ダッシュボード → R2 → `life-task-images` → Settings → **Public Development URL** を Allow Access。表示される `https://pub-<hash>.r2.dev` を控える（独自ドメインがあれば Custom Domains でも可）。
4. **`worker/wrangler.toml` の `IMAGES_BASE_URL`** を上記 URL（末尾スラッシュなし）に書き換え、Worker を再デプロイ:
   ```bash
   npm run deploy:worker
   ```

対応形式は png / jpeg / gif / webp、1 枚 8MB まで。画像は R2 に永続保存され、GitHub には Markdown の URL だけが載る。

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
| GET | `/api/health` | 死活監視（**認証不要**・GitHub に触れない・`{ok:true}` を返すだけ） |
| GET | `/api/meta` | 合言葉検証 / Status・ラベル ID 確認 |
| GET | `/api/board` | 盤面全件（`?include=closed` で完了も） |
| GET | `/api/tasks/:n` | 詳細 + コメント |
| POST | `/api/tasks` | クイック追加 |
| PATCH | `/api/tasks/:n/status` | Status 変更 |
| PATCH | `/api/tasks/:n` | タイトル/本文/クローズ・再開 |
| POST | `/api/tasks/:n/comments` | コメント追加 |
| POST | `/api/upload` | 画像を R2 に保存し公開 URL を返す（要 R2 設定。未設定時 501） |
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
- **リクエストサイズ上限**: JSON リクエストは 64KB 超を 413 で拒否。画像アップロード（`/api/upload`）のみ別枠で 8MB まで許可し、MIME を画像 4 形式（png/jpeg/gif/webp）に限定（SVG 等は不可）。

## トークン / 合言葉のローテーション

- **PAT**: GitHub で再生成 → `wrangler secret put GITHUB_PAT --config worker/wrangler.toml`（再デプロイ不要）。
- **合言葉**: `wrangler secret put APP_PASSPHRASE --config worker/wrangler.toml` → スマホで再入力。

## 注意

- `worker/.dev.vars`（実 PAT）は **絶対にコミットしない**（`.gitignore` 済み）。
- ボードの Status 選択肢を作り直した場合のみ、`worker/src/github.ts` の `STATUS_OPTIONS` を `/api/meta` の出力で確認・更新する（リネームだけなら不要）。
- アイコン（`npm run icons` で再生成）を差し替えても、iPhone はホーム画面の PWA アイコンを強くキャッシュする。新アイコンを反映するには **PWA を一度削除 → ホーム画面に再追加** する必要がある（再読み込みだけでは変わらない）。
