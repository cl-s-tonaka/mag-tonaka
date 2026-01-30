# エージェントジェネレーター設計書

## 1. 概要

AGENT_BUILDモードにおいて、ユーザーが自然言語で「〇〇を実行するエージェントを作成してほしい」とリクエストした場合に、AIが自動的にエージェントを設計・生成・デプロイするシステム。

### 目的
- エージェント作成の民主化（非エンジニアでもエージェントを作成可能に）
- 迅速なプロトタイピング
- 一貫性のあるエージェント実装
- 安全な承認フローによる品質保証

---

## 2. アーキテクチャ

```
[ ユーザー: "Slackからメッセージを取得するエージェントを作って" ]
    |
    v
[ AGENT_BUILDモード → /api/agent-builder ]
    |
    v
[ AgentGeneratorエージェント（メタエージェント）]
    |
    | 1. 要求分析
    | 2. エージェント設計
    | 3. ツール選定
    | 4. コード生成プラン作成
    v
[ エージェント設計書（JSON）を生成 ]
    |
    | ユーザーに提示
    v
[ ユーザー承認待ち ]
    |
    | 承認
    v
[ CodeGenerator Tool ]
    |
    | - エージェントクラスファイル生成（agents/NewAgent.ts）
    | - agents/index.tsへのエクスポート追加
    | - ツールファイル生成（必要に応じて）
    | - src/index.tsへのインスタンス化・登録追加
    v
[ GitHub連携（オプション）]
    |
    | - 新規ブランチ作成
    | - ファイルコミット
    | - PR作成
    v
[ VoltAgent再起動 or 動的ロード ]
    |
    v
[ 新しいエージェントが利用可能 ]
```

### ディレクトリ構成

エージェントは以下のディレクトリ構成で管理されます：

```
apps/server/src/
├── agents/
│   ├── ChatAgent.ts          # 既存エージェント1（クラス）
│   ├── AdminAgent.ts         # 既存エージェント2（クラス）
│   ├── NewAgent.ts           # 生成されるエージェント（クラス）
│   └── index.ts              # エージェントのエクスポート
├── tools/
│   └── ...                   # ツール定義
└── index.ts                  # VoltAgentのエントリーポイント
```

**エージェント生成時の変更箇所**:
1. `agents/NewAgent.ts` - 新規エージェントクラスファイル作成
2. `agents/index.ts` - `export { NewAgent } from "./NewAgent";` を追加
3. `src/index.ts` - インポート、インスタンス化、VoltAgentへの登録を追加

この構成により、エージェントの定義が整理され、生成時の変更箇所が最小限になります。

---

## 3. フロー詳細

### 3.1 要求分析フェーズ

**入力**: ユーザーの自然言語リクエスト
```
例: "Slackからメッセージを取得して、特定のキーワードを含むものを抽出するエージェントを作成してください"
```

**AgentGeneratorが実行する処理**:
1. 要求の解析
   - 主要機能の特定（例: Slackメッセージ取得、キーワード抽出）
   - 必要なツールの特定（例: SlackAPI、テキスト検索）
   - 入出力の特定
2. 技術的実現可能性の検証
   - 必要なAPIキーやライブラリの確認
   - 既存ツールの利用可能性
3. エージェント仕様の作成

### 3.2 設計フェーズ

**出力**: エージェント設計書（JSON形式）

