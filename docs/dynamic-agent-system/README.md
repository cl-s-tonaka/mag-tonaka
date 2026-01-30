# 動的エージェントシステム ドキュメント

## 概要

このドキュメントセットは、静的なGitHub PRベースのエージェント生成から、APIを経由した動的エージェント登録アーキテクチャへの移行を実現するための包括的な設計・実装ガイドです。

**アーキテクチャ戦略**: Strategy B（0から新規構築）

既存システムに影響を与えず、完全に独立した`src/dynamic/`ディレクトリで新システムを構築し、最小限の統合ポイントで既存システムと接続します。

## 目的

- **再起動不要**: 新しいエージェントとツールを即座に追加可能
- **基盤コード変更不要**: 既存システムに影響を与えない
- **安全性**: 完全な障害分離とロールバック機能
- **スケーラビリティ**: 段階的ロールアウトとフィーチャーフラグ対応

## ドキュメント構成

### 1. 要件・設計フェーズ

| ドキュメント | 説明 | 対象読者 |
|-------------|------|----------|
| [01-requirements.md](./01-requirements.md) | ビジネス要件、機能要件、非機能要件 | PM, アーキテクト, 開発者 |
| [02-architecture.md](./02-architecture.md) | システムアーキテクチャ、コンポーネント設計 | アーキテクト, 開発者 |
| [03-database-design.md](./03-database-design.md) | データベーススキーマ、ERD、マイグレーション | データベース管理者, 開発者 |
| [04-api-specification.md](./04-api-specification.md) | REST APIエンドポイント、リクエスト/レスポンス | フロントエンド開発者, バックエンド開発者 |
| [05-security-design.md](./05-security-design.md) | セキュリティ脅威分析、対策、サンドボックス戦略 | セキュリティエンジニア, 開発者 |

### 2. 実装・テストフェーズ

| ドキュメント | 説明 | 対象読者 |
|-------------|------|----------|
| [06-implementation-guide.md](./06-implementation-guide.md) | ファイル構成、クラス設計、実装手順 | 開発者 |
| [07-test-plan.md](./07-test-plan.md) | テスト戦略、テストケース、テストシナリオ | QAエンジニア, 開発者 |

### 3. デプロイ・運用フェーズ

| ドキュメント | 説明 | 対象読者 |
|-------------|------|----------|
| [08-deployment-guide.md](./08-deployment-guide.md) | デプロイ手順、フィーチャーフラグ、ロールバック | DevOps, SRE |

### 4. 参考資料

| ドキュメント | 説明 |
|-------------|------|
| [diagrams/](./diagrams/) | アーキテクチャ図、シーケンス図、ERD（Mermaid形式） |

## 用語集

### システム関連

| 用語 | 説明 |
|------|------|
| **静的エージェント** | コードベースに直接実装され、GitHub PR経由でデプロイされるエージェント（例: chat, admin, agentGenerator） |
| **動的エージェント** | API経由で登録され、データベースに保存される、再起動不要のエージェント |
| **VoltAgent** | 基盤となるエージェントフレームワーク |
| **Strategy B** | 既存システムから独立した新システムを構築するアーキテクチャアプローチ |

### コンポーネント

| 用語 | 説明 |
|------|------|
| **DynamicAgentManager** | 動的エージェントのライフサイクル管理を担当するコアサービス |
| **DynamicAgentCreator** | エージェント定義からAgentインスタンスを生成するクラス |
| **DynamicToolExecutor** | 動的ツールをサンドボックス環境で安全に実行するクラス |
| **DynamicAgentStorage** | dynamic_agents.dbへのデータアクセス層 |

### データベース

| 用語 | 説明 |
|------|------|
| **memory.db** | 既存システムが使用する静的データベース（変更なし） |
| **dynamic_agents.db** | 動的エージェントシステム専用の新規データベース（完全分離） |

### API

| 用語 | 説明 |
|------|------|
| **/api/agents** | 既存の静的エージェント用APIエンドポイント（変更なし） |
| **/api/v2/dynamic-agents** | 動的エージェント用の新規APIネームスペース |

### セキュリティ

| 用語 | 説明 |
|------|------|
| **VM2** | Node.js用のサンドボックス実行環境（MVP段階で使用） |
| **Worker Threads** | Node.jsのマルチスレッド機能（プロダクション推奨） |
| **サンドボックス** | 動的コード実行を隔離し、システムリソースへのアクセスを制限する環境 |

