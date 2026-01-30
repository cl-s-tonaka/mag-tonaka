# エージェント一覧

このドキュメントは、MAGシステムに登録されているすべてのエージェントの一覧と詳細を記載しています。

## 更新履歴

- 2026-01-26: 初版作成

---

## エージェント一覧

| エージェント名 | ID | モデル | 説明 |
|--------------|-----|--------|------|
| Admin Agent | admin | gpt-4o-mini | システムの監視や管理タスクを担当 |
| Chat Agent | chat | gpt-4o-mini | ユーザーとの会話や質問応答を担当 |
| Agent Generator Agent | agentGenerator | gpt-4o | 新しいエージェントを自動生成するメタエージェント |

---

## 詳細情報

### 1. Admin Agent

**基本情報**
- **ID**: `admin`
- **クラス名**: `AdminAgent`
- **モデル**: `openai/gpt-4o-mini`
- **ファイルパス**: `apps/server/src/agents/AdminAgent.ts`

**説明**
管理エージェントです。システムの監視や管理タスクを担当します。

**利用可能なツール**
- `weatherTool` (getWeather): 天気情報の取得

**テスト例**
1. **天気情報の取得テスト**
   - 入力: "東京の天気を教えて"
   - 期待される動作: weatherToolを使用して東京の現在の天気情報を取得して返す

2. **別の都市の天気情報取得**
   - 入力: "大阪の天気はどうですか？"
   - 期待される動作: 大阪の天気情報を取得して、分かりやすく説明する

3. **未来の天気予報取得**
   - 入力: "明日の京都の天気を教えて"
   - 期待される動作: 京都の明日の天気予報を取得して返す

**使用方法**
```typescript
const adminAgent = new AdminAgent(memory);
const response = await adminAgent.execute("東京の天気を教えて");
```

---

### 2. Chat Agent

**基本情報**
- **ID**: `chat`
- **クラス名**: `ChatAgent`
- **モデル**: `openai/gpt-4o-mini`
- **ファイルパス**: `apps/server/src/agents/ChatAgent.ts`

**説明**
チャットエージェントです。ユーザーの質問に答えたり、会話を楽しんだりします。

**利用可能なツール**
- `weatherTool` (getWeather): 天気情報の取得

**テスト例**
1. **基本的な挨拶**
   - 入力: "こんにちは！"
   - 期待される動作: 友好的に挨拶を返す

2. **天気情報の取得**
   - 入力: "今日の東京の天気は？"
   - 期待される動作: weatherToolを使って東京の天気を取得し、分かりやすく説明する

3. **一般的な知識の質問**
   - 入力: "AIについて教えて"
   - 期待される動作: AIに関する基本的な情報を分かりやすく説明する

**使用方法**
```typescript
const chatAgent = new ChatAgent(memory);
const response = await chatAgent.execute("こんにちは！");
```

---

### 3. Agent Generator Agent

**基本情報**
- **ID**: `agentGenerator`
- **クラス名**: `AgentGeneratorAgent`
- **モデル**: `openai/gpt-4o`
- **ファイルパス**: `apps/server/src/agents/AgentGeneratorAgent_local.ts`

**説明**
エージェントを自動生成するメタエージェントです。ユーザーの要求を分析し、新しいエージェントを設計・生成します。

**利用可能なツール**
- `generateAgentCode`: エージェント設計書からTypeScriptコードを生成
- `writeFile`: ファイルシステムにファイルを書き込み
- `appendToFile`: 既存ファイルに内容を追記
- `applyModifications`: エージェント生成時のファイル変更を自動適用
- `previewCodeChanges`: エージェント生成時のコード変更をプレビュー
- `validateTypeScript`: 生成されたコードのTypeScript構文をチェック
- `createAgentPR`: GitHub Pull Requestを作成

**主な機能**
1. **設計書生成**: ユーザーのリクエストからJSON形式のエージェント設計書を作成
2. **コード生成**: 設計書を基にTypeScriptコードを自動生成
3. **コード検証**: 生成されたコードのプレビューとTypeScript構文チェック
4. **自動デプロイ**: 新しいエージェントファイルの作成と既存ファイルへの統合
5. **GitHub連携**: Pull Requestの自動作成（オプション）

**コード生成フロー（2ステップデプロイ）**

エージェント生成は2つのステップに分離されており、各ステップで独立した検証と承認が行われます。

**ステップ1: エージェント定義の生成**
1. ユーザーのリクエストを確認
2. 不明点があれば質問
3. 設計書（JSON）を生成して提示
4. 承認を待つ
5. `generateAgentCode`でコード生成（files[]とmodifications[]を取得）
6. **新規ファイルのみを検証**:
   - `previewCodeChanges({ newFiles: files, modifications: [] })`で新規ファイルをプレビュー
   - `validateTypeScript({ newFiles: files, modifications: [] })`で構文チェック
   - エラーがあれば設計書を修正して再試行（最大3回）