```json
{
  "agentSpec": {
    "name": "slackMessageFetcher",
    "displayName": "Slack Message Fetcher",
    "description": "Slackからメッセージを取得し、特定のキーワードを含むものを抽出します",
    "model": "openai/gpt-4o-mini",
    "instructions": "あなたはSlackメッセージを取得・分析するエージェントです。ユーザーが指定したチャンネルからメッセージを取得し、指定されたキーワードに一致するメッセージを抽出して報告します。",
    "tools": [
      {
        "name": "fetchSlackMessages",
        "type": "new",
        "description": "Slackチャンネルからメッセージを取得",
        "parameters": {
          "channelId": "string",
          "limit": "number",
          "after": "timestamp (optional)"
        },
        "implementation": "slack-api"
      },
      {
        "name": "searchText",
        "type": "existing",
        "description": "テキスト内からキーワードを検索"
      }
    ],
    "memory": {
      "enabled": true,
      "type": "LibSQL"
    },
    "requiredEnvVars": [
      "SLACK_BOT_TOKEN",
      "SLACK_WORKSPACE_ID"
    ]
  },
  "generatedFiles": [
    {
      "path": "apps/server/src/agents/SlackMessageFetcherAgent.ts",
      "type": "agent"
    },
    {
      "path": "apps/server/src/tools/slackTools.ts",
      "type": "tool"
    }
  ],
  "modifications": [
    {
      "path": "apps/server/src/agents/index.ts",
      "type": "add-export",
      "description": "エージェントクラスをエクスポート"
    },
    {
      "path": "apps/server/src/index.ts",
      "type": "register-agent",
      "description": "エージェントをインスタンス化してVoltAgentに登録"
    }
  ]
}
```

### 3.3 承認フェーズ

**UI表示**:
```
┌─────────────────────────────────────────┐
│ エージェント設計書                      │
├─────────────────────────────────────────┤
│ 名前: Slack Message Fetcher             │
│ 説明: Slackからメッセージを取得し...   │
│                                         │
│ 必要なツール:                           │
│ ✓ fetchSlackMessages (新規作成)        │
│ ✓ searchText (既存)                     │
│                                         │
│ 環境変数:                               │
│ ⚠ SLACK_BOT_TOKEN (未設定)             │
│ ⚠ SLACK_WORKSPACE_ID (未設定)          │
│                                         │
│ 生成されるファイル:                     │
│ - agents/SlackMessageFetcherAgent.ts    │
│ - tools/slackTools.ts                   │
│ - agents/index.ts (エクスポート追加)    │
│ - src/index.ts (登録追加)               │
│                                         │
│ [承認して作成] [修正を依頼] [キャンセル]│
└─────────────────────────────────────────┘
```

### 3.4 コード生成フェーズ

**CodeGenerator Toolが実行**:

1. **エージェントファイル生成**（クラスベース）
```typescript
// apps/server/src/agents/SlackMessageFetcherAgent.ts
import { Agent, Memory } from "@voltagent/core";
import { fetchSlackMessages, searchText } from "../tools/slackTools";

export class SlackMessageFetcherAgent extends Agent {
  constructor(memory: Memory) {
    super({
      name: "slackMessageFetcher",
      instructions: `あなたはSlackメッセージを取得・分析するエージェントです。
      ユーザーが指定したチャンネルからメッセージを取得し、
      指定されたキーワードに一致するメッセージを抽出して報告します。`,
      model: "openai/gpt-4o-mini",
      tools: [fetchSlackMessages, searchText],
      memory,
    });
  }
}
```

2. **ツールファイル生成**（必要に応じて）
```typescript
// apps/server/src/tools/slackTools.ts
import { Tool } from "@voltagent/core";
import { z } from "zod";

export const fetchSlackMessages = new Tool({
  name: "fetchSlackMessages",
  description: "Slackチャンネルからメッセージを取得",
  parameters: z.object({
    channelId: z.string(),
    limit: z.number().default(100),
    after: z.string().optional(),
  }),
  execute: async ({ channelId, limit, after }) => {
    // Slack API呼び出しロジック
    const response = await fetch(
      `https://slack.com/api/conversations.history?channel=${channelId}&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        },
      }
    );
    const data = await response.json();
    return data.messages;
  },
});
```

3. **agents/index.ts更新**（エクスポート追加）
```typescript
// apps/server/src/agents/index.ts に追加
export { ChatAgent } from "./ChatAgent";
export { AdminAgent } from "./AdminAgent";
export { SlackMessageFetcherAgent } from "./SlackMessageFetcherAgent"; // 追加
```

4. **src/index.ts更新**（インスタンス化と登録）
```typescript
// apps/server/src/index.ts に追加
import { ChatAgent, AdminAgent, SlackMessageFetcherAgent } from "./agents";

