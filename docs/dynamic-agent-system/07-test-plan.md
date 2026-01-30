# テスト計画書

## ドキュメント情報

| 項目 | 内容 |
|------|------|
| **ドキュメントバージョン** | 1.0.0 |
| **最終更新日** | 2026-01-29 |
| **ステータス** | Draft |
| **目標カバレッジ** | 80% |

## 1. テスト戦略

### 1.1 テストピラミッド

```
         /\
        /  \
       / E2E \ (10%)
      /──────\
     / 統合    \ (30%)
    /──────────\
   / ユニット    \ (60%)
  /──────────────\
```

### 1.2 テストフレームワーク

| 種類 | フレームワーク |
|-----|-------------|
| **ユニットテスト** | Jest |
| **統合テスト** | Jest + Supertest |
| **E2Eテスト** | Jest + Supertest |
| **セキュリティテスト** | Jest + カスタムテスト |

---

## 2. ユニットテスト

### 2.1 DynamicAgentStorage

```typescript
// src/dynamic/storage/__tests__/DynamicAgentStorage.test.ts
import { DynamicAgentStorage } from '../DynamicAgentStorage';
import { createClient } from '@libsql/client';

describe('DynamicAgentStorage', () => {
  let storage: DynamicAgentStorage;
  let db: any;

  beforeEach(async () => {
    db = createClient({ url: ':memory:' });
    await runMigrations(db);
    storage = new DynamicAgentStorage(db);
  });

  afterEach(async () => {
    await db.close();
  });

  describe('create', () => {
    it('should create a new agent', async () => {
      const definition = {
        agentId: 'testAgent',
        className: 'TestAgent',
        displayName: 'Test Agent',
        description: 'Test description',
        instructions: 'Test instructions',
        model: 'openai/gpt-4o-mini',
        status: 'active' as const,
        version: 1,
        tools: [],
        testExamples: [],
      };

      await storage.create(definition);

      const agent = await storage.findById('testAgent');
      expect(agent).not.toBeNull();
      expect(agent?.displayName).toBe('Test Agent');
    });

    it('should throw error for duplicate agent ID', async () => {
      const definition = { /* ... */ };

      await storage.create(definition);
      await expect(storage.create(definition)).rejects.toThrow();
    });
  });

  describe('findById', () => {
    it('should return null for non-existent agent', async () => {
      const agent = await storage.findById('nonExistent');
      expect(agent).toBeNull();
    });

    it('should not return deleted agents', async () => {
      const definition = { /* ... */ status: 'deleted' };
      await storage.create(definition);

      const agent = await storage.findById('testAgent');
      expect(agent).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all active agents', async () => {
      await storage.create({ agentId: 'agent1', /* ... */ });
      await storage.create({ agentId: 'agent2', /* ... */ });

      const agents = await storage.findAll();
      expect(agents).toHaveLength(2);
    });

    it('should order by created_at DESC', async () => {
      await storage.create({ agentId: 'agent1', /* ... */ });
      await new Promise(resolve => setTimeout(resolve, 100));
      await storage.create({ agentId: 'agent2', /* ... */ });

      const agents = await storage.findAll();
      expect(agents[0].agentId).toBe('agent2');
    });
  });
});
```

### 2.2 ToolSandbox

```typescript
// src/dynamic/tools/__tests__/ToolSandbox.test.ts
import { ToolSandbox } from '../ToolSandbox';

describe('ToolSandbox', () => {
  describe('basic execution', () => {
    it('should execute simple code', async () => {
      const implementation = 'return { result: a + b };';
      const sandbox = new ToolSandbox(implementation);

      const result = await sandbox.run({ a: 2, b: 3 });
      expect(result).toEqual({ result: 5 });
    });

    it('should support async code', async () => {
      const implementation = `
        await new Promise(resolve => setTimeout(resolve, 100));
        return { result: 'done' };
      `;
      const sandbox = new ToolSandbox(implementation);

      const result = await sandbox.run({});
      expect(result).toEqual({ result: 'done' });
    });
  });

  describe('security', () => {
    it('should prevent access to require()', async () => {
      const implementation = `
        const fs = require('fs');
        return fs.readFileSync('/etc/passwd', 'utf8');
      `;

      expect(() => new ToolSandbox(implementation)).toThrow();
    });

    it('should prevent access to process', async () => {
      const implementation = 'return process.env;';
      const sandbox = new ToolSandbox(implementation);

      await expect(sandbox.run({})).rejects.toThrow();
    });

    it('should enforce timeout', async () => {
      const implementation = 'while(true) {}';
      const sandbox = new ToolSandbox(implementation);

      await expect(sandbox.run({})).rejects.toThrow('exceeded 5 seconds');
    });

    it('should restrict fetch to allowed domains', async () => {
      const implementation = `
        const response = await fetch('https://evil.com/data');
        return await response.json();
      `;
      const sandbox = new ToolSandbox(implementation);

      await expect(sandbox.run({})).rejects.toThrow('not allowed');
    });
  });

  describe('error handling', () => {
    it('should catch runtime errors', async () => {
      const implementation = 'throw new Error("Test error");';
      const sandbox = new ToolSandbox(implementation);

      await expect(sandbox.run({})).rejects.toThrow('Test error');
    });

    it('should catch syntax errors', () => {
      const implementation = 'return {';  // 構文エラー

      expect(() => new ToolSandbox(implementation)).toThrow('compilation failed');
    });
  });
});
```