7. ユーザーに「エージェント定義のデプロイ」を確認
8. `writeFile`で新規ファイルを作成（agent、tools）
9. 完了メッセージを表示し、ステップ2への移行を確認

**ステップ2: システムへの統合**
10. **既存ファイルの変更を検証**:
    - `previewCodeChanges({ newFiles: [], modifications: modifications })`で既存ファイルの変更をプレビュー
    - `validateTypeScript({ newFiles: files, modifications: modifications })`で全体の構文チェック
    - エラーがあれば報告（この段階では自動修正不可、手動修正を依頼）
11. ユーザーに「システムへの統合」を確認
12. `applyModifications({ modifications: modifications })`で既存ファイル変更を一括適用
    - apps/server/src/agents/index.tsへのエクスポート追加
    - apps/server/src/index.tsへのインポート、インスタンス化、登録
    - apps/server/src/testExamplesRegistry.tsへのテスト例の登録
    - apps/server/src/tools/index.tsへのツールエクスポート（ツールがある場合）
13. 完了メッセージを表示

**2ステップデプロイのメリット**
- エージェント定義を先に完成させ、独立して検証できる
- システム統合を後から行える（段階的なデプロイ）
- エラーがあった場合、どちらのステップで問題があるか明確になる
- 新規ファイルだけを先にテストできる
- ユーザーが各ステップで確認・承認できる

**テスト例**
1. **JSON解析エージェントの生成**
   - 入力: "JSONファイルを解析して構造を説明するエージェントを作成してください"
   - 期待される動作: JSON解析用のエージェント設計書を作成し、ユーザーに提示する

2. **ドキュメント生成エージェントの作成**
   - 入力: "Markdown形式のドキュメントを生成するエージェントが欲しいです"
   - 期待される動作: Markdownドキュメント生成用のエージェント設計書を作成する

**使用方法**
```typescript
const agentGeneratorAgent = new AgentGeneratorAgent(memory);
const response = await agentGeneratorAgent.execute(
  "CSVファイルを分析するエージェントを作成してください"
);
```

**注意事項**
- セキュリティ: ファイル書き込みは必ずユーザーの承認後
- 命名規則の厳守: agentIdはcamelCase、classNameはPascalCase + "Agent"サフィックス
- エラーハンドリング: TypeScriptエラーが検出された場合、最大3回まで自動修正を試行

---

## エージェント登録場所

新しいエージェントを追加する際は、以下のファイルを更新する必要があります：

1. **apps/server/src/agents/[AgentName].ts** - エージェントクラスの定義
2. **apps/server/src/agents/index.ts** - エクスポート追加
3. **apps/server/src/index.ts** - インポート、インスタンス化、登録
4. **apps/server/src/testExamplesRegistry.ts** - テスト例の登録

Agent Generator Agentを使用すると、これらの変更が自動的に適用されます。

---

## 開発ガイドライン

### 新規エージェント作成時の注意点

1. **命名規則**
   - エージェントID: camelCase（例: `csvAnalyzer`, `slackBot`）
   - クラス名: PascalCase + "Agent"サフィックス（例: `CsvAnalyzerAgent`）
   - 表示名: 人間が読みやすい名前（例: `CSV Analyzer`）

2. **instructions（指示文）の書き方**
   - 1行目: エージェントの役割概要を簡潔に記述（UI表示に使用）
   - 2行目以降: 詳細な役割、タスクの進め方、使用するツール、注意事項
   - 構造化を推奨: セクション見出し（## や **）を使って整理

3. **テスト例の作成**
   - 最低2-3個のテストケースを作成
   - 入力、説明、期待される動作を明確に記述
   - エージェントの主要機能をカバー

4. **ツールの選択**
   - 必要最小限のツールのみを使用
   - 既存ツールを優先的に活用
   - 新規ツールが必要な場合は、toolsディレクトリに作成

---

## トラブルシューティング

### エージェントが正しく登録されない場合

1. `apps/server/src/agents/index.ts`にエクスポートが追加されているか確認
2. `apps/server/src/index.ts`でインポート、インスタンス化、登録が正しく行われているか確認
3. TypeScriptのビルドエラーがないか確認: `npm run build`
4. サーバーを再起動: `npm run dev`

### テスト例が表示されない場合

1. `testExamplesRegistry.ts`に登録されているか確認
2. エージェントクラスで`testExamples`パラメータが設定されているか確認
3. エクスポート名が正しいか確認（`[agentId]AgentTestExamples`の形式）

---

## 関連ドキュメント

- [ツール一覧](./tools.md)
- [API仕様](./api.md)
- [アーキテクチャ](./architecture.md)
