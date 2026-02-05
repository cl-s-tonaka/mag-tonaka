# CLAUDE.md - Dynamic Agent System

このファイルはClaude Codeがプロジェクトのコンテキストを理解するためのドキュメントです。

## プロジェクト概要

**Dynamic Agent System** - VoltAgentフレームワークを使用した動的エージェント登録システム

APIを経由して、サーバー再起動なしに新しいAIエージェントを動的に追加・管理できるシステム。

### 主な特徴

- **再起動不要**: 新しいエージェントを即座に追加可能
- **基盤コード変更不要**: Strategy B（完全分離）アーキテクチャ
- **安全性**: VM2サンドボックスによる動的コード実行の隔離
- **永続化**: LibSQLデータベースによるエージェント定義の永続化

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| **言語** | TypeScript |
| **ランタイム** | Node.js 18+ |
| **フレームワーク** | VoltAgent, Express |
| **データベース** | LibSQL (Turso) |
| **サンドボックス** | VM2 |
| **LLMプロキシ** | LiteLLM（オプション） |
| **テスト** | Jest |

## ディレクトリ構造

```
mag-tonaka/
├── CLAUDE.md                    # このファイル
├── .gitignore
├── apps/
│   └── server/                  # メインサーバーアプリケーション
│       ├── src/
│       │   ├── index.ts         # エントリーポイント
│       │   ├── agents/          # 静的エージェント
│       │   ├── dynamic/         # 動的エージェントシステム（新規）
│       │   │   ├── dynamicSystem.ts
│       │   │   ├── managers/
│       │   │   ├── agents/
│       │   │   ├── tools/
│       │   │   ├── storage/
│       │   │   └── api/
│       │   ├── integrations/    # 統合モジュール
│       │   ├── orchestrator/    # オーケストレーター
│       │   └── services/        # サービス層
│       ├── package.json
│       └── tsconfig.json
├── docs/                        # ドキュメント
│   ├── DYNAMIC_AGENT_ARCHITECTURE.md
│   ├── LITELLM_SETUP.md
│   └── dynamic-agent-system/    # 詳細設計ドキュメント
│       ├── README.md
│       ├── 01-requirements.md   # 要件定義
│       ├── 02-architecture.md   # アーキテクチャ設計
│       ├── 03-database-design.md
│       ├── 04-api-specification.md
│       ├── 05-security-design.md
│       ├── 06-implementation-guide.md
│       ├── 07-test-plan.md
│       └── 08-deployment-guide.md
├── memo/                        # メモ（.gitignore対象）
└── pre-projct-docs/             # プロジェクト前ドキュメント
```

## 開発コマンド

```bash
# サーバーディレクトリに移動
cd apps/server

# 開発サーバー起動
npm run dev

# マルチエージェントモードで起動
npm run dev:multiagent

# ビルド
npm run build

# テスト実行
npm test

# 統合テスト
npm run test:integration

# カバレッジ付きテスト
npm run test:coverage

# DBマイグレーション
npm run migrate

# リント
npm run lint

# フォーマット
npm run format
```

## アーキテクチャ

