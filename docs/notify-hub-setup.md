# notify-hub (N-13) セットアップ手順

iPhone Web Push 通知ハブ。PC のあらゆる自動化から1行で iPhone へ通知を送る標準経路。
**コードは実装・テスト済み。以下のデプロイ手順と実機確認は未実施**（要ユーザー操作）。

設計書: `G:\マイドライブ\メモ\AI活用設計\2026-07-18_N-13_notify-hub_設計書.md`

## この PR で入ったもの（デプロイ不要で完成している部分）
- Worker: `POST /api/push/send`（`X-Notify-Key` 認証・アプリ合言葉とは別ゲート）／`POST /api/push/subscribe`・`/api/push/unsubscribe`・`GET /api/push/vapid-public-key`（`X-App-Key` 認証）。失効購読(410/404)は送信時に自動削除。
- 送信ライブラリ: `@block65/webcrypto-web-push`（family-assets keepalive と同一）。
- PWA: 設定画面のトグル「PC自動化の通知」→ `PushManager.subscribe` → Worker 登録。Service Worker に push/notificationclick ハンドラ（`public/push-sw.js` を Workbox に importScripts）。
- PC ブリッジ: `~/.claude/scheduled-scripts/Notify-Phone.ps1`（純ASCII・失敗しても exit 0）。
- テスト: `worker/src/push.test.ts` ＋ `/api/push/send` の 401/別ゲート確認（`npm test` 全緑）。

## デプロイ手順（未実施・ユーザー操作）

### 1. KV 名前空間を作る
```
cd C:\dev\personal\life-task-pwa
wrangler kv namespace create PUSH_SUBS --config worker/wrangler.toml
```
出力された `id` を `worker/wrangler.toml` の `[[kv_namespaces]] id = "REPLACE_WITH_KV_ID"` に貼る。

### 2. VAPID 鍵を新規生成（family-assets の鍵は流用しない）
```
npx web-push generate-vapid-keys
```
Public/Private が出る。`worker/wrangler.toml` の `VAPID_SUBJECT` を自分の `mailto:` に書き換える。

### 3. Secrets を登録
```
wrangler secret put NOTIFY_KEY        --config worker/wrangler.toml   # 任意の長いランダム文字列
wrangler secret put VAPID_PUBLIC_KEY  --config worker/wrangler.toml
wrangler secret put VAPID_PRIVATE_KEY --config worker/wrangler.toml
```

### 4. デプロイ
```
npm run deploy:worker
npm run deploy:pages
```

### 5. PC 側の secret ファイルを作る（純手動・git/Vault に置かない）
`%USERPROFILE%\.secrets\notify-hub.json`:
```json
{ "endpoint": "https://life-task-api.<sub>.workers.dev/api/push/send", "key": "<NOTIFY_KEY と同じ値>" }
```
INDEX §4-9 に従い `~\.claude\settings.json` の `permissions.deny` に
`Read(C:\Users\ookawa\.secrets\**)` を追加（ユーザー承認・最小差分・変更前バックアップ）。

### 6. iPhone 実機で確認（受入1・2）
1. life-task-pwa を**ホーム画面に追加**した状態で開く（iOS の Web Push はインストール必須）。
2. 設定 → 「PC自動化の通知」をオン → 通知を許可。
3. PC で送信テスト:
```
powershell -NoProfile -File C:\Users\ookawa\.claude\scheduled-scripts\Notify-Phone.ps1 -Title "test" -Body "hello from PC"
```
4. iPhone に届き、タップで PWA が開けば OK。トグルをオフ→再送で KV から購読が消えること（受入2）。

## Phase 4（後日・②環境改善 Phase 3 完了済みだが Run-Skill 改修と競合注意）
Run-Skill.ps1 の失敗経路（gh issue 起票直後）に `Notify-Phone.ps1` 呼び出しを**独立関数＋1呼び出し**で追記。
②P3-01 の改修と近接するためコンフリクト最小化。追記後に手動で失敗ジョブを走らせて Push 到達を確認（受入5）。

## 通知規約（INDEX §4-7・利用側が守る）
- 失敗＝即時Push（Run-Skill 共通経路）／成功＝原則Pushしない（週次サマリ=N-01 に集約）。
- 即時成功通知は「ユーザーが待っている成果」（例: N-08 バッチ完走）のみ。
- 本文にパス・数値詳細・秘密を入れない（タイトル＋結果概要＋リンクで、詳細はリンク先で見る）。
