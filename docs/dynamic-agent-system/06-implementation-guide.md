# 実装ガイド

## ドキュメント情報

| 項目 | 内容 |
|------|------|
| **ドキュメントバージョン** | 1.0.0 |
| **最終更新日** | 2026-01-29 |
| **ステータス** | Draft |

## 1. 実装概要

### 1.1 実装フェーズ

| フェーズ | 期間 | 目標 |
|---------|------|------|
| **Phase 1** | 第1週 | 隔離環境で構築（DynamicAgentManager, Storage） |
| **Phase 2** | 第2週 | 統合（index.ts統合、テスト） |
| **Phase 3** | 第3週 | 段階的ロールアウト |

### 1.2 前提条件

```bash
# Node.js バージョン確認
node --version  # v18.0.0+

# 依存関係インストール
npm install vm2 @types/vm2

# LibSQL CLIインストール（オプション）
# brew install libsql
```

---

## 2. Phase 1: 隔離環境で構築（第1週）

### 2.1 ディレクトリ構造作成

```bash
mkdir -p apps/server/src/dynamic/{managers,agents,tools,storage,api,types,utils}
mkdir -p apps/server/migrations
```

### 2.2 型定義（types/dynamicAgent.types.ts）

```typescript
// src/dynamic/types/dynamicAgent.types.ts

export interface DynamicAgentDefinition {
  agentId: string;
  className: string;
  displayName: string;
  description: string;
  instructions: string;
  model: string;
  status: 'active' | 'inactive' | 'deleted';
  version: number;
  tools: DynamicToolDefinition[];
  testExamples: DynamicTestExample[];
  metadata?: Record<string, any>;
}

export interface DynamicToolDefinition {
  id?: string;
  name: string;
  description: string;
  parameters: ToolParameter[];
  implementation: string;
}

export interface ToolParameter {
  name: string;
  zodType: 'string' | 'number' | 'boolean' | 'enum' | 'object' | 'array';
  zodOptions?: string[];
  description: string;
  optional?: boolean;
}

export interface DynamicTestExample {
  id?: string;
  input: string;
  description: string;
  expectedBehavior: string;
}
```

### 2.3 データベースマイグレーション

```bash
# マイグレーション実行
node -e "require('./src/dynamic/storage/migrations').runMigrations('./dynamic_agents.db')"
```

### 2.4 Storage層実装（storage/DynamicAgentStorage.ts）

```typescript
// src/dynamic/storage/DynamicAgentStorage.ts
import { createClient, type Client } from '@libsql/client';
import type { DynamicAgentDefinition } from '../types/dynamicAgent.types';

export class DynamicAgentStorage {
  constructor(private db: Client) {}

  async create(definition: DynamicAgentDefinition): Promise<void> {
    await this.db.execute({
      sql: `INSERT INTO dynamic_agents
            (id, class_name, display_name, description, instructions, model, status, version)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        definition.agentId,
        definition.className,
        definition.displayName,
        definition.description,
        definition.instructions,
        definition.model,
        definition.status || 'active',
        definition.version || 1,
      ],
    });
  }

  async findById(id: string): Promise<DynamicAgentDefinition | null> {
    const result = await this.db.execute({
      sql: `SELECT * FROM dynamic_agents WHERE id = ? AND status = 'active'`,
      args: [id],
    });

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToDefinition(result.rows[0]);
  }

  async findAll(): Promise<DynamicAgentDefinition[]> {
    const result = await this.db.execute({
      sql: `SELECT * FROM dynamic_agents WHERE status = 'active' ORDER BY created_at DESC`,
    });

    return result.rows.map(row => this.mapRowToDefinition(row));
  }

  private mapRowToDefinition(row: any): DynamicAgentDefinition {
    return {
      agentId: row.id as string,
      className: row.class_name as string,
      displayName: row.display_name as string,
      description: row.description as string,
      instructions: row.instructions as string,
      model: row.model as string,
      status: row.status as 'active' | 'inactive' | 'deleted',
      version: row.version as number,
      tools: [],
      testExamples: [],
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
    };
  }
}
```

### 2.5 ToolSandbox実装（tools/ToolSandbox.ts）

```typescript
// src/dynamic/tools/ToolSandbox.ts
import { VM } from 'vm2';
import { logger } from '../utils/logger';

export class ToolSandbox {
  private vm: VM;
  private compiledFunction: Function;

  constructor(implementation: string) {
    this.vm = new VM({
      timeout: 5000,
      sandbox: {
        fetch: this.createFetchProxy(),
        console: {
          log: (...args: any[]) => logger.info('Tool log', { args }),
          error: (...args: any[]) => logger.error('Tool error', { args }),
        },
      },
    });

    try {
      this.compiledFunction = this.vm.run(`
        (async (params) => {
          ${implementation}
        })
      `);
    } catch (error) {
      throw new Error(`Tool compilation failed: ${error.message}`);
    }
  }

