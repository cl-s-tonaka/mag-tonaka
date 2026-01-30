# エージェントジェネレーター実装ガイド

## 1. 実装可能性の評価

### ✅ 実装可能な機能

以下のすべての機能が実装可能です：

1. **エージェント設計書の生成**
   - VoltAgentのエージェントとしてAgentGeneratorを実装
   - LLM（GPT-4o）による要求分析と設計書生成
   - JSON形式での出力

2. **承認フロー**
   - Next.jsのフロントエンドでUI実装
   - React Stateによる承認状態管理
   - コードプレビュー表示

3. **コード生成**
   - テンプレートベースのコード生成（推奨）
   - または、LLMによる動的生成
   - TypeScriptのAST操作も可能（より高度）

4. **ファイル書き込み**
   - Node.js `fs` APIによる直接書き込み
   - セキュリティ制約付き（許可されたパスのみ）

5. **GitHub連携**
   - Octokit（GitHub公式ライブラリ）による操作
   - ブランチ作成、ファイルコミット、PR作成

### ⚠️ 留意点

- **VoltAgentの再起動が必要**: 新しいエージェントをロードするには、現状ではサーバー再起動が必要
- **エラーハンドリング**: コード生成の失敗、GitHub APIエラーなど、各段階でエラー処理が必要
- **型安全性**: 生成されたコードのTypeScriptコンパイルチェックが必要

---

## 2. 実装アプローチ

### 段階的実装（推奨）

#### **フェーズ1: MVP（最小限の機能）**
1. AgentGeneratorエージェントの実装
2. 簡易的な設計書生成
3. テンプレートベースのコード生成
4. ローカルファイルへの書き込み
5. 手動でのサーバー再起動

**目標**: データ分析エージェントの生成をテストケースとして動作確認

#### **フェーズ2: 承認フロー**
1. エージェント設計書表示UI
2. コードプレビューUI
3. 承認・却下ボタン

#### **フェーズ3: GitHub連携**
1. GitHub API統合
2. PR自動作成
3. デプロイワークフロー

---

## 3. 技術スタック

### バックエンド
- **VoltAgent**: AgentGeneratorエージェント実装
- **Handlebars**: コードテンプレートエンジン
- **fs/promises**: ファイル操作
- **Octokit**: GitHub API

### フロントエンド
- **React**: 承認UI
- **Monaco Editor**: コードプレビュー（オプション）
- **Prism.js**: シンタックスハイライト（軽量）

---

## 4. データ分析エージェントのテストケース

### ユーザーリクエスト例
```
"CSVファイルを読み込んで、データの統計情報（平均、中央値、標準偏差）を計算するエージェントを作成してください"
```

### 生成されるエージェント仕様

```typescript
{
  "name": "dataAnalyzer",
  "displayName": "Data Analyzer",
  "description": "CSVファイルを読み込み、統計分析を実行します",
  "model": "openai/gpt-4o-mini",
  "instructions": "あなたはデータ分析を行うエージェントです。CSVファイルを読み込み、統計情報を計算して報告します。",
  "tools": [
    {
      "name": "readCSV",
      "type": "new",
      "description": "CSVファイルを読み込む"
    },
    {
      "name": "calculateStatistics",
      "type": "new",
      "description": "統計情報を計算"
    }
  ],
  "memory": {
    "enabled": true,
    "type": "LibSQL"
  },
  "requiredEnvVars": []
}
```

### 生成されるファイル

**1. agents/DataAnalyzerAgent.ts**
```typescript
import { Agent, Memory } from "@voltagent/core";
import { readCSV, calculateStatistics } from "../tools/dataAnalysisTools";

export class DataAnalyzerAgent extends Agent {
  constructor(memory: Memory) {
    super({
      name: "dataAnalyzer",
      instructions: `あなたはデータ分析を行うエージェントです。
      CSVファイルを読み込み、統計情報（平均、中央値、標準偏差）を計算して報告します。`,
      model: "openai/gpt-4o-mini",
      tools: [readCSV, calculateStatistics],
      memory,
    });
  }
}
```

