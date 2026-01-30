# 動的エージェント登録アーキテクチャ

## 概要

基盤コードを変更せず、APIを経由してVoltAgentに新たなエージェントやツールを動的に追加する仕組み。

## アーキテクチャ

### 1. データベーススキーマ

```sql
-- エージェント定義を保存
CREATE TABLE dynamic_agents (
  id TEXT PRIMARY KEY,              -- agentId (例: "jsonAnalyzer")
  name TEXT NOT NULL,               -- 表示名
  description TEXT,                 -- 説明
  instructions TEXT NOT NULL,       -- エージェントへの指示
  model TEXT DEFAULT 'gpt-4o-mini', -- 使用モデル
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE    -- 有効/無効
);

-- ツール定義を保存
CREATE TABLE dynamic_tools (
  id TEXT PRIMARY KEY,              -- ツールID
  name TEXT NOT NULL,               -- ツール名
  description TEXT NOT NULL,        -- ツールの説明
  parameters TEXT NOT NULL,         -- JSON形式のパラメータ定義
  implementation TEXT NOT NULL,     -- TypeScriptコード（文字列）
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- エージェントとツールの関連
CREATE TABLE agent_tools (
  agent_id TEXT NOT NULL,
  tool_id TEXT NOT NULL,
  PRIMARY KEY (agent_id, tool_id),
  FOREIGN KEY (agent_id) REFERENCES dynamic_agents(id),
  FOREIGN KEY (tool_id) REFERENCES dynamic_tools(id)
);

-- テスト例
CREATE TABLE agent_test_examples (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  input TEXT NOT NULL,
  description TEXT,
  expected_behavior TEXT,
  FOREIGN KEY (agent_id) REFERENCES dynamic_agents(id)
);
```

### 2. コア実装

#### 2.1 DynamicAgentManager

