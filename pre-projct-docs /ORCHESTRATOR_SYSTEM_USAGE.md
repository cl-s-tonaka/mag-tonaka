# オーケストレーターシステム 使用ガイド

## 📖 目次

1. [システム概要](#システム概要)
2. [基本的な使い方](#基本的な使い方)
3. [処理フロー](#処理フロー)
4. [具体的な使用例](#具体的な使用例)
5. [システムアーキテクチャ](#システムアーキテクチャ)
6. [トラブルシューティング](#トラブルシューティング)

---

## システム概要

このシステムでは、**ChatAgent が統合エージェント（オーケストレーター）** として機能し、ユーザーのリクエストを分析して、最適な方法で対応します。

### 主な機能

1. **簡単な質問への直接回答**: 天気、一般知識など
2. **既存エージェントへのタスク委譲**: 複雑なタスクを専門エージェントに委譲
3. **新しいエージェントの作成提案**: 既存エージェントで対応できない場合
4. **対応不可能な判断**: システムの範囲外のリクエストを明確に説明

---

## 基本的な使い方

### 前提条件

- MAGシステムが起動している（`http://localhost:3001`）
- チャットモードでChatAgentと対話している

### ユーザーの操作

チャットインターフェースでChatAgentにメッセージを送信するだけです。
ChatAgentが自動的にリクエストを分析し、最適な方法で対応します。

---

## 処理フロー

### フロー1: 簡単な質問・会話

```
ユーザー: 「こんにちは！」
   ↓
ChatAgent: 挨拶や一般的な質問として認識
   ↓
ChatAgent: 直接回答を生成
   ↓
ユーザー: 回答を受け取る
```

**使用されるツール**: なし（ChatAgentの知識で直接回答）

**例**:
- 「こんにちは！」
- 「AIについて教えて」
- 「今日の天気は？」（weatherToolを使用）

---

### フロー2: 既存エージェントへの委譲

```
ユーザー: 「新しいCSV分析エージェントを作りたい」
   ↓
ChatAgent: 複雑なタスクと判断
   ↓
ChatAgent: listAvailableAgents ツールを実行
   ↓ (API: GET /api/agents-with-examples)
システム: 利用可能なエージェント一覧を返す
   ↓
ChatAgent: 適切なエージェントを選択（agentGenerator）
   ↓
ChatAgent: delegateToAgent ツールを実行
   ↓ (API: POST /api/agents/agentGenerator/execute)
   |   Body: { task: "CSV分析エージェントを作成", context: "..." }
   ↓
agentGeneratorAgent: タスクを実行
   ↓
agentGeneratorAgent: 結果を返す
   ↓
ChatAgent: 結果をユーザーに分かりやすく報告
   ↓
ユーザー: 結果を受け取る
```

**使用されるツール**:
1. `listAvailableAgents` - エージェント一覧取得
2. `delegateToAgent` - エージェントにタスク委譲

**例**:
- 「新しいエージェントを作成して」→ `agentGenerator` に委譲
- 「システム設定を変更して」→ `admin` に委譲
- 「データを分析して」→ 該当するエージェントに委譲

---

### フロー3: 新しいエージェントが必要

```
ユーザー: 「Slackにメッセージを送りたい」
   ↓
ChatAgent: タスク内容を分析
   ↓
ChatAgent: listAvailableAgents ツールを実行
   ↓ (API: GET /api/agents-with-examples)
システム: 利用可能なエージェント一覧を返す
   ↓
ChatAgent: 既存エージェントで対応できないと判断
   ↓
ChatAgent: 新しいエージェント作成を提案
   |   - なぜ既存エージェントでは対応できないかを説明
   |   - エージェント作成モードでのプロンプト例を提示
   ↓
ユーザー: 提案を受け取る
   ↓
ユーザー: （オプション）エージェント作成モードに切り替えて提案されたプロンプトを使用
```

**使用されるツール**:
1. `listAvailableAgents` - 既存エージェントを確認

**例の提案内容**:
```
「現在、Slack連携を行うエージェントは存在しません。
エージェント作成モードで以下のようなプロンプトを投げることをお勧めします：

『Slack APIを使ってメッセージを送信するエージェントを作成してください。
- ツール: sendSlackMessage (channel, message)
- Slack Webhook URLを環境変数から取得』」
```

---

### フロー4: 対応不可能

```
ユーザー: 「物理的なロボットを動かして」
   ↓
ChatAgent: リクエストを分析
   ↓
ChatAgent: システムの範囲外と判断
   ↓
ChatAgent: 対応不可能な理由を明確に説明
   ↓
ユーザー: 説明を受け取る
```

**例**:
```
「申し訳ございませんが、このシステムはソフトウェアエージェントのみを扱うため、
物理的なロボット制御には対応できません。」
```

---

## 具体的な使用例

### 例1: 天気を聞く（簡単な質問）

**ユーザーの操作**:
```
ユーザー: 「今日の東京の天気は？」
```

**システムの処理**:
1. ChatAgentがリクエストを受信
2. 簡単な質問と判断
3. `weatherTool` を直接実行
4. 天気情報を取得
5. 結果を分かりやすく整形して返す

**ユーザーが受け取る結果**:
```
ChatAgent: 「東京の今日の天気は晴れで、気温は15度です。」
```

---

### 例2: 新しいエージェントを作成する（委譲）

**ユーザーの操作**:
```
ユーザー: 「新しいCSV分析エージェントを作成してください」
```

**システムの処理**:
1. ChatAgentがリクエストを受信
2. 複雑なタスクと判断
3. `listAvailableAgents()` を実行
   - API: `GET /api/agents-with-examples`
   - 取得: `[{id: "chat", ...}, {id: "admin", ...}, {id: "agentGenerator", ...}]`
4. `agentGenerator` が適切と判断
5. `delegateToAgent("agentGenerator", "CSV分析エージェントを作成")` を実行
   - API: `POST /api/agents/agentGenerator/execute`
   - Body: `{ task: "CSV分析エージェントを作成", context: null }`
6. agentGeneratorAgentがエージェント設計書を作成
7. 結果を受け取る
8. ユーザーに報告

**ユーザーが受け取る結果**:
```
ChatAgent: 「agentGeneratorに委譲して、CSV分析エージェントの作成を開始しました。

【設計書】
- エージェントID: csvAnalyzer
- 役割: CSVファイルを分析してインサイトを提供
- ツール: parseCSV, analyzeData

設計書を確認して、承認いただければコード生成に進みます。」
```

---

### 例3: 利用可能なエージェントを確認する

**ユーザーの操作**:
```
ユーザー: 「利用可能なエージェントを教えて」
```

**システムの処理**:
1. ChatAgentがリクエストを受信
2. `listAvailableAgents()` を実行
   - API: `GET /api/agents-with-examples`
3. エージェント一覧を取得
4. 整形してユーザーに表示

**ユーザーが受け取る結果**:
```
ChatAgent: 「現在、以下の3つのエージェントが利用可能です：

1. **chat** (チャットエージェント)
   - 役割: ユーザーの質問に答えたり、会話を楽しんだりします
   - ツール: weatherTool, listAvailableAgents, delegateToAgent

2. **admin** (管理エージェント)
   - 役割: システム管理タスクを実行します
   - ツール: ...

3. **agentGenerator** (エージェント生成エージェント)
   - 役割: 新しいエージェントを自動生成します
   - ツール: generateAgentCode, createAgentPR, ...

どのエージェントを使用したいタスクがありますか？」
```

---

### 例4: 新しいエージェントが必要（Slack連携）

**ユーザーの操作**:
```
ユーザー: 「Slackにメッセージを送りたい」
```

**システムの処理**:
1. ChatAgentがリクエストを受信
2. `listAvailableAgents()` を実行
3. Slack連携を行うエージェントが存在しないことを確認
4. 新しいエージェント作成を提案

**ユーザーが受け取る結果**:
```
ChatAgent: 「現在、Slack連携を行うエージェントは存在しません。

新しいエージェントを作成することで対応できます。
エージェント作成モードで以下のようなプロンプトを投げることをお勧めします：

---
『Slack APIを使ってメッセージを送信するエージェントを作成してください。

【要件】
- エージェントID: slackMessenger
- 役割: Slackの指定されたチャンネルにメッセージを送信する

【ツール】
- sendSlackMessage (channel, message)
  - Slack Webhook URLを環境変数 SLACK_WEBHOOK_URL から取得
  - メッセージをJSON形式で送信

【必要な環境変数】
- SLACK_WEBHOOK_URL
』
---

上記のプロンプトをエージェント作成モードで使用してください。」
```

---

### 例5: 複数のエージェントを組み合わせる

**ユーザーの操作**:
```
ユーザー: 「新しいデータ分析エージェントを作成して、すぐにテストして」
```

**システムの処理**:
1. ChatAgentがリクエストを受信
2. 2つのタスクに分解:
   - タスク1: エージェント作成
   - タスク2: テスト実行
3. `delegateToAgent("agentGenerator", "データ分析エージェントを作成")` を実行
4. 作成完了後、`delegateToAgent("admin", "新しいエージェントをテスト")` を実行（adminがテスト機能を持つ場合）
5. 結果を統合してユーザーに報告

**ユーザーが受け取る結果**:
```
ChatAgent: 「データ分析エージェントの作成とテストを実行しました。

【作成結果】
✅ dataAnalyzerAgentを作成しました
✅ GitHub PRを作成: https://github.com/owner/repo/pull/123

【テスト結果】
✅ 基本的な動作テスト: 成功
✅ ツールの動作確認: 成功

エージェントは正常に動作しています！」
```

---

## システムアーキテクチャ

### コンポーネント構成

```
┌─────────────────────────────────────────────────────────────┐
│                         ユーザー                              │
└──────────────────────┬──────────────────────────────────────┘
                       │ メッセージ送信
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                   ChatAgent (オーケストレーター)               │
│                                                               │
│  判断ロジック:                                                 │
│  1. 簡単な質問 → 直接回答                                      │
│  2. 複雑なタスク → エージェント委譲                             │
│  3. 新規エージェント必要 → 作成提案                             │
│  4. 対応不可能 → 理由説明                                      │
└───────┬─────────────────────────────┬───────────────────────┘
        │                             │
        │ ツール実行                   │ ツール実行
        ↓                             ↓
┌──────────────────┐         ┌──────────────────────────────┐
│listAvailableAgents│         │    delegateToAgent           │
└────────┬──────────┘         └──────────┬───────────────────┘
         │                               │
         │ GET /api/agents-with-examples │ POST /api/agents/:agentId/execute
         ↓                               ↓
┌─────────────────────────────────────────────────────────────┐
│                      API Server (index.ts)                   │
│                                                               │
│  - GET /api/agents-with-examples                             │
│  - POST /api/agents/:agentId/execute                         │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────────┐
│               agentRegistry (グローバルレジストリ)             │
│                                                               │
│  - chat (ChatAgent)                                          │
│  - admin (AdminAgent)                                        │
│  - agentGenerator (AgentGeneratorAgent)                      │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ↓
              各エージェントのインスタンス
```

### ツールとAPIの関係

| ツール名 | APIエンドポイント | 役割 |
|---------|-----------------|------|
| `listAvailableAgents` | `GET /api/agents-with-examples` | システム内の全エージェント情報を取得 |
| `delegateToAgent` | `POST /api/agents/:agentId/execute` | 指定されたエージェントにタスクを委譲 |

### データフロー

1. **エージェント情報の取得**
   ```
   ChatAgent → listAvailableAgents → API Server → agentRegistry
   ```

2. **タスクの委譲**
   ```
   ChatAgent → delegateToAgent → API Server → agentRegistry → 対象エージェント
   ```

---

## トラブルシューティング

### 問題1: エージェント一覧が取得できない

**症状**:
```
Failed to fetch agents: 500 Internal Server Error
```

**原因**:
- APIサーバーが起動していない
- `/api/agents-with-examples` エンドポイントにエラーがある

**解決方法**:
1. サーバーが起動しているか確認: `http://localhost:3001`
2. ログを確認: サーバーのコンソール出力を確認
3. 環境変数を確認: `API_URL` が正しく設定されているか

---

### 問題2: エージェント委譲が失敗する

**症状**:
```
エージェント委譲機能は現在実装中です
```

**原因**:
- `/api/agents/:agentId/execute` エンドポイントが未実装（501 Not Implemented）

**解決方法**:
1. VoltAgentフレームワークのAgent実行APIを実装する必要があります
2. `apps/server/src/index.ts` の該当エンドポイントを完全実装してください

**実装が必要な部分** (`index.ts:107-124`):
```typescript
// TODO: ここでエージェントを実行する
// VoltAgentフレームワークのAgent APIを使用して実行する必要があります
```

---

### 問題3: エージェントが見つからない

**症状**:
```
Agent 'xxxAgent' not found
Available agents: chat, admin, agentGenerator
```

**原因**:
- 指定されたエージェントIDが間違っている
- エージェントがレジストリに登録されていない

**解決方法**:
1. 利用可能なエージェントIDを確認: `chat`, `admin`, `agentGenerator`
2. 新しいエージェントを作成した場合、`index.ts` でレジストリに登録されているか確認:
   ```typescript
   agentRegistry.register("newAgentId", newAgentInstance);
   ```

---

### 問題4: ChatAgentが直接回答してしまう

**症状**:
ChatAgentが複雑なタスクでも他のエージェントに委譲せず、自分で回答しようとする

**原因**:
- ChatAgentのLLMが、タスクを複雑と判断していない
- instructionsが明確でない

**解決方法**:
1. より明確なリクエストを送信:
   - ❌ 「エージェント作って」
   - ✅ 「新しいCSV分析エージェントを作成してください」
2. コンテキストを追加:
   - 「agentGeneratorを使って、新しいエージェントを作成してください」

---

## まとめ

### ユーザーがすべきこと

1. **チャットモードでChatAgentにメッセージを送信**
2. **ChatAgentの応答を確認**
3. **必要に応じてエージェント作成モードに切り替え**（新しいエージェントが必要な場合）

### ChatAgentがすること

1. **リクエストを分析**
2. **最適な対応方法を選択**:
   - 直接回答
   - エージェント委譲
   - 新規エージェント作成提案
   - 対応不可能の説明
3. **結果をユーザーに報告**

### システムの利点

- ✅ **ユーザーは複雑な操作不要**: ChatAgentとの会話だけで完結
- ✅ **柔軟な対応**: 既存エージェントの活用と新規作成の両方をサポート
- ✅ **明確なガイダンス**: 対応できない場合も理由と代替案を提示
- ✅ **拡張性**: 新しいエージェントを追加するだけで機能拡張可能

---

## 付録: 開発者向け情報

### 新しいエージェントを追加する手順

1. **エージェントクラスを作成**: `apps/server/src/agents/NewAgent.ts`
2. **エージェントをエクスポート**: `apps/server/src/agents/index.ts`
3. **エージェントインスタンスを作成**: `apps/server/src/index.ts`
4. **レジストリに登録**:
   ```typescript
   agentRegistry.register("newAgent", newAgentInstance);
   ```
5. **testExamplesを登録**: `apps/server/src/testExamplesRegistry.ts`

これで、ChatAgentが自動的に新しいエージェントを認識し、委譲可能になります。

### カスタムツールの追加

ChatAgentに新しいツールを追加する場合:

1. **ツールを作成**: `apps/server/src/tools/customTool.ts`
2. **ツールをエクスポート**: `apps/server/src/tools/index.ts`
3. **ChatAgentに追加**:
   ```typescript
   tools: [weatherTool, listAvailableAgents, delegateToAgent, customTool],
   ```

---

**ドキュメントバージョン**: 1.0
**最終更新日**: 2026-01-29
**関連ファイル**:
- `apps/server/src/agents/ChatAgent.ts`
- `apps/server/src/tools/agentDiscoveryTools.ts`
- `apps/server/src/tools/agentDelegationTools.ts`
- `apps/server/src/index.ts`
- `apps/server/src/agentRegistry.ts`