### Strategy B: 完全分離アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                     既存システム（変更なし）                    │
├─────────────────────────────────────────────────────────────┤
│ - memory.db                                                 │
│ - agentService.ts                                           │
│ - agents/ (chat, admin, agentGenerator)                     │
│ - API: /api/agents/...                                      │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          │ 統合ポイント（index.ts 3行のみ）
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                  動的エージェントシステム（新規）                 │
├─────────────────────────────────────────────────────────────┤
│ - dynamic_agents.db                                         │
│ - src/dynamic/                                              │
│ - API: /api/v2/dynamic-agents/...                           │
└─────────────────────────────────────────────────────────────┘
```

### 主要コンポーネント

| コンポーネント | 責務 |
|--------------|------|
| `DynamicSystem` | エントリーポイント、初期化 |
| `DynamicAgentManager` | エージェントライフサイクル管理 |
| `DynamicAgentCreator` | エージェントインスタンス生成 |
| `DynamicToolExecutor` | ツールのサンドボックス実行 |
| `DynamicAgentStorage` | DB操作（dynamic_agents.db） |
| `DynamicAgentRegistry` | インメモリキャッシュ |

## データベース

### 分離戦略

- **memory.db**: 既存システム用（変更なし）
- **dynamic_agents.db**: 動的エージェント専用（完全分離）

### 主要テーブル

- `dynamic_agents` - エージェント定義
- `dynamic_tools` - ツール定義
- `agent_tools` - エージェント-ツール関連
- `agent_test_examples` - テスト例
- `dynamic_agent_audit` - 監査ログ

## API

### 静的エージェント（既存）
- `GET /api/agents` - エージェント一覧
- `POST /api/agents/:agentId/execute` - エージェント実行

### 動的エージェント（新規）
- `POST /api/v2/dynamic-agents` - エージェント作成
- `GET /api/v2/dynamic-agents` - 動的エージェント一覧
- `GET /api/v2/dynamic-agents/:id` - エージェント詳細
- `PUT /api/v2/dynamic-agents/:id` - エージェント更新
- `DELETE /api/v2/dynamic-agents/:id` - エージェント削除

## セキュリティ

### サンドボックス（VM2）

動的ツールはVM2サンドボックス内で実行：
- タイムアウト: 5秒
- 許可API: `fetch`, `console`
- 禁止: `require`, `process`, `fs`等

### 認証・認可

- API keyベースの認証
- ユーザーロールによる認可

## 環境変数

```bash
# .env（apps/server/.env）
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# LiteLLM使用時（オプション）
LITELLM_BASE_URL=http://localhost:4000/v1
LITELLM_API_KEY=sk-1234

# フィーチャーフラグ
ENABLE_DYNAMIC_AGENTS=true
ENABLE_DYNAMIC_TOOLS=true
```

## LiteLLM統合

複数のLLMプロバイダー（Anthropic Claude、OpenAI GPT、Google Gemini等）を統一インターフェースで利用可能。

詳細: `docs/LITELLM_SETUP.md`

## 開発ガイドライン

### テスト駆動開発（TDD）

機能追加の際には**必ず**t_wada(和田卓人)の推奨する方法でテスト駆動開発(TDD)を行うこと。

#### Red-Green-Refactorサイクル

```
1. Red（失敗するテストを書く）
   - 実装前に、期待する振る舞いを定義するテストを書く
   - テストが失敗することを確認する（これが重要）

2. Green（テストを通す最小限のコードを書く）
   - テストを通すことだけを目的とした最小限の実装を行う
   - 美しさや効率は考えない

3. Refactor（リファクタリング）
   - テストが通る状態を維持しながらコードを改善
   - 重複の除去、可読性の向上、設計の改善
```

#### TDDの原則

- **テストファースト**: 実装コードより先にテストを書く
- **小さなステップ**: 一度に1つのテストケースだけに集中
- **テストが通るまで次に進まない**: Greenになるまでリファクタリングしない
- **仮実装から始める**: 最初は定数を返すだけでも良い

#### テストの構造（AAA パターン）

```typescript
describe('機能名', () => {
  it('期待する振る舞いの説明', () => {
    // Arrange（準備）
    const input = createTestInput();

    // Act（実行）
    const result = targetFunction(input);

    // Assert（検証）
    expect(result).toEqual(expectedOutput);
  });
});
```

### Playwright MCP によるE2Eテスト

新機能を実装した際には**必ず**Playwright MCPを利用してE2Eテストを実施すること。

#### Playwright MCPの利用方法

```
1. ブラウザを開く
   - mcp__playwright__browser_navigate でURLに移動

2. ページの状態を確認
   - mcp__playwright__browser_snapshot でアクセシビリティスナップショットを取得
   - スクリーンショットより snapshot を優先的に使用

3. 要素を操作
   - mcp__playwright__browser_click でクリック
   - mcp__playwright__browser_type でテキスト入力
   - mcp__playwright__browser_fill_form でフォーム入力