**2. tools/dataAnalysisTools.ts**
```typescript
import { Tool } from "@voltagent/core";
import { z } from "zod";
import * as fs from "fs/promises";
import * as csv from "csv-parse/sync";

export const readCSV = new Tool({
  name: "readCSV",
  description: "CSVファイルを読み込んでパースします",
  parameters: z.object({
    filePath: z.string().describe("CSVファイルのパス"),
  }),
  execute: async ({ filePath }) => {
    const content = await fs.readFile(filePath, "utf-8");
    const records = csv.parse(content, {
      columns: true,
      skip_empty_lines: true,
    });
    return {
      success: true,
      data: records,
      rowCount: records.length,
    };
  },
});

export const calculateStatistics = new Tool({
  name: "calculateStatistics",
  description: "数値データの統計情報を計算します",
  parameters: z.object({
    data: z.array(z.number()).describe("数値の配列"),
  }),
  execute: async ({ data }) => {
    if (data.length === 0) {
      return { error: "データが空です" };
    }

    const sum = data.reduce((a, b) => a + b, 0);
    const mean = sum / data.length;

    const sorted = [...data].sort((a, b) => a - b);
    const median = data.length % 2 === 0
      ? (sorted[data.length / 2 - 1] + sorted[data.length / 2]) / 2
      : sorted[Math.floor(data.length / 2)];

    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);

    return {
      mean,
      median,
      stdDev,
      min: Math.min(...data),
      max: Math.max(...data),
      count: data.length,
    };
  },
});
```

**3. agents/index.ts**（追記）
```typescript
export { ChatAgent } from "./ChatAgent";
export { AdminAgent } from "./AdminAgent";
export { DataAnalyzerAgent } from "./DataAnalyzerAgent"; // 追加
```

**4. src/index.ts**（追記）
```typescript
import { ChatAgent, AdminAgent, DataAnalyzerAgent } from "./agents";

const chatAgent = new ChatAgent(memory);
const adminAgent = new AdminAgent(memory);
const dataAnalyzerAgent = new DataAnalyzerAgent(memory); // 追加

new VoltAgent({
  agents: {
    chatAgent,
    adminAgent,
    dataAnalyzerAgent, // 追加
  },
  // ...
});
```

---

## 5. GitHub連携の設定

### 5.1 GitHub Personal Access Token (PAT) の作成

#### ステップ1: GitHubにアクセス
1. GitHubにログイン
2. 右上のプロフィールアイコン → **Settings**
3. 左サイドバーの一番下 → **Developer settings**
4. **Personal access tokens** → **Tokens (classic)**
5. **Generate new token** → **Generate new token (classic)**

#### ステップ2: トークンの設定

**Token name**: `MAG Agent Generator`

**Expiration**: 90 days（または必要に応じて）

**Select scopes**（必須権限）:
- ✅ **repo**（フルアクセス）
  - repo:status
  - repo_deployment
  - public_repo
  - repo:invite
  - security_events
- ✅ **workflow**（GitHub Actions）
- ✅ **write:packages**（オプション：パッケージ公開する場合）

#### ステップ3: トークンをコピー
1. **Generate token**をクリック
2. 生成されたトークンをコピー（⚠️ 一度しか表示されません）

### 5.2 環境変数の設定

#### apps/server/.env に追加

```bash
# GitHub Integration
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GITHUB_OWNER=your-github-username-or-org
GITHUB_REPO=mag
GITHUB_DEFAULT_BRANCH=master
```

#### apps/web/.env.local に追加（Next.js側で使う場合）

```bash
# GitHub Integration（サーバーサイドのみで使用）
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GITHUB_OWNER=your-github-username-or-org
GITHUB_REPO=mag
```

**⚠️ セキュリティ注意事項**:
- `.env`ファイルは`.gitignore`に含まれていることを確認
- トークンは絶対にコミットしない
- チーム共有する場合は、各自が個人のトークンを使用

### 5.3 リポジトリの確認

```bash
# 現在のリポジトリを確認
git remote -v

# 出力例
origin  https://github.com/your-org/mag.git (fetch)
origin  https://github.com/your-org/mag.git (push)
```

`GITHUB_OWNER`と`GITHUB_REPO`を上記の情報に合わせて設定してください。

### 5.4 環境変数の例（テンプレート）

#### apps/server/.env.example に追加

```bash
# GitHub Integration（オプション）
# エージェントジェネレーター機能でGitHub連携を使用する場合に設定
GITHUB_TOKEN=your_personal_access_token_here
GITHUB_OWNER=your-github-username-or-org
GITHUB_REPO=mag
GITHUB_DEFAULT_BRANCH=master
```

