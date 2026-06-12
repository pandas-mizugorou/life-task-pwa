# life-task-pwa 機能拡張の調査 — 2026-06（結論: 現状維持が最適）

> `docs/ROADMAP.md` と `docs/UX-AUDIT-2026-06-06.md` の消化後、「次に足す新機能」の候補を調査したが、
> **ユーザー判断（2026-06-12）: 提案候補はいずれも現時点で不要。現状の PWA で日常運用は完結している。**
>
> 本ドキュメントは「やることリスト」ではない。残す目的は2つ:
> 1. **判断の記録** — なぜ追加しないのかを将来の自分が再確認できるように
> 2. **裏取り済み技術事実の保存** — 将来「痛み」が出たとき、再調査ゼロで着手判断できるように（GitHub GraphQL スキーマのイントロスペクション実証・iOS PWA 制約の出典付き調査を §4-5 に保存）

---

## 1. 結論と判断記録

### 現状維持が最適である理由

- **運用はステータス駆動**（Backlog/Todo/In Progress/Pending/Done + ラベル6種）であり、**期日でタスクを管理していない**。期日（Due）フィールド・「今日」ビュー・リマインダー通知といった「期日ドリブン化」の提案束（旧 Tier 1）は、運用実態と前提が合わず却下。
- **規模が小さい**（open 18件 / 全117件）。検索・統計・サブタスク分解のような「量に効く」機能は痛みが存在しない。
- **起票・操作の導線に不満がない**。PWA のクイック追加で足りており、iOS ショートカット起票（アプリ改修ゼロ案）ですら不要と判断。
- **毎朝のデイリーノート自動生成（obsidian-daily-bootstrap の朝ルーチン）は廃止済み**。「ボード → 朝のノート」連携を価値の根拠にした提案（期日の波及・朝の集計通知など）は、今後も前提から無効。

### 今後の方針

**機能追加は「実際に痛みを感じてから」**。このドキュメントの §3 逆引き表から該当候補を引き、§4-5 の保存済み事実で設計する。痛みのないままの先回り実装はしない（このアプリが完成度を保ってきた理由でもある）。

---

## 2. 唯一、運用上いま意味がある事項: PAT 戦略（既存 [P2-A3] の更新）

機能ではなく運用の話だが、調査で判明したため記録する。