## アーキテクチャ概要

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
│   ├── dynamicSystem.ts                                      │
│   ├── managers/DynamicAgentManager.ts                       │
│   ├── agents/DynamicAgentCreator.ts                         │
│   ├── tools/DynamicToolExecutor.ts                          │
│   └── storage/DynamicAgentStorage.ts                        │
│ - API: /api/v2/dynamic-agents/...                           │
└─────────────────────────────────────────────────────────────┘
```

## 使用ガイド

### フェーズ1: 理解（1日）

1. **README.md**（このファイル）を読んで全体像を把握
2. **[01-requirements.md](./01-requirements.md)** でビジネス要件を理解
3. **[02-architecture.md](./02-architecture.md)** でシステム設計を理解
4. **[diagrams/](./diagrams/)** で図表を確認

### フェーズ2: 設計レビュー（0.5日）

1. **[03-database-design.md](./03-database-design.md)** でDB設計を確認
2. **[04-api-specification.md](./04-api-specification.md)** でAPI仕様を確認
3. **[05-security-design.md](./05-security-design.md)** でセキュリティ対策を確認
4. Stakeholderと設計を承認

### フェーズ3: 実装（1-2週間）

1. **[06-implementation-guide.md](./06-implementation-guide.md)** に従って実装
   - Phase 1: 隔離環境で構築（第1週）
   - Phase 2: 統合（第2週）
2. **[07-test-plan.md](./07-test-plan.md)** に従ってテスト実行

### フェーズ4: デプロイ（1週間）

1. **[08-deployment-guide.md](./08-deployment-guide.md)** に従ってデプロイ
   - フィーチャーフラグ設定
   - 段階的ロールアウト
   - モニタリング設定

## 開発環境セットアップ

### 前提条件

- Node.js 18+
- LibSQL/Turso CLI
- Git

### 依存関係のインストール

```bash
npm install vm2 @types/vm2
```

### 開発サーバー起動

```bash
npm run dev
```

### テスト実行

```bash
npm test
```

## 主要な設計判断

### なぜStrategy B（新規構築）なのか？

| 評価項目 | Strategy A（修正） | Strategy B（新規） | 理由 |
|---------|------------------|------------------|------|
| **安全性** | 4/10 | 9/10 | 既存システムへの影響を完全に排除 |
| **ロールバック** | 困難 | 簡単（フォルダ削除のみ） | プロダクション環境で重要 |
| **テスト分離** | 不可 | 可能 | 回帰テスト不要、独立テスト可能 |
| **メンテナンス** | 3/10 | 9/10 | 明確な責任分離 |
| **段階的デプロイ** | 不可 | 可能 | フィーチャーフラグ対応 |

### なぜ専用データベース（dynamic_agents.db）なのか？

1. **障害分離**: 動的システムのDB問題が既存システムに影響しない
2. **独立監視**: 動的エージェントのパフォーマンスを別途監視可能
3. **簡単なロールバック**: DBファイル削除のみで完全削除
4. **マイグレーション安全**: 既存DB構造に影響を与えない

### なぜ新規APIネームスペース（/api/v2/）なのか？

1. **バージョニング**: 将来的な破壊的変更に対応
2. **明確な分離**: 静的エージェントAPIと動的エージェントAPIの区別
3. **並行運用**: PR方式と動的方式を同時運用して比較可能

## リスクと対策

| リスク | 重要度 | 対策 | ドキュメント |
|-------|-------|------|-------------|
| **任意コード実行** | 致命的 | VM2サンドボックス、Worker Threads | [05-security-design.md](./05-security-design.md) |
| **統合失敗** | 高 | 段階的統合、フィーチャーフラグ | [08-deployment-guide.md](./08-deployment-guide.md) |
| **パフォーマンス劣化** | 中 | 遅延ロード、キャッシング | [02-architecture.md](./02-architecture.md) |
| **実装期間超過** | 中 | MVPファーストアプローチ | [06-implementation-guide.md](./06-implementation-guide.md) |

## 成功基準

### MVP（3-4日）

- [ ] 動的エージェントの作成・保存・実行
- [ ] サーバー再起動後も永続化
- [ ] 基本的な動的ツール実行
- [ ] VM2サンドボックス動作

### フル実装（2-3週間）

- [ ] 完全なCRUD API
- [ ] フィーチャーフラグ対応
- [ ] 段階的ロールアウト成功
- [ ] プロダクション環境で安定動作
- [ ] 監視・ログ・アラート設定完了

## サポート

### 質問・問題報告

- GitHub Issues
- 開発チームSlackチャンネル

### ドキュメント更新

このドキュメントは実装と同期して更新してください。

```bash
# ドキュメントの更新をコミット
git add apps/server/docs/dynamic-agent-system/
git commit -m "docs: Update dynamic agent system documentation"
```

## 参考資料

### 内部リンク

- [AgentGeneratorAgent実装](../../src/agents/AgentGeneratorAgent_local.ts)
- [VoltAgentフレームワーク](../../src/voltAgent/)
- [既存agentService](../../src/services/agentService.ts)

### 外部リンク

- [VM2 Documentation](https://github.com/patriksimek/vm2)
- [Node.js Worker Threads](https://nodejs.org/api/worker_threads.html)
- [LibSQL Documentation](https://docs.turso.tech/libsql)

## バージョン履歴

| バージョン | 日付 | 変更内容 |
|----------|------|---------|
| 1.0.0 | 2026-01-29 | 初版作成 |

---

**Next Steps**: [01-requirements.md](./01-requirements.md) を読んで要件定義を確認してください。
