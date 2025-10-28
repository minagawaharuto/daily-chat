# Slack連携の設定方法

このドキュメントでは、日報チャットボットとSlackを連携する方法を説明します。

## 概要

日報が提出されると、自動的にSlackチャンネルに通知が投稿されます。
通知には以下の情報が含まれます：
- 提出者の名前
- 提出日時
- やったこと・すること

## 設定手順

### 1. Slack Incoming Webhookの作成

#### 方法A: シンプルな方法（Incoming Webhookのみ）

1. **Slackワークスペースにアクセス**
   - ブラウザで [https://api.slack.com/apps](https://api.slack.com/apps) を開く

2. **新しいアプリを作成**
   - 「Create New App」をクリック
   - 「From scratch」を選択
   - App Name: `日報通知`（任意の名前）
   - Workspace: 通知を送信したいワークスペースを選択
   - 「Create App」をクリック

3. **Incoming Webhooksを有効化**
   - 左サイドバーから「Incoming Webhooks」を選択
   - 「Activate Incoming Webhooks」をオンにする

4. **Webhookを追加**
   - 画面を下にスクロール
   - 「Add New Webhook to Workspace」ボタンをクリック
   - 通知を投稿したいチャンネルを選択（例: `#日報`、`#general`）
   - 「許可する」をクリック

5. **Webhook URLをコピー**
   - 表示された「Webhook URL」をコピー
   - 形式: `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX`

#### 方法B: ボットユーザーを使う方法（より高度な機能が必要な場合）

**注意**: 今回のIncoming Webhookだけの用途では、方法Aで十分です。ボットユーザーは不要です。

もし「ボットユーザーがない」というエラーが出た場合：

1. **左サイドバーから「OAuth & Permissions」を選択**
   - 「Scopes」セクションを確認
   - 「Bot Token Scopes」に何も追加しない（Incoming Webhookには不要）

2. **「Incoming Webhooks」に戻る**
   - 「Add New Webhook to Workspace」を再度実行

3. **それでもエラーが出る場合は、アプリを作り直す**
   - 既存のアプリを削除：「Settings」→「Basic Information」→ 一番下の「Delete App」
   - 上記の「方法A」の手順1から再実行

### 2. Google Apps Scriptへの設定

1. **chat.gsを開く**
   - Google Apps Scriptエディタで `chat.gs` ファイルを開く

2. **Webhook URLを設定**
   ```javascript
   // この行を見つけて、コピーしたWebhook URLに置き換える
   const SLACK_WEBHOOK_URL = 'YOUR_SLACK_WEBHOOK_URL_HERE';
   ```

   例:
   ```javascript
   const SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX';
   ```

3. **Slack通知を有効化**
   ```javascript
   // この行を見つけて、falseをtrueに変更する
   const ENABLE_SLACK_NOTIFICATION = false;
   ```

   変更後:
   ```javascript
   const ENABLE_SLACK_NOTIFICATION = true;
   ```

4. **保存**
   - `Ctrl + S`（または`Cmd + S`）で保存

### 3. 動作確認

1. **チャットボットを実行**
   - 日報チャットボットで日報を作成・提出

2. **Slackを確認**
   - 指定したSlackチャンネルに通知が投稿されているか確認

## 通知メッセージの例

```
📝 日報が提出されました

提出者:               日時:
山田太郎             2025-10-27 18:30

やったこと・すること:
朝の掃除 / データ分析の資料作成 / 明日のプレゼン準備

━━━━━━━━━━━━━━━━━━━━
```

## トラブルシューティング

### 「ボットユーザーがない」というエラーが出る場合

**原因**: Slack Appの設定で不要なBot設定が含まれている可能性があります。

**解決方法**:

1. **既存のアプリを削除**
   - [https://api.slack.com/apps](https://api.slack.com/apps) にアクセス
   - 作成したアプリを選択
   - 左サイドバー「Settings」→「Basic Information」
   - 一番下までスクロール
   - 「Delete App」をクリック

2. **新しくアプリを作成**
   - 上記の「方法A: シンプルな方法」の手順に従う
   - **重要**: 「OAuth & Permissions」や「Bot Users」の設定は触らない
   - 「Incoming Webhooks」だけを設定する

3. **Webhook URLを取得**
   - 「Incoming Webhooks」画面の下部にWebhook URLが表示される
   - このURLをコピーして `chat.gs` に設定

### 通知が届かない場合

1. **Webhook URLが正しいか確認**
   - `chat.gs` の `SLACK_WEBHOOK_URL` を確認
   - コピー時にスペースや改行が入っていないか確認
   - `https://hooks.slack.com/services/` で始まっているか確認

2. **通知が有効になっているか確認**
   - `ENABLE_SLACK_NOTIFICATION` が `true` になっているか確認

3. **権限を再付与**
   - スプレッドシートのメニューから「日報チャットボット」→「権限を付与」を実行

4. **ログを確認**
   - Google Apps Scriptエディタで「実行ログ」を確認
   - エラーメッセージがある場合は内容を確認

### よくあるエラー

#### `日報チャットボット にはインストールするボットユーザーがありません`
- **原因**: アプリ作成時にBot設定が混在している
- **解決**: 上記の「ボットユーザーがない」エラーの解決方法を参照
- **ポイント**: Incoming Webhookには「Bot User」は不要です

#### `Error: Webhook URL not found`
- Webhook URLが設定されていません
- `SLACK_WEBHOOK_URL` を正しいURLに設定してください

#### `Error: Invalid webhook URL`
- Webhook URLの形式が間違っています
- Slackから取得したURLをそのままコピーしてください

#### `Error: Channel not found`
- 指定したチャンネルが存在しません
- Slackで新しいWebhookを作成し、正しいチャンネルを選択してください

#### `no_service` または `invalid_token`
- Webhook URLが無効になっています
- Slackでアプリを削除して、新しく作り直してください

## 通知のカスタマイズ

通知メッセージをカスタマイズしたい場合は、`chat.gs` の `sendSlackNotification()` 関数を編集してください。

例: 絵文字を変更
```javascript
text: `✨ *日報が提出されました*`
```

例: フィールドを追加
```javascript
{
  type: 'section',
  fields: [
    {
      type: 'mrkdwn',
      text: `*提出者:*\n${name}`
    },
    {
      type: 'mrkdwn',
      text: `*日時:*\n${dateStr}`
    },
    {
      type: 'mrkdwn',
      text: `*チーム:*\n開発チーム`  // 追加
    }
  ]
}
```

## Slack通知を無効にする場合

Slack通知を一時的に無効にしたい場合：

```javascript
const ENABLE_SLACK_NOTIFICATION = false;
```

これだけで通知が停止します。Webhook URLはそのまま残しておけます。

## セキュリティに関する注意

- **Webhook URLは秘密情報です**
  - 他の人と共有しないでください
  - GitHub等の公開リポジトリにアップロードしないでください

- **Webhook URLが漏洩した場合**
  - Slackの設定画面から該当のWebhookを削除
  - 新しいWebhookを作成して、URLを再設定

## 参考リンク

- [Slack API - Incoming Webhooks](https://api.slack.com/messaging/webhooks)
- [Slack Block Kit Builder](https://app.slack.com/block-kit-builder) - 通知メッセージのデザインツール
- [Google Apps Script - UrlFetchApp](https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app)