// Memory設定は既存のものを使用
const memory = new Memory({ /* ... */ });

const chatAgent = new ChatAgent(memory);
const adminAgent = new AdminAgent(memory);
const slackMessageFetcherAgent = new SlackMessageFetcherAgent(memory); // 追加

new VoltAgent({
  agents: {
    chatAgent,
    adminAgent,
    slackMessageFetcherAgent, // 追加
  },
  // ...
});
```

### 3.5 デプロイフェーズ

**オプション1: 自動デプロイ（開発環境）**
- ファイルを直接生成
- VoltAgentサーバーを再起動
- エージェント一覧に表示

**オプション2: GitHub連携（本番環境）**
1. 新規ブランチ作成: `feature/add-slack-message-fetcher-agent`
2. ファイルをコミット
3. PRを作成
4. レビュー・承認待ち
5. マージ後、自動デプロイ

---

## 4. コンポーネント設計

### 4.1 AgentGeneratorエージェント

```typescript
const agentGenerator = new Agent({
  name: "agentGenerator",
  instructions: `あなたはエージェントを自動生成するメタエージェントです。

  ユーザーの要求を分析し、以下を実行してください：
  1. 要求の解析と機能の特定
  2. 必要なツールの特定（既存ツール or 新規作成が必要）
  3. エージェント設計書（JSON）の作成
  4. 技術的実現可能性の検証
  5. 必要な環境変数やライブラリの特定

  設計書は必ずJSON形式で出力してください。
  ユーザーに分かりやすく説明し、承認を得てください。`,
  model: "openai/gpt-4o",
  tools: [
    analyzeRequirementsTool,
    listExistingToolsTool,
    validateFeasibilityTool,
    generateSpecTool,
  ],
  memory,
});
```

### 4.2 CodeGeneratorツール

```typescript
const codeGeneratorTool = new Tool({
  name: "generateAgentCode",
  description: "エージェント設計書からTypeScriptコードを生成",
  parameters: z.object({
    spec: z.object({
      name: z.string(),
      displayName: z.string(),
      description: z.string(),
      model: z.string(),
      instructions: z.string(),
      tools: z.array(z.any()),
      // ...
    }),
  }),
  execute: async ({ spec }) => {
    // コード生成ロジック
    const agentCode = generateAgentFile(spec);
    const toolCodes = generateToolFiles(spec.tools);
    const indexUpdate = generateIndexUpdate(spec.name);

    return {
      files: [
        { path: `agents/${spec.name}.ts`, content: agentCode },
        ...toolCodes,
      ],
      modifications: [
        { path: "index.ts", content: indexUpdate },
      ],
    };
  },
});
```

### 4.3 FileWriterツール

```typescript
const fileWriterTool = new Tool({
  name: "writeFile",
  description: "ファイルシステムにファイルを書き込む（承認後のみ）",
  parameters: z.object({
    path: z.string(),
    content: z.string(),
    mode: z.enum(["create", "update", "append"]),
  }),
  execute: async ({ path, content, mode }) => {
    // セキュリティチェック
    if (!isApprovedPath(path)) {
      throw new Error("Unauthorized path");
    }

    // ファイル書き込み
    await fs.writeFile(path, content);
    return { success: true, path };
  },
});
```

### 4.4 GitHubツール

```typescript
const createPRTool = new Tool({
  name: "createGitHubPR",
  description: "GitHubにPRを作成",
  parameters: z.object({
    branchName: z.string(),
    title: z.string(),
    description: z.string(),
    files: z.array(z.object({
      path: z.string(),
      content: z.string(),
    })),
  }),
  execute: async ({ branchName, title, description, files }) => {
    // GitHub API呼び出し
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    // 1. ブランチ作成
    await octokit.git.createRef({
      owner: "your-org",
      repo: "your-repo",
      ref: `refs/heads/${branchName}`,
      sha: await getMainSha(),
    });

    // 2. ファイルコミット
    for (const file of files) {
      await octokit.repos.createOrUpdateFileContents({
        owner: "your-org",
        repo: "your-repo",
        path: file.path,
        message: `Add ${file.path}`,
        content: Buffer.from(file.content).toString("base64"),
        branch: branchName,
      });
    }

    // 3. PR作成
    const pr = await octokit.pulls.create({
      owner: "your-org",
      repo: "your-repo",
      title,
      body: description,
      head: branchName,
      base: "main",
    });

    return { success: true, prUrl: pr.data.html_url };
  },
});
```

---

## 5. データ構造

### 5.1 エージェント設計書（AgentSpec）

```typescript
interface AgentSpec {
  name: string;              // エージェントID（camelCase）
  displayName: string;       // 表示名
  description: string;       // 説明
  model: string;             // 使用するLLMモデル
  instructions: string;      // エージェントへの指示
  tools: ToolSpec[];         // 使用するツール
  memory: MemoryConfig;      // メモリ設定
  requiredEnvVars: string[]; // 必要な環境変数
}

