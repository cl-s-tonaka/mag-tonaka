# MAG ドキュメント

MAG（Multi-Agent Gateway Cursor）の設計・実装ドキュメント集です。

## ドキュメント一覧

### 基本設計
- **[01_requirements.md](./01_requirements.md)** - 要件定義書
  - プロジェクトの背景・目的
  - ゴール（最終形とMVP）
  - ユーザーストーリー
  - スコープ

- **[02_architecture.md](./02_architecture.md)** - アーキテクチャ設計
  - 全体構成図
  - コンポーネント責務
  - 画面構成
  - API設計
  - 環境変数管理

- **[03_api_spec.md](./03_api_spec.md)** - API仕様
  - Next.js API Routes（プロキシ）
  - VoltAgent API
  - データ構造
  - エラーハンドリング

- **[04_agent_design.md](./04_agent_design.md)** - エージェント設計
  - Supervisorエージェント
  - LocalDocsエージェント
  - 将来のサブエージェント

- **[05_security_and_governance.md](./05_security_and_governance.md)** - セキュリティ・ガバナンス
  - セキュリティ制約
  - 承認フロー
  - 監査ログ

### 実装・進捗管理
- **[06_implementation_plan.md](./06_implementation_plan.md)** - 実装計画
  - フェーズ1（第一段階）✅ 完了
  - フェーズ2（将来拡張）
  - 受け入れ条件（DoD）

- **[07_progress.md](./07_progress.md)** - 進捗管理
  - マイルストーン
  - 実装完了項目
  - リスク
  - Decision Log

### 高度な機能設計
- **[08_agent_generator_design.md](./08_agent_generator_design.md)** - エージェントジェネレーター設計
  - 自動エージェント生成の仕組み
  - フロー詳細
  - コンポーネント設計
  - セキュリティ・ガバナンス
  - UI設計
  - 実装優先順位

- **[09_implementation_guide.md](./09_implementation_guide.md)** - エージェントジェネレーター実装ガイド
  - 実装可能性の評価
  - 実装アプローチ
  - データ分析エージェントのテストケース
  - GitHub連携の設定手順
  - 実装手順（MVP）
  - トラブルシューティング

## プロジェクト構成

```
mag/
├── apps/
│   ├── web/           # Next.jsフロントエンド
│   │   ├── app/
│   │   │   ├── page.tsx              # メインページ（タブナビゲーション）
│   │   │   └── api/                  # API Routes（プロキシ）
│   │   │       ├── chat/route.ts     # チャットAPI
│   │   │       └── agents/route.ts   # エージェント一覧API
│   │   ├── components/
│   │   │   ├── ChatInterface.tsx     # チャット画面
│   │   │   └── AgentList.tsx         # エージェント一覧
│   │   └── types/
│   │       └── index.ts              # 型定義
│   │
│   └── server/        # VoltAgentバックエンド
│       └── src/
│           ├── index.ts              # VoltAgentエントリーポイント
│           ├── agents/               # エージェント定義
│           ├── tools/                # ツール定義
│           └── workflows/            # ワークフロー定義
│
└── docs/              # このディレクトリ
```

## 開発状況

### ✅ 完了（フェーズ1）
- チャット機能
- エージェント一覧表示
- タブナビゲーション
- API Routesプロキシ
- 環境変数管理
- 型定義

### 🔄 進行中（フェーズ2）
- AGENT_BUILDモードの実装
- エージェントジェネレーター

### 📋 計画中（将来）
- 認証・セッション管理
- GitHub連携
- 高度なエージェント機能

## クイックスタート

1. **環境変数の設定**
   ```bash
   cd apps/web
   cp .env.example .env.local
   # VOLTAGENT_API_URLを適切な値に設定
   ```

2. **依存関係のインストール**
   ```bash
   npm install
   ```

3. **VoltAgentサーバーの起動**
   ```bash
   cd apps/server
   npm run dev
   ```

4. **Next.jsの起動**
   ```bash
   cd apps/web
   npm run dev
   ```

5. **ブラウザでアクセス**
   ```
   http://localhost:3000
   ```

## 主要技術スタック

### フロントエンド
- Next.js 14 (App Router)
- React 18
- TypeScript

### バックエンド
- VoltAgent
- OpenAI API (GPT-4o-mini)
- LibSQL (SQLite互換)

### インフラ
- Node.js
- Docker（将来）

## 関連リンク

- [VoltAgent ドキュメント](https://voltagent.dev)
- [Next.js ドキュメント](https://nextjs.org/docs)

## ライセンス

（プロジェクトに応じて記載）