  private createFetchProxy() {
    const allowedDomains = [
      'api.weather.com',
      'api.openweathermap.org',
    ];

    return async (url: string, options?: RequestInit) => {
      const hostname = new URL(url).hostname;
      if (!allowedDomains.includes(hostname)) {
        throw new Error(`Access to ${hostname} is not allowed`);
      }

      return fetch(url, {
        ...options,
        signal: AbortSignal.timeout(3001),
      });
    };
  }

  async run(params: Record<string, any>): Promise<any> {
    try {
      return await this.compiledFunction(params);
    } catch (error) {
      if (error.message.includes('Script execution timed out')) {
        throw new Error('Tool execution exceeded 5 seconds');
      }
      throw error;
    }
  }
}
```

### 2.6 DynamicAgentCreator実装（agents/DynamicAgentCreator.ts）

```typescript
// src/dynamic/agents/DynamicAgentCreator.ts
import { Agent, Tool, Memory } from '@volt-agent/core';
import type { DynamicAgentDefinition } from '../types/dynamicAgent.types';
import { DynamicToolCompiler } from '../tools/DynamicToolCompiler';

export class DynamicAgentCreator {
  private toolCompiler: DynamicToolCompiler;

  constructor() {
    this.toolCompiler = new DynamicToolCompiler();
  }

  createAgent(definition: DynamicAgentDefinition, memory: Memory): Agent {
    // ツールをコンパイル
    const tools = definition.tools.map(t => this.toolCompiler.compile(t));

    // 動的Agentクラスを生成
    class GeneratedAgent extends Agent {
      constructor(memory: Memory) {
        super({
          name: definition.agentId,
          instructions: definition.instructions,
          tools,
          model: definition.model,
        });
      }
    }

    // インスタンス化
    return new GeneratedAgent(memory);
  }
}
```

### 2.7 DynamicAgentManager実装（managers/DynamicAgentManager.ts）

```typescript
// src/dynamic/managers/DynamicAgentManager.ts
import { Agent, Memory } from '@volt-agent/core';
import { DynamicAgentStorage } from '../storage/DynamicAgentStorage';
import { DynamicAgentCreator } from '../agents/DynamicAgentCreator';
import { DynamicAgentRegistry } from './DynamicAgentRegistry';
import type { DynamicAgentDefinition } from '../types/dynamicAgent.types';

export class DynamicAgentManager {
  private storage: DynamicAgentStorage;
  private creator: DynamicAgentCreator;
  private registry: DynamicAgentRegistry;

  constructor(private memory: Memory, db: any) {
    this.storage = new DynamicAgentStorage(db);
    this.creator = new DynamicAgentCreator();
    this.registry = new DynamicAgentRegistry();
  }

  async createAgent(definition: DynamicAgentDefinition): Promise<Agent> {
    // 1. DB保存
    await this.storage.create(definition);

    // 2. エージェント生成
    const agent = this.creator.createAgent(definition, this.memory);

    // 3. レジストリ登録
    this.registry.register(definition.agentId, agent);

    // 4. 監査ログ（省略）

    return agent;
  }

  async loadAllAgents(): Promise<Record<string, Agent>> {
    const definitions = await this.storage.findAll();

    const agents: Record<string, Agent> = {};

    for (const definition of definitions) {
      const agent = this.creator.createAgent(definition, this.memory);
      this.registry.register(definition.agentId, agent);
      agents[definition.agentId] = agent;
    }

    return agents;
  }

  getRegistry(): DynamicAgentRegistry {
    return this.registry;
  }
}
```

### 2.8 テスト実行

```bash
npm test -- --testPathPattern=dynamic
```

---

## 3. Phase 2: 統合（第2週）

### 3.1 DynamicSystem実装（dynamicSystem.ts）

```typescript
// src/dynamic/dynamicSystem.ts
import { Agent, Memory } from '@volt-agent/core';
import { createClient } from '@libsql/client';
import { DynamicAgentManager } from './managers/DynamicAgentManager';
import { runMigrations } from './storage/migrations';
import { logger } from './utils/logger';

export class DynamicSystem {
  private manager: DynamicAgentManager;
  private db: any;

  constructor(private memory: Memory) {
    // DB接続
    this.db = createClient({
      url: 'file:./dynamic_agents.db',
    });
  }

  async initialize(): Promise<Record<string, Agent>> {
    logger.info('Initializing dynamic agent system...');

    // 1. マイグレーション実行
    await runMigrations('./dynamic_agents.db');

    // 2. マネージャー初期化
    this.manager = new DynamicAgentManager(this.memory, this.db);

    // 3. エージェントロード
    const agents = await this.manager.loadAllAgents();

    logger.info(`Loaded ${Object.keys(agents).length} dynamic agents`);

    return agents;
  }