```typescript
// src/services/dynamicAgentManager.ts
import { Agent, Tool, Memory } from "@voltagent/core";
import { z } from "zod";

interface DynamicAgentDefinition {
  id: string;
  name: string;
  description: string;
  instructions: string;
  model: string;
  tools: DynamicToolDefinition[];
  testExamples: any[];
}

interface DynamicToolDefinition {
  name: string;
  description: string;
  parameters: any; // Zod schema定義
  implementation: string; // TypeScriptコード
}

class DynamicAgentManager {
  private voltAgentInstance: any; // VoltAgentインスタンスへの参照
  private memory: Memory;
  private db: any; // LibSQLインスタンス

  constructor(voltAgent: any, memory: Memory, db: any) {
    this.voltAgentInstance = voltAgent;
    this.memory = memory;
    this.db = db;
  }

  /**
   * エージェント定義からToolインスタンスを生成
   */
  private createToolFromDefinition(toolDef: DynamicToolDefinition): Tool {
    // パラメータ定義からZodスキーマを動的生成
    const zodSchema = this.buildZodSchema(toolDef.parameters);

    // implementationコードを実行可能な関数に変換
    const executeFn = new Function('params', `
      return (async () => {
        ${toolDef.implementation}
      })();
    `);

    return new Tool({
      name: toolDef.name,
      description: toolDef.description,
      parameters: zodSchema,
      execute: async (params: any) => {
        try {
          return await executeFn(params);
        } catch (error: any) {
          return {
            success: false,
            error: error.message || 'Tool execution failed',
          };
        }
      },
    });
  }

  /**
   * エージェントを動的に登録
   */
  async registerDynamicAgent(definition: DynamicAgentDefinition): Promise<{
    success: boolean;
    agentId?: string;
    error?: string;
  }> {
    try {
      // 1. ツールを生成
      const tools = definition.tools.map(toolDef =>
        this.createToolFromDefinition(toolDef)
      );

      // 2. Agentクラスを動的に生成
      class DynamicAgent extends Agent {
        constructor(memory: Memory) {
          super({
            name: definition.id,
            instructions: definition.instructions,
            tools,
            model: definition.model,
          });
        }
      }

      // 3. エージェントインスタンスを作成
      const agentInstance = new DynamicAgent(this.memory);

      // 4. VoltAgentに登録（ここが重要！）
      this.voltAgentInstance.registerAgent(agentInstance);

      // 5. データベースに保存（永続化）
      await this.saveAgentToDatabase(definition);

      // 6. agentServiceを更新
      await this.updateAgentService(definition.id, agentInstance);

      return {
        success: true,
        agentId: definition.id,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * サーバー起動時に永続化されたエージェントを復元
   */
  async loadPersistedAgents(): Promise<void> {
    const agents = await this.db.query(
      'SELECT * FROM dynamic_agents WHERE is_active = TRUE'
    );

    for (const agentData of agents) {
      const tools = await this.db.query(
        `SELECT dt.* FROM dynamic_tools dt
         JOIN agent_tools at ON dt.id = at.tool_id
         WHERE at.agent_id = ? AND dt.is_active = TRUE`,
        [agentData.id]
      );

      const testExamples = await this.db.query(
        'SELECT * FROM agent_test_examples WHERE agent_id = ?',
        [agentData.id]
      );

      const definition: DynamicAgentDefinition = {
        id: agentData.id,
        name: agentData.name,
        description: agentData.description,
        instructions: agentData.instructions,
        model: agentData.model,
        tools: tools.map(t => ({
          name: t.name,
          description: t.description,
          parameters: JSON.parse(t.parameters),
          implementation: t.implementation,
        })),
        testExamples: testExamples.map(te => ({
          input: te.input,
          description: te.description,
          expectedBehavior: te.expected_behavior,
        })),
      };

      await this.registerDynamicAgent(definition);
    }
  }

  private buildZodSchema(parameters: any): z.ZodObject<any> {
    // パラメータ定義からZodスキーマを動的生成
    // 実装詳細は省略
  }

  private async saveAgentToDatabase(definition: DynamicAgentDefinition): Promise<void> {
    // DBへの保存処理
  }

  private async updateAgentService(agentId: string, agent: Agent): Promise<void> {
    // agentServiceを更新して、getAllAgentsInfo()に含まれるようにする
  }
}

export let dynamicAgentManager: DynamicAgentManager;

export function initializeDynamicAgentManager(
  voltAgent: any,
  memory: Memory,
  db: any
) {
  dynamicAgentManager = new DynamicAgentManager(voltAgent, memory, db);
}
```

#### 2.2 index.tsの修正

```typescript
// src/index.ts
import { initializeDynamicAgentManager, dynamicAgentManager } from "./services/dynamicAgentManager";

// ... 既存のコード ...

// VoltAgentインスタンスへの参照を保持
const voltAgent = new VoltAgent({
  agents,
  workflows: { expenseApprovalWorkflow },
  server: honoServer({
    configureApp: (app) => {
      // 既存のエンドポイント...

      // 新規: 動的エージェント登録API
      app.post('/api/agents/register', async (c) => {
        try {
          const definition = await c.req.json();
          const result = await dynamicAgentManager.registerDynamicAgent(definition);
          return c.json(result);
        } catch (error) {
          return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          }, 500);
        }
      });

      // 新規: エージェント削除API
      app.delete('/api/agents/:agentId', async (c) => {
        const agentId = c.req.param('agentId');
        // 実装...
      });
    },
  }),
  memory,
  observability,
});

// DynamicAgentManagerを初期化
initializeDynamicAgentManager(voltAgent, memory, db);

// サーバー起動時に永続化されたエージェントを復元
await dynamicAgentManager.loadPersistedAgents();
```

#### 2.3 AgentServiceの拡張

```typescript
// src/services/agentService.ts
class AgentService {
  private staticAgents: Record<string, any> = {};
  private dynamicAgents: Map<string, any> = new Map();

  initialize(agents: Record<string, any>): void {
    this.staticAgents = agents;
  }

  registerDynamicAgent(agentId: string, agent: any): void {
    this.dynamicAgents.set(agentId, agent);
  }

  unregisterDynamicAgent(agentId: string): void {
    this.dynamicAgents.delete(agentId);
  }

  async getAllAgentsInfo() {
    // 静的エージェント + 動的エージェントの両方を返す
    const staticAgentsList = Object.entries(this.staticAgents).map(...);
    const dynamicAgentsList = Array.from(this.dynamicAgents.entries()).map(...);

    return [...staticAgentsList, ...dynamicAgentsList];
  }
}
```

