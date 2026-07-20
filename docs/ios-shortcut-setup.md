# iOS ショートカット「lifeへ捕捉」セットアップ（N-11 quick-capture）

外出先で思いついた断片を **2タップ**で `label:inbox` の GitHub Issue にする iOS ショートカット。
共有シート（Safari の URL・選択テキスト等）からも、ホーム画面アイコンからも起動できる。
設定は一度きり・5分。**PC 側の仕分けは `inbox-triage` スキル**が担当。

> iOS の PWA は Web Share Target 非対応のため、共有シート対応はショートカットで実現する。

## 事前に用意するもの
- **エンドポイント**と**capture トークン**: PC の `%USERPROFILE%\.secrets\life-capture.json` に入っている。
  ```json
  { "endpoint": "https://life-task-api.mizugorou071.workers.dev/api/capture", "captureToken": "<43文字>" }
  ```
  この2値を iPhone に控える（トークンは PAT でも合言葉でもない**捕捉専用**。漏れても捕捉が止まるだけで、
  ローテートは PC で `wrangler secret put CAPTURE_TOKEN` するだけ）。

## 手順（iPhone「ショートカット」アプリ）
1. **＋** → 新規ショートカット → 名前「**lifeへ捕捉**」。
2. アクションを順に追加:
   1. **「入力を要求」**（テキスト）… プロンプト「捕捉する内容」。※共有シート起動時は「ショートカットの入力」を使う（下の④）。
   2. **「テキスト」**アクションで本文を組み立て（任意）。URL を一緒に送りたいときはここに差し込む。
   3. **「URL の内容を取得」**（Get Contents of URL）:
      - **URL**: `https://life-task-api.mizugorou071.workers.dev/api/capture`
      - **方法**: `POST`
      - **ヘッダ**:
        - `X-Capture-Token` = `<life-capture.json の captureToken>`
        - `Content-Type` = `application/json`
      - **本文**: `JSON`
        - `title` = （①の入力／共有テキスト）
        - `body`  = （任意。共有 URL や補足。無ければ省略可）
   4. **「通知を表示」**で結果（`{"number":.., "url":..}`）を表示。失敗時（401/400）はメッセージが返る。
3. **共有シート対応**: ショートカット設定 → 「共有シートに表示」を ON、受け取る種類を「テキスト」「URL」に。
   共有シートから起動したときは①の代わりに **「ショートカットの入力」** を title に渡す。
4. **ホーム画面に追加**: ショートカット → 共有 → 「ホーム画面に追加」。アイコン1つで即起動。

## 動作確認
- ショートカットを実行 → 適当な文言を入力 → 通知に `number` が出れば成功。
- GitHub で `pandas-mizugorou/life` の Issues を開き、`label:inbox` が付き**ボード（Projects #1）には載っていない**ことを確認。
- 誤ったトークンだと `401 認証に失敗しました`、空タイトルだと `400 タイトルを入力してください` が返る。

## スクリーンショット枠（設定後に貼る）
- [ ] ショートカット全体のアクション一覧
- [ ] 「URL の内容を取得」の POST/ヘッダ/JSON 設定
- [ ] 共有シートに「lifeへ捕捉」が出ている様子

## トラブルシュート
- **401**: `X-Capture-Token` が違う。`.secrets\life-capture.json` の値と一致させる（前後の空白に注意）。
- **400**: title が空。入力を title に渡せているか確認。
- **通信できない**: エンドポイント URL の綴り、iPhone のネット接続を確認（VPN 不要・公開エンドポイント）。

## 仕分け（PC 側）
溜まった断片は PC で **「inbox仕分け」** と言えば `inbox-triage` スキルが 4件ずつ
「タスク化／メモ化／調査へ／クローズ」に振り分ける。
