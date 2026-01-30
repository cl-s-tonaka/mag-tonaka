# 動的エージェントシステム

API経由で動的にエージェントを登録し、LLMでプロンプトを実行可能なマルチエージェントシステム。

## 概要

このシステムは、動的エージェント登録とマルチエージェント・オーケストレーションを実現します。

### 主な特徴

- **動的エージェント登録**: API経由でエージェントを即座に追加・削除
- **LiteLLM統合**: OpenAI互換APIで任意のLLMを使用可能
- **マルチエージェント・オーケストレーション**: リクエストを分析し最適なエージェントにルーティング
- **ツール実行**: サンドボックスによる安全なツール実行
- **並列・パイプライン実行**: 複数エージェントの協調動作

### 動作確認済み機能

| 機能 | 状態 |
|-----|------|
| サーバー起動 | OK |
| LLM接続 (LiteLLM/OpenAI互換) | OK |
| エージェント作成・一覧・実行 | OK |
| ツール付きエージェント実行 | OK |
| オーケストレーター（自動ルーティング） | OK |
| 並列実行 | OK |
| パイプライン実行 | OK |

## クイックスタート

### 1. 環境変数設定

```bash
cp .env.example .env
```

`.env` ファイルを編集:

```bash
# LiteLLM設定（必須）
LITELLM_API_KEY=your-api-key
LITELLM_BASE_URL=http://localhost:4000
LITELLM_DEFAULT_MODEL=gpt-4o-mini

# Supervisor/Orchestratorモデル
SUPERVISOR_MODEL=gpt-4o
ORCHESTRATOR_MODEL=gpt-4o

# サーバー設定
PORT=3001

# フィーチャーフラグ
ENABLE_DYNAMIC_AGENTS=true
ENABLE_DYNAMIC_TOOLS=true
```

### 2. サーバー起動

```bash
# 依存関係インストール
npm install

# マルチエージェントサーバー起動
npm run dev:multiagent
```

### 3. 動作確認

```bash
# ヘルスチェック
curl http://localhost:3001/health

# エージェント一覧
curl http://localhost:3001/api/v2/dynamic-agents
```

## アーキテクチャ

```
apps/server/src/
├── services/                     # 外部サービス統合
│   └── LiteLLMService.ts         # LiteLLM/OpenAI互換API
├── orchestrator/                 # マルチエージェント調整
│   ├── AgentOrchestrator.ts      # オーケストレーター
│   └── orchestratorRouter.ts     # オーケストレーターAPI
├── agents/                       # 静的エージェント
│   ├── SupervisorAgent.ts        # タスク分析・ルーティング
│   └── AgentGeneratorAgent.ts    # 対話的エージェント作成
├── dynamic/                      # 動的エージェントシステム
│   ├── dynamicSystem.ts          # エントリーポイント
│   ├── managers/                 # ライフサイクル管理
│   │   ├── DynamicAgentManager.ts
│   │   └── DynamicAgentRegistry.ts
│   ├── agents/                   # エージェント生成・ロード
│   │   ├── DynamicAgentCreator.ts  # LLM統合済み
│   │   └── DynamicAgentLoader.ts
│   ├── tools/                    # ツール管理
│   │   ├── DynamicToolCompiler.ts
│   │   ├── DynamicToolExecutor.ts
│   │   ├── ToolSandbox.ts
│   │   └── agentManagementTools.ts
│   ├── storage/                  # データベース
│   │   ├── DynamicAgentStorage.ts
│   │   ├── DynamicToolStorage.ts
│   │   ├── AuditLogStorage.ts
│   │   └── migrations.ts
│   └── api/                      # REST API
│       ├── dynamicAgentsRouter.ts
│       ├── validators.ts
│       └── errorHandlers.ts
└── index.multiagent.sample.ts    # 統合サンプル
```

## API リファレンス

### エージェント管理

| メソッド | エンドポイント | 説明 |
|---------|--------------|------|
| POST | `/api/v2/dynamic-agents` | エージェント作成 |
| GET | `/api/v2/dynamic-agents` | エージェント一覧 |
| GET | `/api/v2/dynamic-agents/:id` | エージェント詳細 |
| PUT | `/api/v2/dynamic-agents/:id` | エージェント更新 |
| DELETE | `/api/v2/dynamic-agents/:id` | エージェント削除 |
| POST | `/api/v2/dynamic-agents/:id/run` | **エージェント実行** |
| POST | `/api/v2/dynamic-agents/:id/chat` | **チャット（履歴維持）** |

### オーケストレーター