---

## 6. 実装手順（MVP）

### ステップ1: 必要なパッケージのインストール

```bash
cd apps/server
npm install @octokit/rest csv-parse handlebars
```

### ステップ2: テンプレートファイルの作成

```bash
mkdir -p apps/server/templates
```

**apps/server/templates/agent.hbs**
```handlebars
import { Agent, Memory } from "@voltagent/core";
{{#if tools}}
import { {{#each tools}}{{this.name}}{{#unless @last}}, {{/unless}}{{/each}} } from "../tools/{{toolFileName}}";
{{/if}}

export class {{className}} extends Agent {
  constructor(memory: Memory) {
    super({
      name: "{{agentId}}",
      instructions: `{{instructions}}`,
      model: "{{model}}",
      {{#if tools}}
      tools: [{{#each tools}}{{this.name}}{{#unless @last}}, {{/unless}}{{/each}}],
      {{/if}}
      memory,
    });
  }
}
```

### ステップ3: CodeGeneratorツールの実装

**apps/server/src/tools/codeGenerator.ts**（概略）
```typescript
import { Tool } from "@voltagent/core";
import { z } from "zod";
import * as Handlebars from "handlebars";
import * as fs from "fs/promises";
import * as path from "path";

export const generateAgentCode = new Tool({
  name: "generateAgentCode",
  description: "エージェント設計書からTypeScriptコードを生成",
  parameters: z.object({
    spec: z.object({
      name: z.string(),
      displayName: z.string(),
      className: z.string(),
      // ... その他の仕様
    }),
  }),
  execute: async ({ spec }) => {
    // テンプレート読み込み
    const templatePath = path.join(__dirname, "../../templates/agent.hbs");
    const templateSource = await fs.readFile(templatePath, "utf-8");
    const template = Handlebars.compile(templateSource);

    // コード生成
    const agentCode = template(spec);

    // ファイル書き込み（承認後のみ）
    const outputPath = path.join(
      __dirname,
      "../agents",
      `${spec.className}.ts`
    );

    return {
      code: agentCode,
      outputPath,
    };
  },
});
```

### ステップ4: GitHubツールの実装

**apps/server/src/tools/githubTools.ts**（概略）
```typescript
import { Tool } from "@voltagent/core";
import { z } from "zod";
import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export const createAgentPR = new Tool({
  name: "createAgentPR",
  description: "新しいエージェントのためのPRを作成",
  parameters: z.object({
    agentName: z.string(),
    files: z.array(z.object({
      path: z.string(),
      content: z.string(),
    })),
  }),
  execute: async ({ agentName, files }) => {
    const owner = process.env.GITHUB_OWNER!;
    const repo = process.env.GITHUB_REPO!;
    const branchName = `feature/add-${agentName}-agent`;

    try {
      // 1. mainブランチの最新SHAを取得
      const { data: refData } = await octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${process.env.GITHUB_DEFAULT_BRANCH || "master"}`,
      });
      const mainSha = refData.object.sha;

      // 2. 新しいブランチを作成
      await octokit.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branchName}`,
        sha: mainSha,
      });

      // 3. 各ファイルをコミット
      for (const file of files) {
        await octokit.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: file.path,
          message: `Add ${file.path}`,
          content: Buffer.from(file.content).toString("base64"),
          branch: branchName,
        });
      }

      // 4. PRを作成
      const { data: pr } = await octokit.pulls.create({
        owner,
        repo,
        title: `Add ${agentName} Agent`,
        body: `## 新しいエージェント: ${agentName}\n\n自動生成されたエージェントです。\n\n### 生成されたファイル\n${files.map(f => `- ${f.path}`).join("\n")}`,
        head: branchName,
        base: process.env.GITHUB_DEFAULT_BRANCH || "master",
      });

      return {
        success: true,
        prUrl: pr.html_url,
        prNumber: pr.number,
        branch: branchName,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
});
```

### ステップ5: AgentGeneratorエージェントの実装

**apps/server/src/agents/AgentGeneratorAgent.ts**（概略）
```typescript
import { Agent, Memory } from "@voltagent/core";
import { generateAgentCode, createAgentPR } from "../tools";