- fine-grained PAT は 2025-03 に GA したが（[changelog](https://github.blog/changelog/2025-03-18-fine-grained-pats-are-now-generally-available/)）、**ユーザー所有（個人）の Projects v2 への対応は依然確認できない**（[community #156512](https://github.com/orgs/community/discussions/156512)）。
- → ROADMAP の [P2-A3]「PAT の fine-grained 化」は**現時点では実行不能**。現実解は:
  1. **現状維持 + 定期ローテーション**（Classic `repo`+`project`）— 単独ユーザーなら妥当
  2. `life` だけを所有する**専用マシンユーザー**の Classic PAT — 構造的に blast-radius を縮小したくなったら

---

## 3. 将来の逆引き表（痛みを感じたらここから引く）

| 将来感じるかもしれない痛み | 候補 | 工数 | 保存済みの設計・事実 |
|---|---|---|---|
| 起票が面倒（会議中・移動中） | F1 ショートカット起票 | S未満（改修ゼロ） | §4-1: カスタムヘッダ+JSON POST のレシピ |
| 締切のある仕事が増えた | F2 期日フィールド | M | §5-1: Date スカラー実証済み。Status と相似形の実装パス |
| In Progress/Pending の放置に気づけない | F7 通知 | M | §5-2: Declarative Web Push（SW 不要）で大工事が消えた |
| 定型タスクの手動起票が増えた | F6 繰り返し起票 | M | §4-3: cron + `recurring.json`（定義は GitHub に置く） |
| closed が増えて遡れない | F4/F9 検索 | S / M | §5-3: Search API 30req/分・`advanced_search` パラメータ |
| 1 issue 内の分解を管理したい | F5 チェックリスト / F10a サブイシュー進捗 | M / S | §5-1: `subIssuesSummary` を実 PAT で動作確認済み |
| 完了の振り返りをしたくなった | F8 統計画面 | M | BOARD_QUERY に `closedAt` 1行追加で材料が揃う |

見送り確定（痛みが出ても採らない）: **share_target**（iOS Safari 非対応のまま。[WebKit bug 194593](https://bugs.webkit.org/show_bug.cgi?id=194593) / [caniuse](https://caniuse.com/mdn-html_manifest_share_target)）、**全操作のオフラインキュー**（iOS は Background Sync 非対応 + 競合解決が運用に見合わない）、**自然言語日付パース**（誤起票リスクが正確性方針に反する）、**Priority フィールド**（ラベルで代替可能）。

---

## 4. 機能候補カタログ（参考資料 — バックログではない）

各候補の要点のみ。実装パスの詳細な根拠は §5 の技術事実を参照。

### F1. iOS ショートカット起票（S未満・改修ゼロ）
「URLの内容を取得」アクションは POST + JSON ボディ + カスタムヘッダ対応（[Apple公式](https://support.apple.com/guide/shortcuts/request-your-first-api-apd58d46713f/ios)）。`X-App-Key` ヘッダ + `{"title": ..., "status": "Todo"}` を `POST /api/tasks` に送るだけで共有シート・Siri・時刻オートメーションに載る。合言葉がショートカット App 内に保存される点は [P3-A6] と同等のリスク受容。

### F2. 期日（Due）管理（M）
Projects v2 に Date フィールドを UI で追加 → `worker/src/github.ts` に `DUE_FIELD_ID` ハードコード + drift 検知拡張 → `worker/src/graphql.ts` の `fieldValueByName` を **alias で複数化**（`status:` / `due:`）→ `PATCH /api/tasks/:n/due` → `shared/types.ts` に `dueDate?: string` → カード期限バッジ + 詳細に `<input type="date">`（iOS ネイティブピッカー。ダークテーマは `color-scheme` 要実機確認）。

### F3. 「今日」ビュー（S〜M・F2前提）
期限切れ + 今日 + In Progress を1画面に。`src/pages/Today.tsx` + ナビ3タブ化。データは BoardContext キャッシュから派生（追加 API なし）。Things 3 の Today 思想（[比較](https://blog.rivva.app/p/todoist-vs-things-vs-ticktick)）。

### F4. タイトル検索（S）
`BoardContext.tsx` の `byStatus` memo にタイトル match を追加（ラベルフィルタと同じ仕組み）。BOARD_QUERY は意図的に body を載せていない（`github.ts` の `boardItemToTask` 参照）ため対象はタイトルのみ。`enterKeyHint="search"` + `isComposing` ガードを踏襲。

### F5. チェックリスト進捗（M）
`Markdown.tsx`（react-markdown + remark-gfm 導入済み）の checkbox を interactive 化し、body を書き換えて既存 `patchTask` で保存。カード進捗バッジは Worker 側で body を正規表現カウントして `{done, total}` だけ返す（BOARD_QUERY への body 追加が必要になるトレードオフあり）。進捗を直接返す公式 API は確認できず、body パースが現実解。

### F6. 繰り返しタスク（M）
定義は KV でなく **life リポジトリ内 `recurring.json`**（GitHub が唯一の真実を維持。Worker はステートレスのまま）。`wrangler.toml` に `[triggers] crons` + `scheduled` ハンドラ → Contents API で定義取得 → 既存 `createTask` 再利用。重複ガードは「同タイトル open issue の存在チェック」。Cron は無料プランで 3本/Worker まで（[CF Limits](https://developers.cloudflare.com/workers/platform/limits/)）。

### F7. 通知・リマインダー（M〜L → Declarative 化で M 寄り）
**iOS/iPadOS 18.4+ の [Declarative Web Push](https://webkit.org/blog/16535/meet-declarative-web-push/) は service worker 不要**（`window.pushManager`、ペイロード JSON `{web_push: 8030, notification: {...}, app_badge}` を OS が直接表示）→ 懸念だった vite-plugin-pwa の generateSW→injectManifest 移行が**不要**。必要なのは: KV（購読保存 = ステートレス原則の唯一の例外）+ cron（F6 と共有）+ Workers 対応 push ライブラリ（[PushForge](https://github.com/draphy/pushforge) 等。Node の web-push は不可）。実機での着率・購読失効の観察期間を設けてから本採用判定。F12 アイコンバッジは `app_badge` フィールドで同時実現（追加コストほぼゼロ）。

### F8. 統計・レビュー画面（M）
BOARD_QUERY に `closedAt` 1行追加 + `Task.closedAt?` → showClosed データをクライアント集計。`src/pages/Stats.tsx`、チャートは依存追加せず軽量 SVG 自作。**注意**: Linear 移行（2026-06-04 に72件一括クローズ）で `closedAt` が移行日に集中 → 移行日以前は除外するか本文フッター「完了 YYYY-MM-DD」を優先（weekly-tasks-summary と同じ補正）。

### F9. 全文検索（M）
Worker に `GET /api/search?q=` → `/search/issues`（`repo:` 固定）。専用レート制限 30req/分（[GitHub Docs](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)）→ debounce 必須。2025-03 から `advanced_search=true` で AND/OR・ネスト対応（[changelog](https://github.blog/changelog/2025-03-06-github-issues-projects-api-support-for-issues-advanced-search-and-more/)）。

### F10. サブイシュー（a: 進捗バッジ S / b: 親子管理 UI L）
a: GraphQL `Issue.subIssuesSummary { total completed percentCompleted }` を **life リポジトリ + 現行 Classic PAT で動作確認済み**（2026-06-12 イントロスペクション + 実クエリ）。BOARD_QUERY に1フィールド。
b: REST は GA 済み（`GET/POST /repos/{o}/{r}/issues/{n}/sub_issues`、サブイシューは親の Project を既定継承。[Docs](https://docs.github.com/en/rest/issues/sub-issues) / [2025-09 changelog](https://github.blog/changelog/2025-09-11-a-rest-api-for-github-projects-sub-issues-improvements-and-more/)）。スマホ UI の情報設計が重く、a で様子見が合理的。

### F11. オフライン起票キュー（M）
iOS Safari は Background Sync 非対応 → SW 不可。`src/lib/api.ts` 手前で**起票のみ** localStorage に積み `online`/`visibilitychange` で replay。並べ替え・status 変更のキューはやらない（競合解決が見合わない）。

---

## 5. 裏取り済み技術事実（保存版 — 再調査を不要にする）

### 5-1. GitHub API（GraphQL スキーマ実証: 2026-06-12、`gh api graphql` イントロスペクション）

| 事実 | 根拠 |
|---|---|
| `ProjectV2FieldValue` 入力型 = `{ text: String, number: Float, date: Date, singleSelectOptionId: String, iterationId: String }`。**Date フィールドは `value: { date: "YYYY-MM-DD" }` で設定可能** | イントロスペクション実証 |
| クリアは `clearProjectV2ItemFieldValue`（text/number/date/single-select/iteration 対応） | [GitHub Docs Mutations](https://docs.github.com/en/graphql/reference/mutations) / [octokit/graphql-schema#628](https://github.com/octokit/graphql-schema/pull/628) |
| `createProjectV2Field` の `dataType` enum に `DATE` あり（API からフィールド作成可。ただし一度きりなので UI 手動作成を推奨） | イントロスペクション実証 |
| `Issue.subIssuesSummary { total, completed, percentCompleted }` が存在し、life リポジトリ + 現行 Classic PAT で動作 | 実クエリで確認 |
| 同一 item で複数の `fieldValueByName` を取るには GraphQL alias が必要（現コードは `Status` 1個のみ: `worker/src/graphql.ts` の3クエリ） | コード実読 + GraphQL 仕様 |
| fine-grained PAT は**個人所有 Projects v2 に非対応のまま**（組織所有のみ Projects permission あり） | [community #156512](https://github.com/orgs/community/discussions/156512) |
| Search API は専用レート制限 30req/分。`advanced_search=true` で AND/OR・ネスト（GraphQL は `type: ISSUE_ADVANCED`）。advanced では複数 repo/org/user フィルタ間のスペースが OR→**AND** に変わる | [Rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api) / [2025-03 changelog](https://github.blog/changelog/2025-03-06-github-issues-projects-api-support-for-issues-advanced-search-and-more/) |
| task list（`- [ ]`）の進捗を直接返す API は確認できず。body パースが現実解 | 調査時点で該当 API なし |

### 5-2. iOS PWA 制約（2026-06 時点）

| 事実 | 根拠 |
|---|---|
| 従来型 Web Push: iOS 16.4+ で**ホーム画面追加 PWA のみ**。SW の push ハンドラ必須 | [OneSignal docs](https://documentation.onesignal.com/docs/en/web-push-for-ios) ほか |
| **Declarative Web Push（iOS/iPadOS 18.4+）: SW 不要**。`window.pushManager`。ペイロード JSON を OS が直接表示、`app_badge` でバッジ同時更新、旧ブラウザへの後方互換も仕様内 | [WebKit blog](https://webkit.org/blog/16535/meet-declarative-web-push/) / [WWDC25](https://developer.apple.com/videos/play/wwdc2025/235/) |
| Badging API: iOS 16.4+ ホーム画面 Web アプリ、**通知許諾が前提** | [WebKit blog](https://webkit.org/blog/14112/badging-for-home-screen-web-apps/) / [MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Display_badge_on_app_icon) |
| `share_target`: iOS Safari 非対応のまま（WebKit 未実装） | [bug 194593](https://bugs.webkit.org/show_bug.cgi?id=194593) / [caniuse](https://caniuse.com/mdn-html_manifest_share_target) |
| ショートカット「URLの内容を取得」: POST/PUT/PATCH + JSON ボディ + カスタムヘッダ可。共有シート・Siri・時刻オートメーションに組み込み可 | [Apple公式](https://support.apple.com/guide/shortcuts/request-your-first-api-apd58d46713f/ios) / [解説](https://blog.alexwendland.com/2020-07-01-custom-json-payload-for-get-contents-of-url-in-ios-shortcuts/) |
| Background Sync / Periodic Background Sync: iOS Safari 非対応 | [MagicBell PWA guide](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide) |

### 5-3. 実装基盤（Cloudflare / vite-plugin-pwa）

| 事実 | 根拠 |
|---|---|
| カスタム SW（push ハンドラ等）は `generateSW` 不可 → `injectManifest` 移行が必要。**ただし Declarative Web Push 採用なら SW 変更自体が不要** | [vite-pwa docs](https://vite-pwa-org.netlify.app/guide/inject-manifest) |
| Node の `web-push` は Workers でそのまま動かない。Workers 対応: [PushForge](https://github.com/draphy/pushforge)（ゼロ依存）/ web-push-browser。CF 公式ガイドあり | [CF Agents: Push notifications](https://developers.cloudflare.com/agents/guides/push-notifications/) |
| Cron Triggers: 無料プラン可・**3本/Worker**。KV 無料枠: 100k read/日・1k write/日・1GB | [Workers Limits](https://developers.cloudflare.com/workers/platform/limits/) / [KV Limits](https://developers.cloudflare.com/kv/platform/limits/) |

### 5-4. コード側の確認済み事実（実装の入口）

- BOARD_QUERY は意図的に `body` を取得しない（`worker/src/github.ts` の `boardItemToTask` で `body: ''`、詳細画面で遅延取得）
- `closedAt` は現在どのクエリにも含まれない（F8 で1行追加）
- drift 検知は Status 専用ループ（`getMeta`）→ フィールド追加時は「登録フィールド一覧を回す」形への一般化が安価
- ページングは `BOARD_MAX_PAGES = 50`（5000 items）+ `truncated` フラグ実装済み
- `createTask` 入力は `{ title?, status?, labels?, body? }`（ショートカット起票はこの形をそのまま使える）

---

## 6. 競合ツール調査メモ（参考）

- Things 3 の Today ビュー =「今日やるとコミットした状態」の設計が最高評価（[rivva](https://blog.rivva.app/p/todoist-vs-things-vs-ticktick) / [Nerdynav](https://nerdynav.com/ticktick-vs-things-3/)）
- Todoist = 自然言語入力が業界最高 + Ramble（音声起票、2025）。本アプリでは誤起票リスクから自然言語パースは見送り、音声は F1 の Siri 経由で代替可能
- GitHub Mobile が Projects ボード非対応であることが本 PWA の存在理由（変化なし）

---

*調査: コードベース精読 + Web 調査（出典は各表に記載）+ GitHub GraphQL スキーマイントロスペクション実証（2026-06-12）。*