| メソッド | エンドポイント | 説明 |
|---------|--------------|------|
| POST | `/api/v2/orchestrator/process` | **自動ルーティング処理** |
| POST | `/api/v2/orchestrator/route` | ルーティング分析のみ |
| POST | `/api/v2/orchestrator/parallel` | **並列実行** |
| POST | `/api/v2/orchestrator/pipeline` | **パイプライン実行** |
| GET | `/api/v2/orchestrator/config` | 設定取得 |
| DELETE | `/api/v2/orchestrator/history` | 履歴クリア |

## 使用例

### 1. エージェント作成

```bash
curl -X POST http://localhost:3001/api/v2/dynamic-agents \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "weather-agent",
    "displayName": "Weather Agent",
    "description": "天気情報を取得するエージェント",
    "instructions": "あなたは天気情報を提供するエージェントです。",
    "model": "gpt-4o-mini",
    "tools": [
      {
        "name": "getWeather",
        "description": "指定した都市の天気を取得",
        "parameters": [
          { "name": "city", "zodType": "string", "description": "都市名" }
        ],
        "implementation": "const city = params.city; return { temp: 22, condition: \"晴れ\", city: city };"
      }
    ]
  }'
```

#### ツールパラメータの形式

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `name` | string | パラメータ名 |
| `zodType` | string | 型 (`string`, `number`, `boolean`, `enum`, `object`, `array`) |
| `description` | string | パラメータの説明 |
| `optional` | boolean | 省略可能かどうか（デフォルト: false） |
| `zodOptions` | string[] | enum型の場合の選択肢 |

#### ツール実装の注意点

ツールの `implementation` では、パラメータは `params` オブジェクト経由でアクセスします:

```javascript
// 正しい例
"implementation": "const city = params.city; return { temp: 22, city: city };"

// 間違い例（動作しません）
"implementation": "return { temp: 22, city: city };"  // city は未定義
```

### 2. エージェント実行（プロンプト実行）

```bash
curl -X POST http://localhost:3001/api/v2/dynamic-agents/weather-agent/run \
  -H "Content-Type: application/json" \
  -d '{
    "task": "東京の天気を教えてください",
    "context": { "userId": "user123" }
  }'
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "agentId": "weather-agent",
    "output": "東京の天気は晴れで、気温は22度です。",
    "toolCalls": [
      { "name": "getWeather", "args": { "city": "東京" }, "result": { "temp": 22, "condition": "晴れ" } }
    ],
    "model": "gpt-4o-mini"
  }
}
```

### 3. オーケストレーター（自動ルーティング）

```bash
curl -X POST http://localhost:3001/api/v2/orchestrator/process \
  -H "Content-Type: application/json" \
  -d '{"message": "今日の東京の天気は？"}'
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "response": "東京の天気は晴れで、気温は22度です。",
    "routing": {
      "targetAgentId": "weather-agent",
      "reason": "天気に関する質問なのでweather-agentが適切",
      "confidence": 0.95
    }
  }
}
```

### 4. 並列実行

```bash
curl -X POST http://localhost:3001/api/v2/orchestrator/parallel \
  -H "Content-Type: application/json" \
  -d '{
    "tasks": [
      { "agentId": "weather-agent", "task": "東京の天気" },
      { "agentId": "translator-agent", "task": "Hello を日本語に翻訳" }
    ]
  }'
```

### 5. パイプライン実行

```bash
curl -X POST http://localhost:3001/api/v2/orchestrator/pipeline \
  -H "Content-Type: application/json" \
  -d '{
    "pipeline": [
      { "agentId": "weather-agent", "taskTemplate": "{{input}}の天気を教えて" },
      { "agentId": "translator-agent", "taskTemplate": "次のテキストを英語に翻訳してください: {{input}}" }
    ],
    "initialInput": "東京"
  }'
```

## LiteLLM設定

### 対応プロバイダー

| プロバイダー | LITELLM_BASE_URL | 備考 |
|------------|------------------|------|
| LiteLLM Proxy | `http://localhost:4000` | 推奨 |
| OpenAI | `https://api.openai.com` | 直接接続 |
| Azure OpenAI | `https://your-resource.openai.azure.com` | |
| Ollama | `http://localhost:11434` | ローカルLLM |

### モデル指定

```bash
# エージェント作成時にモデル指定
"model": "gpt-4o-mini"      # OpenAI
"model": "claude-3-sonnet"   # Anthropic (LiteLLM経由)
"model": "gemini-pro"        # Google (LiteLLM経由)
"model": "ollama/llama2"     # Ollama
```

## プログラム統合

