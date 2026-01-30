# 動的エージェントシステム

API経由で動的にエージェントを登録可能な、VoltAgentベースのエージェント管理システム。

## 概要

このシステムは、静的なGitHub PRベースのエージェント生成から、API経由の動的エージェント登録アーキテクチャへの移行を実現します。

### 主な特徴

- **再起動不要**: 新しいエージェントとツールを即座に追加可能
- **基盤コード変更不要**: 既存システムに影響を与えない独立構築（Strategy B）
- **安全性**: VM2サンドボックスによる動的コード実行の隔離
- **完全な分離**: 専用データベース（`dynamic_agents.db`）と独立したディレクトリ構造

## アーキテクチャ

```
apps/server/src/
├── dynamic/                              # 動的エージェントシステム（完全独立）
│   ├── dynamicSystem.ts                  # エントリーポイント
│   ├── managers/                         # エージェントライフサイクル管理
│   │   ├── DynamicAgentManager.ts
│   │   └── DynamicAgentRegistry.ts
│   ├── agents/                           # エージェント生成・ロード
│   │   ├── DynamicAgentCreator.ts
│   │   └── DynamicAgentLoader.ts
│   ├── tools/                            # ツール管理・サンドボックス
│   │   ├── DynamicToolCompiler.ts
│   │   ├── DynamicToolExecutor.ts
│   │   └── ToolSandbox.ts
│   ├── storage/                          # データベースアクセス
│   │   ├── DynamicAgentStorage.ts
│   │   ├── DynamicToolStorage.ts
│   │   ├── AuditLogStorage.ts
│   │   └── migrations.ts
│   ├── api/                              # REST API
│   │   ├── dynamicAgentsRouter.ts
│   │   ├── validators.ts
│   │   └── errorHandlers.ts
│   ├── types/                            # 型定義
│   │   ├── dynamicAgent.types.ts
│   │   └── dynamicTool.types.ts
│   └── utils/                            # ユーティリティ
│       ├── logger.ts
│       └── featureFlags.ts
│
└── index.ts                              # メインエントリーポイント（統合）
```

## セットアップ

### 前提条件

- Node.js 18+
- TypeScript
- LibSQL/Turso（推奨）または SQLite

### インストール

```bash
# 依存関係インストール
npm install

# VM2サンドボックス（MVPフェーズ）
npm install vm2 @types/vm2

# LibSQL（データベース）
npm install @libsql/client

# 開発用
npm install -D typescript @types/node
```

### 環境変数設定

```bash
# .env ファイルを作成
cat > .env << EOF
# 動的エージェントシステムの有効化
ENABLE_DYNAMIC_AGENTS=true

# 動的ツールの有効化
ENABLE_DYNAMIC_TOOLS=true

# デバッグログの有効化
ENABLE_DEBUG_LOGGING=false

# VM2サンドボックスの有効化
ENABLE_VM2_SANDBOX=true
EOF
```

### データベース初期化

```bash
# マイグレーション実行
node -e "require('./src/dynamic/storage/migrations').runMigrations('./dynamic_agents.db')"
```

## 使用方法

### サーバー起動

```bash
# 動的エージェント有効化
ENABLE_DYNAMIC_AGENTS=true npm run dev

# 動的エージェント無効化
ENABLE_DYNAMIC_AGENTS=false npm run dev
```

### API使用例

#### エージェント作成

```bash
curl -X POST http://localhost:4310/api/v2/dynamic-agents \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "weatherAgent",
    "displayName": "Weather Agent",
    "description": "Get current weather information",
    "instructions": "あなたは天気情報を提供するエージェントです。",
    "model": "openai/gpt-4o-mini",
    "tools": [
      {
        "name": "getCurrentWeather",
        "description": "Get weather for a location",
        "parameters": [
          {
            "name": "location",
            "zodType": "string",
            "description": "City name"
          }
        ],
        "implementation": "return { temperature: 20, condition: 'sunny' };"
      }
    ]
  }'
```

#### エージェント一覧取得

```bash
curl http://localhost:4310/api/v2/dynamic-agents
```

#### エージェント詳細取得

```bash
curl http://localhost:4310/api/v2/dynamic-agents/weatherAgent
```

#### エージェント更新

```bash
curl -X PUT http://localhost:4310/api/v2/dynamic-agents/weatherAgent \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated description"
  }'
```

#### エージェント削除

```bash
curl -X DELETE http://localhost:4310/api/v2/dynamic-agents/weatherAgent
```

## 統合

既存の `index.ts` に以下のコードを追加:

```typescript
import { DynamicSystem } from './dynamic/dynamicSystem';
import { FEATURE_FLAGS } from './dynamic/utils/featureFlags';

// 動的エージェント初期化
let dynamicAgents: Record<string, Agent> = {};
if (FEATURE_FLAGS.ENABLE_DYNAMIC_AGENTS) {
  const dynamicSystem = new DynamicSystem(memory);
  dynamicAgents = await dynamicSystem.initialize();
}

// VoltAgentに統合
const voltAgent = new VoltAgent({
  agents: { ...staticAgents, ...dynamicAgents },
  // ...
});
```

## テスト

```bash
# ユニットテスト
npm test

# 統合テスト
npm run test:integration

# 特定のテスト
npm test -- --testPathPattern=dynamic
```

## ロールバック

### 緊急ロールバック（1分）

```bash
# フィーチャーフラグをOFF
export ENABLE_DYNAMIC_AGENTS=false

# サーバー再起動
npm run restart
```

### 完全削除（5分）

```bash
# 動的システムディレクトリ削除
rm -rf src/dynamic/

# DBファイル削除
rm dynamic_agents.db

# index.ts の統合コード削除

# サーバー再起動
npm run restart
```

## セキュリティ

### サンドボックス

- **MVP**: VM2サンドボックス（タイムアウト5秒）
- **本番推奨**: Worker Threads隔離（将来実装）

### 許可されたAPI

- `fetch`（ホワイトリストドメインのみ）
- `console.log`, `console.error`

### 禁止事項

- `require()`, `process`, `fs`, `__dirname`, `__filename`
- 任意のファイルシステムアクセス
- 任意のネットワークアクセス

## トラブルシューティング

### エージェントが復元されない

```bash
# DBファイル確認
ls -l dynamic_agents.db

# DB内容確認
sqlite3 dynamic_agents.db "SELECT * FROM dynamic_agents;"

# ログ確認
tail -f logs/server.log | grep "dynamic"
```

### ツールコンパイルエラー

```bash
# シンタックスチェック
node -e "new Function('return 1 + 1')"
```

### VM2タイムアウト

```typescript
// タイムアウト延長（デバッグ用）
new VM({ timeout: 30000 });
```

## ドキュメント

詳細な設計ドキュメントは `docs/dynamic-agent-system/` を参照してください。

- [01-requirements.md](../../docs/dynamic-agent-system/01-requirements.md) - 要件定義
- [02-architecture.md](../../docs/dynamic-agent-system/02-architecture.md) - アーキテクチャ設計
- [03-database-design.md](../../docs/dynamic-agent-system/03-database-design.md) - データベース設計
- [04-api-specification.md](../../docs/dynamic-agent-system/04-api-specification.md) - API仕様
- [05-security-design.md](../../docs/dynamic-agent-system/05-security-design.md) - セキュリティ設計
- [06-implementation-guide.md](../../docs/dynamic-agent-system/06-implementation-guide.md) - 実装ガイド

## ライセンス

（プロジェクトに応じて記載）

## バージョン履歴

| バージョン | 日付 | 変更内容 |
|----------|------|---------|
| 1.0.0 | 2026-01-29 | 初版リリース |
