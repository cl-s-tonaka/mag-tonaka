# 実装計画

## フェーズ1（第一段階）✅ 完了

### 1. 基本機能実装
1. ✅ 仕様書確定
2. ✅ Next.js UI（チャット＋モード切替）実装
3. ✅ タブナビゲーション実装（チャット・エージェント一覧）
4. ✅ VoltAgentの標準APIとの接続
5. ✅ VoltAgent Supervisor 実装（VoltAgent側）
6. ✅ LocalDocsAgent + Tool 実装（VoltAgent側）

### 2. API Routes実装（プロキシ）
1. ✅ POST `/api/chat` - チャットメッセージのプロキシ
2. ✅ GET `/api/agents` - エージェント一覧のプロキシ
3. ✅ 環境変数管理（VOLTAGENT_API_URL）
4. ✅ エラーハンドリング統一

### 3. エージェント一覧機能
1. ✅ AgentList.tsxコンポーネント作成
2. ✅ エージェント一覧表示（左パネル）
3. ✅ エージェント詳細表示（右パネル）
4. ✅ 更新ボタン実装
5. ✅ VoltAgent APIとの連携

### 4. コード品質改善
1. ✅ ハードコーディングされたURL削除
2. ✅ 環境変数による設定管理
3. ✅ 型定義の整備（AgentInfo, AgentTool, AgentMemory）

## 受け入れ条件（DoD）
- ✅ VoltAgent API Routes（`/api/chat`, `/api/agents`）が正常に動作する
- ✅ フロントエンドで`toolResults`から`sources`を抽出できる
- ✅ CHATモードでVoltAgentが正常に動作する
- ✅ AGENT_BUILDモードで未実装メッセージが表示される
- ✅ ナレッジヒット時に`locator`（ファイルパス）が返る
- ✅ エージェント一覧が取得・表示できる
- ✅ エージェント詳細情報が表示できる
- ✅ タブ切替が正常に動作する
- ✅ 環境変数でVoltAgentのURLを管理できる

## フェーズ2（将来拡張）

### 1. AGENT_BUILDモードの実装

**詳細設計**: [08_agent_generator_design.md](./08_agent_generator_design.md) ,[09_implementation_guide.md](./09_implementation_guide.md)を参照

#### フェーズ2.1: 基本機能（MVP）
- [ ] AgentGeneratorエージェントの実装
  - [ ] 要求分析機能
  - [ ] エージェント設計書生成機能
  - [ ] 既存ツール一覧取得機能
- [ ] エージェント設計書UI
  - [ ] 設計書表示コンポーネント
  - [ ] 承認・却下ボタン
  - [ ] 修正依頼機能
- [ ] CodeGeneratorツールの実装
  - [ ] テンプレートベースのコード生成
  - [ ] エージェントファイル生成
  - [ ] ツールファイル生成
  - [ ] index.ts更新ロジック
- [ ] コードプレビューUI
  - [ ] シンタックスハイライト表示
  - [ ] ファイル一覧表示
  - [ ] Diff表示
- [ ] ローカルデプロイ機能
  - [ ] ファイル書き込み
  - [ ] VoltAgent再起動

#### フェーズ2.2: GitHub連携
- [ ] GitHub API統合
  - [ ] Octokit セットアップ
  - [ ] 認証フロー
- [ ] PR作成機能
  - [ ] ブランチ作成
  - [ ] ファイルコミット
  - [ ] PR作成・説明文生成
- [ ] デプロイUI
  - [ ] デプロイ方法選択（ローカル/GitHub）
  - [ ] PR URLの表示
  - [ ] デプロイ状況の表示

### 2. 高度な機能
- [ ] エージェントのステータス監視
- [ ] エージェントの動的な追加・削除

### 3. 追加エージェント
- [ ] GoogleDriveAgent
- [ ] FormatterAgent（マスキング・整形）
- [ ] OrganizerAgent（整理提案）
- [ ] GitHubAgent（エージェント作成）

### 4. UI/UX改善
- [ ] ダークモード対応
- [ ] レスポンシブデザイン
- [ ] アクセシビリティ改善
- [ ] エラーメッセージの改善