  getManager(): DynamicAgentManager {
    return this.manager;
  }
}
```

### 3.2 index.ts統合

```typescript
// src/index.ts (修正部分のみ)

import { DynamicSystem } from './dynamic/dynamicSystem';
import { FEATURE_FLAGS } from './dynamic/utils/featureFlags';

// ... 既存コード

// 静的エージェント
const agents = {
  chat: new ChatAgent(memory),
  admin: new AdminAgent(memory),
  agentGenerator: new AgentGeneratorAgent(memory),
};

// 動的エージェント（フィーチャーフラグ）
let dynamicAgents: Record<string, Agent> = {};
if (FEATURE_FLAGS.ENABLE_DYNAMIC_AGENTS) {
  const dynamicSystem = new DynamicSystem(memory);
  dynamicAgents = await dynamicSystem.initialize();
}

// VoltAgent初期化
const voltAgent = new VoltAgent({
  agents: { ...agents, ...dynamicAgents },  // ← 統合ポイント
  // ... 他の設定
});

// 動的エージェントAPI（フィーチャーフラグ）
if (FEATURE_FLAGS.ENABLE_DYNAMIC_AGENTS) {
  const dynamicRouter = require('./dynamic/api/dynamicAgentsRouter').default;
  app.use('/api/v2/dynamic-agents', dynamicRouter(dynamicSystem.getManager()));
}
```

### 3.3 統合テスト

```bash
# サーバー起動
ENABLE_DYNAMIC_AGENTS=true npm run dev

# エージェント作成テスト
curl -X POST http://localhost:4310/api/v2/dynamic-agents \
  -H "Content-Type: application/json" \
  -d '{"agentId":"testAgent","displayName":"Test","description":"Test agent","instructions":"You are a test agent"}'

# エージェント一覧確認
curl http://localhost:4310/api/agents-with-examples | jq '.data[] | .id'

# サーバー再起動
npm run dev

# エージェントが復元されていることを確認
curl http://localhost:4310/api/agents-with-examples | jq '.data[] | .id'
```

---

## 4. 実装チェックリスト

### 4.1 Phase 1チェックリスト

- [ ] ディレクトリ構造作成
- [ ] 型定義実装
- [ ] データベースマイグレーション作成・実行
- [ ] DynamicAgentStorage実装
- [ ] DynamicToolStorage実装
- [ ] ToolSandbox実装
- [ ] DynamicToolCompiler実装
- [ ] DynamicAgentCreator実装
- [ ] DynamicAgentManager実装
- [ ] DynamicAgentRegistry実装
- [ ] ユニットテスト実装・実行
- [ ] Phase 1完了: 独立テスト成功

### 4.2 Phase 2チェックリスト

- [ ] DynamicSystem実装
- [ ] featureFlags実装
- [ ] index.ts統合（3行）
- [ ] dynamicAgentsRouter実装
- [ ] agentService拡張（getAllAgentsInfo）
- [ ] 統合テスト実装
- [ ] エージェント作成テスト
- [ ] エージェント復元テスト
- [ ] エージェント実行テスト
- [ ] Phase 2完了: 統合テスト成功

### 4.3 Phase 3チェックリスト

- [ ] ステージング環境デプロイ
- [ ] フィーチャーフラグON
- [ ] 内部ユーザーテスト
- [ ] パフォーマンステスト
- [ ] セキュリティ監査
- [ ] 本番環境デプロイ
- [ ] 段階的ロールアウト
- [ ] Phase 3完了: プロダクション稼働

---

## 5. トラブルシューティング

### 5.1 よくある問題

**問題**: エージェントが復元されない

```bash
# DBファイルが存在するか確認
ls -l dynamic_agents.db

# DBの内容を確認
sqlite3 dynamic_agents.db "SELECT * FROM dynamic_agents;"

# ログを確認
tail -f logs/server.log | grep "dynamic"
```

**問題**: ツールコンパイルエラー

```typescript
// implementationのシンタックスチェック
try {
  new Function(implementation);
} catch (error) {
  console.error('Syntax error:', error.message);
}
```

**問題**: VM2タイムアウト

```typescript
// タイムアウトを延長（デバッグ用）
new VM({ timeout: 30010 });
```

---

## 6. コーディング規約

### 6.1 命名規約

- ファイル名: PascalCase（例: `DynamicAgentManager.ts`）
- クラス名: PascalCase（例: `DynamicAgentCreator`）
- 関数名: camelCase（例: `createAgent`）
- 定数: UPPER_SNAKE_CASE（例: `FEATURE_FLAGS`）

### 6.2 エラーハンドリング

```typescript
// カスタムエラークラス
export class DynamicAgentError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = 'DynamicAgentError';
  }
}

// 使用例
throw new DynamicAgentError('Agent not found', 'AGENT_NOT_FOUND', { agentId });
```

---

**Next Steps**: [07-test-plan.md](./07-test-plan.md) でテスト計画を確認してください。