interface ToolSpec {
  name: string;
  type: "existing" | "new"; // 既存ツール or 新規作成
  description: string;
  parameters?: Record<string, string>;
  implementation?: string;   // 実装方法（API名など）
}

interface MemoryConfig {
  enabled: boolean;
  type: "LibSQL" | "InMemory";
  options?: Record<string, any>;
}
```

### 5.2 生成リクエスト（AgentGenerationRequest）

```typescript
interface AgentGenerationRequest {
  userId: string;
  request: string;           // ユーザーの自然言語リクエスト
  mode: "auto" | "guided";   // 自動生成 or ガイド付き
  deploymentMode: "local" | "github"; // デプロイ方法
}
```

### 5.3 生成結果（AgentGenerationResult）

```typescript
interface AgentGenerationResult {
  spec: AgentSpec;
  generatedFiles: GeneratedFile[];
  modifications: FileModification[];
  status: "pending_approval" | "approved" | "rejected" | "deployed";
  deploymentInfo?: {
    prUrl?: string;
    branch?: string;
    deployedAt?: string;
  };
}

interface GeneratedFile {
  path: string;
  content: string;
  type: "agent" | "tool" | "config";
}

interface FileModification {
  path: string;
  type: "add-export" | "register-agent" | "add-import" | "update-config";
  description: string;
  diff: string;
}
```

---

## 6. セキュリティ・ガバナンス

### 6.1 承認フロー

**必須承認項目**:
- エージェント設計書の確認
- 生成されるコードのプレビュー
- 必要な環境変数の確認
- ファイルシステムへの書き込み許可

**承認プロセス**:
```
1. エージェント設計書を生成
2. ユーザーに提示
3. ユーザーが承認 or 却下 or 修正依頼
4. 承認後にコード生成
5. 生成されたコードをプレビュー表示
6. ユーザーが最終承認
7. デプロイ実行
```

### 6.2 セキュリティ制約

**許可される操作**:
- `apps/server/src/agents/` 配下への新規エージェントクラスファイル作成
- `apps/server/src/agents/index.ts` への追記（エクスポート部分のみ）
- `apps/server/src/tools/` 配下へのツールファイル作成
- `apps/server/src/index.ts` への追記（エージェントのインポート・インスタンス化・登録部分のみ）

**禁止される操作**:
- システムファイルの変更
- 環境変数ファイル（.env）の直接変更
- 既存エージェントの上書き（警告を出して確認）
- 任意のシェルコマンド実行

**コード検証**:
- 生成されたコードの静的解析（ESLint、TypeScript）
- 危険なコードパターンの検出（eval、exec等）
- 依存関係の検証（未知のパッケージの使用検出）

### 6.3 監査ログ

```typescript
interface AuditLog {
  timestamp: string;
  userId: string;
  action: "generate" | "approve" | "reject" | "deploy";
  agentName: string;
  spec: AgentSpec;
  result: "success" | "failure";
  error?: string;
}
```

---

## 7. UI設計

### 7.1 エージェント作成フロー

**ステップ1: リクエスト入力**
```
┌─────────────────────────────────────────┐
│ エージェント作成モード                  │
├─────────────────────────────────────────┤
│ どのようなエージェントを作成しますか？  │
│                                         │
│ [テキスト入力エリア]                    │
│ 例: Slackからメッセージを取得して、     │
│     特定のキーワードを含むものを        │
│     抽出するエージェント                │
│                                         │
│ [分析開始]                              │
└─────────────────────────────────────────┘
```

**ステップ2: 設計書確認**
```
┌─────────────────────────────────────────┐
│ エージェント設計書                      │
├─────────────────────────────────────────┤
│ 📋 基本情報                             │
│ 名前: Slack Message Fetcher             │
│ 説明: Slackからメッセージを取得...     │
│ モデル: GPT-4o-mini                     │
│                                         │
│ 🔧 ツール                               │
│ ✓ fetchSlackMessages (新規)            │
│   - Slackチャンネルからメッセージ取得  │
│ ✓ searchText (既存)                     │
│   - テキスト内キーワード検索            │
│                                         │
│ ⚙️ 環境変数                             │
│ ⚠ SLACK_BOT_TOKEN (未設定)             │
│ ⚠ SLACK_WORKSPACE_ID (未設定)          │
│                                         │
│ 📁 生成ファイル                         │
│ - agents/slackMessageFetcher.ts         │
│ - tools/slackTools.ts                   │
│                                         │
│ [承認] [修正依頼] [キャンセル]          │
└─────────────────────────────────────────┘
```

**ステップ3: コードプレビュー**
```
┌─────────────────────────────────────────┐
│ 生成されるコード                        │
├─────────────────────────────────────────┤
│ [agents/SlackMessageFetcherAgent.ts]    │
│ [agents/index.ts への追記]              │
│ [tools/slackTools.ts]                   │
│ [src/index.ts への追記]                 │
│                                         │
│ [コード表示エリア - シンタックスハイライト]│
│                                         │
│ [デプロイ方法を選択]                    │
│ ( ) ローカルに直接デプロイ              │
│ (*) GitHubにPR作成                      │
│                                         │
│ [デプロイ実行] [戻る]                   │
└─────────────────────────────────────────┘
```

**ステップ4: デプロイ結果**
```
┌─────────────────────────────────────────┐
│ デプロイ完了 ✓                          │
├─────────────────────────────────────────┤
│ エージェント "Slack Message Fetcher" が │
│ 正常に作成されました。                  │
│                                         │
│ PR URL:                                 │
│ https://github.com/org/repo/pull/123    │
│                                         │
│ 次のステップ:                           │
│ 1. PRをレビュー                         │
│ 2. 環境変数を設定                       │
│    - SLACK_BOT_TOKEN                    │
│    - SLACK_WORKSPACE_ID                 │
│ 3. PRをマージしてデプロイ               │
│                                         │
│ [エージェント一覧へ] [チャットに戻る]  │
└─────────────────────────────────────────┘
```

---

## 8. API設計

### 8.1 POST /api/agent-builder/analyze

エージェント作成リクエストを分析

**Request**:
```json
{
  "request": "Slackからメッセージを取得するエージェントを作成",
  "mode": "guided"
}
```

**Response**:
```json
{
  "spec": { /* AgentSpec */ },
  "feasibility": "feasible" | "needs_clarification" | "not_feasible",
  "questions": [
    "どのSlackチャンネルからメッセージを取得しますか？",
    "メッセージの取得期間を指定しますか？"
  ],
  "warnings": [
    "SLACK_BOT_TOKENが必要です"
  ]
}
```

### 8.2 POST /api/agent-builder/generate

エージェントコードを生成

**Request**:
```json
{
  "spec": { /* AgentSpec */ },
  "approved": true
}
```

**Response**:
```json
{
  "files": [
    {
      "path": "agents/slackMessageFetcher.ts",
      "content": "/* TypeScript code */"
    }
  ],
  "modifications": [ /* ... */ ],
  "status": "pending_deployment"
}
```

### 8.3 POST /api/agent-builder/deploy

エージェントをデプロイ

**Request**:
```json
{
  "agentId": "slackMessageFetcher",
  "deploymentMode": "github",
  "branchName": "feature/add-slack-agent"
}
```

**Response**:
```json
{
  "success": true,
  "prUrl": "https://github.com/org/repo/pull/123",
  "branch": "feature/add-slack-agent"
}
```

---

## 9. 実装優先順位

### フェーズ1: 基本機能（MVP）
- [ ] AgentGeneratorエージェントの実装
- [ ] エージェント設計書生成機能
- [ ] 承認UI（フロントエンド）
- [ ] コード生成機能（テンプレートベース）
- [ ] ローカルデプロイ機能

### フェーズ2: GitHub連携
- [ ] GitHub API統合
- [ ] PR作成機能
- [ ] ブランチ管理

### フェーズ3: 高度な機能
- [ ] 既存エージェントの分析・学習
- [ ] カスタムツールの自動生成
- [ ] テストコード自動生成
- [ ] エージェントのバージョン管理

---

## 10. 技術スタック

### バックエンド
- **VoltAgent**: エージェント実行基盤
- **TypeScript**: コード生成言語
- **Octokit**: GitHub API クライアント
- **ESLint/Prettier**: コード検証・整形

### フロントエンド
- **React**: UI実装
- **Monaco Editor**: コードプレビュー（シンタックスハイライト）
- **React Flow**: フローチャート表示（オプション）

### その他
- **Zod**: スキーマ検証
- **Handlebars/EJS**: コードテンプレート
- **AST Parser**: TypeScript構文解析

---

## 11. リスク管理

### 技術的リスク
- **コード生成の品質**: テンプレートの充実、AIモデルの精度向上で対応
- **セキュリティ**: 厳格な承認フロー、コード検証で対応
- **デプロイの失敗**: ロールバック機能の実装

### 運用リスク
- **生成されたエージェントの保守**: ドキュメント自動生成、命名規則の統一
- **環境変数の管理**: セットアップガイドの自動生成
- **エージェントの競合**: 名前の重複チェック、既存エージェント一覧表示

---

## 12. 将来の拡張

- **エージェントマーケットプレイス**: 生成されたエージェントの共有
- **エージェントテンプレート**: よく使われるパターンのテンプレート化
- **マルチモーダル対応**: 画像・音声処理エージェントの生成
- **エージェントの合成**: 複数のエージェントを組み合わせた新しいエージェント
- **学習機能**: ユーザーフィードバックから生成品質を向上

---

## 13. 参考: 生成例

### 例1: Slack連携エージェント
```
ユーザー: "Slackの特定チャンネルから毎日メッセージを取得して要約するエージェントを作成"
→ SlackMessageSummarizerエージェント生成
→ Tools: fetchSlackMessages, summarizeText, scheduleTask
```

### 例2: データ分析エージェント
```
ユーザー: "CSVファイルを読み込んで統計分析を行うエージェント"
→ CSVAnalyzerエージェント生成
→ Tools: readCSV, calculateStats, generateChart
```

### 例3: GitHub連携エージェント
```
ユーザー: "GitHubのIssueを監視して、特定のラベルが付いたら通知するエージェント"
→ GitHubIssueMonitorエージェント生成
→ Tools: fetchGitHubIssues, filterByLabel, sendNotification
```