### 3. フロー

#### 3.1 新規エージェント作成

```
1. ユーザー → ChatAgent: "JSONを解析するエージェントが欲しい"
2. ChatAgent → AgentGeneratorAgent に委譲
3. AgentGeneratorAgent:
   - エージェント定義を生成（JSON）
   - POST /api/agents/register にリクエスト
4. DynamicAgentManager:
   - Tool インスタンスを生成
   - Agent クラスを動的生成
   - voltAgent.registerAgent() で登録 ✅
   - DBに保存（永続化）
   - agentServiceに追加
5. ✅ 即座に利用可能（再起動不要）
```

#### 3.2 サーバー再起動時

```
1. サーバー起動
2. 静的エージェント登録（chat, admin, agentGenerator）
3. DynamicAgentManager.loadPersistedAgents()
   - DBから動的エージェント定義を読み込み
   - 各エージェントを再登録
4. ✅ 全エージェントが利用可能
```

### 4. エージェント一覧の管理

**データソース**:
- **静的エージェント**: `agents` オブジェクト（起動時に定義）
- **動的エージェント**: データベース（`dynamic_agents` テーブル）

**統合アクセス**:
```typescript
agentService.getAllAgentsInfo()
  ↓
[
  // 静的エージェント
  { id: "chat", name: "chat", source: "static" },
  { id: "admin", name: "admin", source: "static" },
  { id: "agentGenerator", name: "agentGenerator", source: "static" },
  // 動的エージェント
  { id: "jsonAnalyzer", name: "JSON Analyzer", source: "dynamic" },
  { id: "csvProcessor", name: "CSV Processor", source: "dynamic" },
]
```

### 5. メリット

| 項目 | 現在（PR方式） | 提案（動的登録） |
|-----|--------------|---------------|
| **コードベース変更** | 必要 ❌ | 不要 ✅ |
| **再起動** | 必要 ❌ | 不要 ✅ |
| **即座に利用可能** | いいえ ❌ | はい ✅ |
| **永続化** | Git ✅ | Database ✅ |
| **ロールバック** | Git revert | DB削除 |
| **複雑性** | 高（PR, マージ, CI/CD） | 低（API呼び出しのみ） |

### 6. セキュリティ考慮事項

**リスク**: 動的コード実行（`new Function()`）

**対策**:
1. **認証・認可**: エージェント作成APIに厳格な権限管理
2. **サンドボックス化**: VM2やisolated-vmでコード実行を隔離
3. **コード検証**:
   - 禁止構文チェック（`eval`, `require`, etc）
   - AST解析で危険なコードを検出
4. **レート制限**: エージェント作成の回数制限
5. **監査ログ**: 全エージェント作成をログに記録

### 7. 実装の段階的アプローチ

**Phase 1**: 基本実装
- DynamicAgentManagerの作成
- DBスキーマ設計
- `/api/agents/register` エンドポイント

**Phase 2**: AgentGeneratorAgent統合
- PR作成から動的登録への切り替え
- ユーザーに選択肢を提供（PR vs 動的登録）

**Phase 3**: 高度な機能
- エージェントのバージョン管理
- A/Bテスト機能
- エージェントのホットリロード

## 結論

**可能です**。VoltAgentの`registerAgent()`メソッドを使用することで、基盤コードを変更せずにAPIを経由して動的にエージェントを追加できます。

エージェント一覧は：
- **静的エージェント**: `agents` オブジェクト
- **動的エージェント**: データベース（`dynamic_agents` テーブル）
- **統合アクセス**: `agentService.getAllAgentsInfo()` が両方を返す

この方式により、GitHubのPRプロセスを経ずに、即座に新しいエージェントを追加・利用できます。