export class AgentGeneratorAgent extends Agent {
  constructor(memory: Memory) {
    super({
      name: "agentGenerator",
      instructions: `あなたはエージェントを自動生成するメタエージェントです。

ユーザーの要求を分析し、以下の形式でエージェント設計書（JSON）を作成してください：

{
  "name": "エージェントID（camelCase）",
  "displayName": "表示名",
  "className": "クラス名（PascalCase）",
  "description": "説明",
  "model": "openai/gpt-4o-mini",
  "instructions": "エージェントへの詳細な指示",
  "tools": [
    {
      "name": "ツール名",
      "type": "new",
      "description": "説明"
    }
  ]
}

その後、generateAgentCodeツールを使ってコードを生成してください。`,
      model: "openai/gpt-4o",
      tools: [generateAgentCode, createAgentPR],
      memory,
    });
  }
}
```

### ステップ6: フロントエンドAPI Routesの実装

**apps/web/app/api/agent-builder/route.ts**
```typescript
import { NextRequest, NextResponse } from "next/server";

const VOLTAGENT_API_URL = process.env.VOLTAGENT_API_URL || "http://localhost:3141";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { request: userRequest, action } = body;

    // AgentGeneratorエージェントに送信
    const response = await fetch(`${VOLTAGENT_API_URL}/agents/agentGenerator/text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: userRequest,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to communicate with AgentGenerator");
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in agent-builder:", error);
    return NextResponse.json(
      { error: "Failed to process agent generation request" },
      { status: 500 }
    );
  }
}
```

---

## 7. テスト手順

### テストケース: データ分析エージェント生成

#### 1. サーバー起動確認
```bash
# VoltAgentサーバー
cd apps/server
npm run dev

# Next.js
cd apps/web
npm run dev
```

#### 2. エージェント作成リクエスト
UIで「エージェント作成モード」に切り替え、以下を入力：

```
CSVファイルを読み込んで、データの統計情報（平均、中央値、標準偏差）を計算するエージェントを作成してください
```

#### 3. 期待される動作
1. AgentGeneratorがリクエストを分析
2. エージェント設計書（JSON）を生成
3. UIに設計書が表示される
4. ユーザーが承認
5. コードが生成される
6. ファイルがローカルまたはGitHubに保存される
7. PR URLが表示される（GitHub連携の場合）

#### 4. 生成されたエージェントのテスト
```bash
# VoltAgentサーバーを再起動
cd apps/server
npm run dev

# エージェント一覧で確認
# ブラウザで http://localhost:3001 → エージェント一覧タブ
# "Data Analyzer" が表示されることを確認
```

---

## 8. トラブルシューティング

### GitHub API エラー

**エラー: 401 Unauthorized**
- トークンが無効または期限切れ
- 環境変数が正しく設定されていない

**エラー: 404 Not Found**
- リポジトリ名またはオーナー名が間違っている
- トークンにリポジトリへのアクセス権限がない

**エラー: 422 Validation Failed**
- ブランチ名が既に存在する
- ファイルパスが無効

### ファイル書き込みエラー

**エラー: EACCES (Permission denied)**
- ディレクトリの書き込み権限がない
- ファイルが既に存在し、読み取り専用

**エラー: ENOENT (No such file or directory)**
- 親ディレクトリが存在しない
- パスが間違っている

---

## 9. 次のステップ

### MVP完成後
1. エラーハンドリングの強化
2. テストコード追加
3. ドキュメント自動生成
4. ロールバック機能

### 本番環境デプロイ
1. 環境変数の本番設定
2. GitHub Actionsでの自動デプロイ
3. モニタリング・ログ設定
4. ユーザー権限管理

---

## 10. まとめ

### ✅ 実装可能
- エージェント設計書生成
- テンプレートベースのコード生成
- ローカルファイル書き込み
- GitHub PR自動作成

### 📝 推奨実装順序
1. AgentGeneratorエージェント（最小限）
2. コード生成（テンプレート）
3. ローカルファイル書き込み
4. GitHub連携
5. 承認UI

### 🎯 テストケース
データ分析エージェント（CSV統計分析）は、外部API不要で実装とテストが容易なため、最初のテストケースとして最適です。

この実装ガイドに従って、段階的に機能を実装していけば、エージェントジェネレーターを実現できます。