```typescript
import * as dotenv from 'dotenv';
dotenv.config();

import { LiteLLMService } from './services/LiteLLMService';
import { DynamicSystem } from './dynamic/dynamicSystem';
import { AgentOrchestrator } from './orchestrator/AgentOrchestrator';
import { SupervisorAgent } from './agents/SupervisorAgent';

// 1. LLMサービス初期化
const llmService = new LiteLLMService({
  apiKey: process.env.LITELLM_API_KEY,
  baseUrl: process.env.LITELLM_BASE_URL,
});

// 2. 動的システム初期化
const dynamicSystem = new DynamicSystem({});
const dynamicAgents = await dynamicSystem.initialize();
const agentManager = dynamicSystem.getManager();

// 3. 静的エージェント初期化
const supervisor = new SupervisorAgent({}, agentManager, llmService);

// 4. オーケストレーター初期化
const orchestrator = new AgentOrchestrator(agentManager, llmService);
orchestrator.registerStaticAgent('supervisor', supervisor);

// 5. リクエスト処理
const result = await orchestrator.processRequest('今日の天気は？');
console.log(result.response);
```

## セキュリティ

### サンドボックス実行

- **タイムアウト**: 5秒
- **ホワイトリスト**: `fetch`は許可ドメインのみ（api.weather.com, api.openweathermap.org）
- **禁止**: `require()`, `process`, `fs`, `__dirname`

> **注意**: 現在の開発環境では簡易的なサンドボックスを使用しています。本番環境ではVM2またはWorker Threadsによる完全なサンドボックス化を推奨します。

### 監査ログ

すべての操作は `dynamic_agent_audit` テーブルに記録されます。

## トラブルシューティング

### LLM接続エラー

```bash
# 接続テスト
curl -X POST $LITELLM_BASE_URL/v1/chat/completions \
  -H "Authorization: Bearer $LITELLM_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-4o-mini", "messages": [{"role": "user", "content": "test"}]}'
```

### エージェントが見つからない

```bash
# エージェント一覧確認
curl http://localhost:3001/api/v2/dynamic-agents

# DB直接確認（本番環境）
sqlite3 dynamic_agents.db "SELECT * FROM dynamic_agents WHERE status='active';"
```

### ツール実行エラー

```bash
# デバッグログ有効化
ENABLE_DEBUG_LOGGING=true npm run dev:multiagent
```

### よくあるエラーと対処法

| エラー | 原因 | 対処法 |
|-------|------|--------|
| `Invalid schema for function` | ツールパラメータが不正 | `zodType`を使用しているか確認 |
| `messages with role 'tool' must be...` | LLMメッセージ形式エラー | LiteLLMServiceのバージョンを確認 |
| `Dynamic agents are disabled` | フィーチャーフラグが無効 | `ENABLE_DYNAMIC_AGENTS=true`を設定 |
| `Agent already exists` | 同一IDのエージェントが存在 | 別のagentIdを使用するか、既存を削除 |

## スクリプト

```bash
npm run dev              # 通常起動
npm run dev:multiagent   # マルチエージェント統合起動
npm run build            # ビルド
npm run test             # テスト
npm run migrate          # DBマイグレーション
```

## 環境変数一覧

| 変数名 | デフォルト | 説明 |
|--------|----------|------|
| `LITELLM_API_KEY` | - | LiteLLM API Key（必須） |
| `LITELLM_BASE_URL` | `http://localhost:4000` | LiteLLM Base URL |
| `LITELLM_DEFAULT_MODEL` | `gpt-4o-mini` | デフォルトモデル |
| `SUPERVISOR_MODEL` | `gpt-4o` | Supervisorモデル |
| `ORCHESTRATOR_MODEL` | `gpt-4o` | Orchestratorモデル |
| `PORT` | `3001` | サーバーポート |
| `ENABLE_DYNAMIC_AGENTS` | `false` | 動的エージェント有効化 |
| `ENABLE_DYNAMIC_TOOLS` | `false` | 動的ツール有効化 |
| `ENABLE_DEBUG_LOGGING` | `false` | デバッグログ |
| `ENABLE_VM2_SANDBOX` | `true` | VM2サンドボックス |

## 開発時の注意

### モックDB

現在の実装では開発用のインメモリモックDBを使用しています。本番環境では LibSQL/Turso を使用してください。

```typescript
// dynamicSystem.ts でDB接続を有効化
const { createClient } = require('@libsql/client');
this.db = createClient({ url: `file:${dbPath}` });
```

### 依存パッケージ

```bash
npm install dotenv    # 環境変数読み込み（必須）
npm install vm2       # サンドボックス（本番推奨）
```

## ドキュメント

詳細な設計ドキュメントは `docs/dynamic-agent-system/` を参照してください。

## バージョン履歴

| バージョン | 日付 | 変更内容 |
|----------|------|---------|
| 2.1.0 | 2026-01-30 | ツールパラメータ形式修正、LLMメッセージ形式修正、モックDB改善 |
| 2.0.0 | 2026-01-30 | LiteLLM統合、マルチエージェント・オーケストレーター追加 |
| 1.0.0 | 2026-01-29 | 初版リリース |