### 2.3 DynamicAgentManager

```typescript
// src/dynamic/managers/__tests__/DynamicAgentManager.test.ts
import { DynamicAgentManager } from '../DynamicAgentManager';
import { Memory } from '@volt-agent/core';

describe('DynamicAgentManager', () => {
  let manager: DynamicAgentManager;
  let memory: Memory;

  beforeEach(() => {
    memory = new Memory();
    manager = new DynamicAgentManager(memory, mockDb);
  });

  describe('createAgent', () => {
    it('should create and register agent', async () => {
      const definition = { /* ... */ };

      const agent = await manager.createAgent(definition);

      expect(agent).toBeDefined();
      expect(manager.getRegistry().get('testAgent')).toBe(agent);
    });

    it('should save to database', async () => {
      const definition = { /* ... */ };

      await manager.createAgent(definition);

      const stored = await storage.findById('testAgent');
      expect(stored).not.toBeNull();
    });
  });

  describe('loadAllAgents', () => {
    it('should load agents from database', async () => {
      await storage.create({ agentId: 'agent1', /* ... */ });
      await storage.create({ agentId: 'agent2', /* ... */ });

      const agents = await manager.loadAllAgents();

      expect(Object.keys(agents)).toHaveLength(2);
      expect(agents['agent1']).toBeDefined();
      expect(agents['agent2']).toBeDefined();
    });
  });
});
```

---

## 3. 統合テスト

### 3.1 エージェント作成・実行フロー

```typescript
// src/dynamic/__tests__/integration/agentLifecycle.test.ts
import request from 'supertest';
import { app } from '../../../index';

describe('Agent Lifecycle Integration', () => {
  it('should create, retrieve, and execute agent', async () => {
    // 1. エージェント作成
    const createResponse = await request(app)
      .post('/api/v2/dynamic-agents')
      .send({
        agentId: 'testAgent',
        displayName: 'Test Agent',
        description: 'Integration test agent',
        instructions: 'You are a test agent.',
        tools: [{
          name: 'add',
          description: 'Add two numbers',
          parameters: [
            { name: 'a', zodType: 'number', description: 'First number' },
            { name: 'b', zodType: 'number', description: 'Second number' },
          ],
          implementation: 'return { result: a + b };',
        }],
      })
      .expect(201);

    expect(createResponse.body.success).toBe(true);

    // 2. エージェント取得
    const getResponse = await request(app)
      .get('/api/v2/dynamic-agents/testAgent')
      .expect(200);

    expect(getResponse.body.data.agentId).toBe('testAgent');
    expect(getResponse.body.data.tools).toHaveLength(1);

    // 3. エージェント実行
    const executeResponse = await request(app)
      .post('/api/agents/testAgent/execute')
      .send({ task: 'Add 5 and 3' })
      .expect(200);

    expect(executeResponse.body.result).toContain('8');
  });
});
```

### 3.2 サーバー再起動・復元テスト

```typescript
// src/dynamic/__tests__/integration/persistence.test.ts
describe('Persistence Integration', () => {
  it('should restore agents after server restart', async () => {
    // 1. エージェント作成
    await request(app)
      .post('/api/v2/dynamic-agents')
      .send({ /* ... */ })
      .expect(201);

    // 2. サーバー再起動シミュレーション
    await shutdownServer();
    await startServer();

    // 3. エージェントが復元されていることを確認
    const response = await request(app)
      .get('/api/agents-with-examples')
      .expect(200);

    const agentIds = response.body.data.map(a => a.id);
    expect(agentIds).toContain('testAgent');
  });
});
```

---

## 4. E2Eテスト

### 4.1 エンドツーエンドシナリオ