4. 結果を検証
   - mcp__playwright__browser_snapshot で状態確認
   - mcp__playwright__browser_console_messages でエラー確認
```

#### E2Eテストで確認すべき項目

- ページが正常に読み込まれること
- UIコンポーネントが正しく表示されること
- ユーザー操作に対して期待通りの動作をすること
- コンソールにエラーが出力されていないこと
- APIレスポンスが正常であること

### コーディング規約

- TypeScript厳格モード
- ESLint / Prettier使用
- テストカバレッジ > 80%

### 新しいエージェント追加

1. **静的エージェント**: `apps/server/src/agents/`にファイル追加
2. **動的エージェント**: API経由で登録

### コミット規約

```
feat: 新機能追加
fix: バグ修正
docs: ドキュメント更新
refactor: リファクタリング
test: テスト追加・修正
```

## トラブルシューティング

### サーバーが起動しない

1. `node_modules`を確認: `npm install`
2. `.env`ファイルを確認
3. Node.js 18+であることを確認

### 動的エージェントが復元されない

1. `dynamic_agents.db`の存在確認
2. `ENABLE_DYNAMIC_AGENTS=true`を確認
3. マイグレーション実行: `npm run migrate`

### ツール実行がタイムアウトする

- VM2のデフォルトタイムアウトは5秒
- 長時間処理が必要な場合は設計見直し

## 禁止事項（Claude Codeがしてはいけないこと）

以下の行為は**絶対に禁止**です。

### テスト・検証に関する禁止事項

- `open` コマンドを使用したブラウザテスト
- `say` コマンドなど音声出力を伴うテスト
- GUIアプリケーションの直接起動によるテスト
- ユーザーの手動操作を必要とするテスト方法の採用

### コード・ファイル操作に関する禁止事項

- テストを書かずに機能を実装すること
- 既存のテストを削除または無効化すること
- `.env` ファイルや認証情報をコミットすること
- `node_modules` や生成されたファイルをコミットすること
- ユーザーの許可なくファイルを削除すること

### 開発プロセスに関する禁止事項

- TDDサイクル（Red-Green-Refactor）をスキップすること
- Playwright MCPを使わずにE2Eテストを完了とすること
- テストが失敗した状態でコードをコミットすること
- 動作確認をせずに「完了」と報告すること

### セキュリティに関する禁止事項

- 外部APIキーやシークレットをコードにハードコードすること
- ユーザー入力を検証せずにコマンドを実行すること
- 本番環境のデータベースに直接接続すること
- 認証・認可をバイパスするコードを書くこと

### その他の禁止事項

- ユーザーの質問に対して推測で回答すること（不明な場合は確認する）
- 過度に複雑なソリューションを提案すること
- ドキュメントを更新せずに仕様を変更すること
- ユーザーの意図を確認せずに大規模な変更を行うこと

## ドキュメント参照

詳細な設計・実装情報は`docs/`ディレクトリを参照：

- [動的エージェントシステム概要](docs/dynamic-agent-system/README.md)
- [要件定義](docs/dynamic-agent-system/01-requirements.md)
- [アーキテクチャ設計](docs/dynamic-agent-system/02-architecture.md)
- [データベース設計](docs/dynamic-agent-system/03-database-design.md)
- [API仕様](docs/dynamic-agent-system/04-api-specification.md)
- [セキュリティ設計](docs/dynamic-agent-system/05-security-design.md)
- [実装ガイド](docs/dynamic-agent-system/06-implementation-guide.md)
- [テスト計画](docs/dynamic-agent-system/07-test-plan.md)
- [デプロイガイド](docs/dynamic-agent-system/08-deployment-guide.md)
- [LiteLLMセットアップ](docs/LITELLM_SETUP.md)

## バージョン

| 項目 | バージョン |
|-----|----------|
| プロジェクト | 1.0.0 |
| Node.js | 18+ |
| TypeScript | 5.3+ |