```typescript
// src/dynamic/__tests__/e2e/fullScenario.test.ts
describe('E2E: Dynamic Agent System', () => {
  it('should support complete user workflow', async () => {
    // ステップ1: エージェント作成
    const agent = await createAgent({
      agentId: 'weatherAgent',
      tools: [{ /* weather tool */ }],
    });

    // ステップ2: エージェント一覧確認
    const agents = await listAgents();
    expect(agents).toContainEqual(expect.objectContaining({ id: 'weatherAgent' }));

    // ステップ3: エージェント実行
    const result = await executeAgent('weatherAgent', 'What is the weather in Tokyo?');
    expect(result).toContain('Tokyo');

    // ステップ4: エージェント更新
    await updateAgent('weatherAgent', {
      displayName: 'Updated Weather Agent',
    });

    // ステップ5: 更新確認
    const updated = await getAgent('weatherAgent');
    expect(updated.version).toBe(2);

    // ステップ6: エージェント削除
    await deleteAgent('weatherAgent');

    // ステップ7: 削除確認
    const notFound = await getAgent('weatherAgent');
    expect(notFound).toBeNull();
  });
});
```

---

## 5. セキュリティテスト

### 5.1 サンドボックスエスケープテスト

```typescript
// src/dynamic/__tests__/security/sandboxEscape.test.ts
describe('Security: Sandbox Escape', () => {
  const dangerousImplementations = [
    'const fs = require("fs"); return fs.readFileSync("/etc/passwd");',
    'return process.env;',
    'return process.cwd();',
    'return __dirname;',
    'return require("child_process").execSync("ls -la");',
  ];

  dangerousImplementations.forEach((impl, index) => {
    it(`should prevent escape attempt #${index + 1}`, async () => {
      await expect(
        createAgent({ tools: [{ implementation: impl }] })
      ).rejects.toThrow();
    });
  });
});
```

### 5.2 SQLインジェクションテスト

```typescript
// src/dynamic/__tests__/security/sqlInjection.test.ts
describe('Security: SQL Injection', () => {
  it('should prevent SQL injection in agentId', async () => {
    const maliciousId = "'; DROP TABLE dynamic_agents; --";

    await request(app)
      .get(`/api/v2/dynamic-agents/${encodeURIComponent(maliciousId)}`)
      .expect(404);

    // テーブルが存在することを確認
    const agents = await storage.findAll();
    expect(agents).toBeDefined();
  });
});
```

---

## 6. パフォーマンステスト

### 6.1 負荷テスト

```typescript
// src/dynamic/__tests__/performance/loadTest.test.ts
describe('Performance: Load Test', () => {
  it('should handle 100 concurrent agent creations', async () => {
    const promises = Array.from({ length: 100 }, (_, i) =>
      createAgent({ agentId: `agent${i}`, /* ... */ })
    );

    const startTime = Date.now();
    await Promise.all(promises);
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(30010); // 30秒以内
  });

  it('should handle 1000 agent listings', async () => {
    const promises = Array.from({ length: 1000 }, () =>
      request(app).get('/api/agents-with-examples')
    );

    const startTime = Date.now();
    await Promise.all(promises);
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(10000); // 10秒以内
  });
});
```

---

## 7. テスト実行

### 7.1 実行コマンド

```bash
# 全テスト実行
npm test

# ユニットテストのみ
npm test -- --testPathPattern=unit

# 統合テストのみ
npm test -- --testPathPattern=integration

# E2Eテストのみ
npm test -- --testPathPattern=e2e

# カバレッジレポート
npm test -- --coverage

# ウォッチモード
npm test -- --watch
```

### 7.2 CI/CD統合

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v3
```

---

## 8. テストデータ

### 8.1 フィクスチャ

```typescript
// src/dynamic/__tests__/fixtures/agents.ts
export const testAgentDefinition = {
  agentId: 'testAgent',
  className: 'TestAgent',
  displayName: 'Test Agent',
  description: 'Test agent for automated testing',
  instructions: 'You are a test agent.',
  model: 'openai/gpt-4o-mini',
  status: 'active' as const,
  version: 1,
  tools: [],
  testExamples: [],
};

export const weatherAgentDefinition = {
  agentId: 'weatherAgent',
  displayName: 'Weather Agent',
  description: 'Get weather information',
  instructions: 'You are a weather agent.',
  tools: [{
    name: 'getCurrentWeather',
    description: 'Get current weather',
    parameters: [
      { name: 'location', zodType: 'string', description: 'City name' },
    ],
    implementation: 'return { temp: 20, condition: "sunny" };',
  }],
};
```

---

## 9. テストカバレッジ目標

| コンポーネント | 目標カバレッジ |
|--------------|--------------|
| **Storage層** | 90% |
| **Manager層** | 85% |
| **ToolSandbox** | 95% |
| **API層** | 80% |
| **全体** | 80% |

---

**Next Steps**: [08-deployment-guide.md](./08-deployment-guide.md) でデプロイガイドを確認してください。
