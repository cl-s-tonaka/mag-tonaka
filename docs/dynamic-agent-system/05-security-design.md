# セキュリティ設計書

## ドキュメント情報

| 項目 | 内容 |
|------|------|
| **ドキュメントバージョン** | 1.0.0 |
| **最終更新日** | 2026-01-29 |
| **ステータス** | Draft |
| **リスクレベル** | High |

## 1. セキュリティ概要

### 1.1 脅威モデル

動的エージェントシステムは**ユーザー提供のコードを実行**するため、セキュリティリスクが高い。

**主要な脅威**:
1. **任意コード実行**: 悪意のあるコードによるシステム侵害
2. **リソース枯渇**: 無限ループ、メモリリーク
3. **データ漏洩**: 機密情報へのアクセス
4. **権限昇格**: 他ユーザーのエージェントへのアクセス

### 1.2 防御戦略（Defense in Depth）

```
Layer 1: 認証・認可
  ↓
Layer 2: 入力バリデーション
  ↓
Layer 3: レート制限
  ↓
Layer 4: サンドボックス実行（最重要）
  ↓
Layer 5: 監査ログ
```

---

## 2. 脅威分析（STRIDE）

| 脅威 | 影響 | 確率 | リスク | 対策 |
|-----|------|-----|-------|------|
| **S: なりすまし** | 中 | 中 | 中 | API key認証 |
| **T: 改ざん** | 高 | 低 | 中 | 入力バリデーション、トランザクション |
| **R: 否認** | 低 | 中 | 低 | 監査ログ |
| **I: 情報漏洩** | 高 | 中 | 高 | サンドボックス、アクセス制御 |
| **D: DoS** | 高 | 高 | 高 | レート制限、タイムアウト |
| **E: 権限昇格** | 致命的 | 低 | 高 | サンドボックス、最小権限 |

---

## 3. サンドボックス戦略

### 3.1 MVP: VM2サンドボックス

**実装**:
```typescript
import { VM } from 'vm2';

export class ToolSandbox {
  private vm: VM;

  constructor(implementation: string) {
    this.vm = new VM({
      timeout: 5000,                    // 5秒タイムアウト
      sandbox: {
        // 許可されたAPI
        fetch: this.createFetchProxy(),
        console: {
          log: (...args) => logger.info('Tool log', { args }),
          error: (...args) => logger.error('Tool error', { args }),
        },
      },
      // 禁止されたAPI（デフォルト）
      // - require()
      // - process
      // - fs
      // - child_process
    });
  }

  private createFetchProxy() {
    // fetchのホワイトリスト版
    const allowedDomains = [
      'api.weather.com',
      'api.openweathermap.org',
      // その他許可されたドメイン
    ];

    return async (url: string, options?: RequestInit) => {
      const hostname = new URL(url).hostname;
      if (!allowedDomains.includes(hostname)) {
        throw new Error(`Access to ${hostname} is not allowed`);
      }

      return fetch(url, {
        ...options,
        // タイムアウト追加
        signal: AbortSignal.timeout(3001),
      });
    };
  }

  async run(params: Record<string, any>): Promise<any> {
    try {
      const func = this.vm.run(`(async (params) => {
        ${this.implementation}
      })`);

      return await func(params);
    } catch (error) {
      if (error.message.includes('Script execution timed out')) {
        throw new TimeoutError('Tool execution exceeded 5 seconds');
      }
      throw new ToolExecutionError(error.message);
    }
  }
}
```

**制限事項**:
- タイムアウト: 5秒
- メモリ: Node.jsプロセス内（制限なし）
- ネットワーク: ホワイトリストドメインのみ
- ファイルシステム: アクセス不可
- 子プロセス: 実行不可

**VM2の脆弱性**:
- 過去にサンドボックスエスケープの脆弱性あり
- 定期的なアップデート必須

### 3.2 プロダクション: Worker Threads（推奨）

**実装**:
```typescript
import { Worker } from 'worker_threads';

export class ToolSandboxWorker {
  async run(params: Record<string, any>, implementation: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const worker = new Worker('./tool-worker.js', {
        workerData: { params, implementation },
        resourceLimits: {
          maxOldGenerationSizeMb: 50,    // メモリ制限: 50MB
          maxYoungGenerationSizeMb: 10,
        },
      });

      const timeout = setTimeout(() => {
        worker.terminate();
        reject(new TimeoutError('Tool execution exceeded 5 seconds'));
      }, 5000);

      worker.on('message', (result) => {
        clearTimeout(timeout);
        resolve(result);
      });

      worker.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      worker.on('exit', (code) => {
        clearTimeout(timeout);
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });
    });
  }
}
```

**利点**:
- 完全なプロセス隔離
- メモリ制限
- CPUリソース制限
- クラッシュしても本プロセスに影響なし

**欠点**:
- 実装が複雑
- オーバーヘッドが大きい

### 3.3 サンドボックス比較

| 項目 | VM2 | Worker Threads |
|-----|-----|----------------|
| **プロセス隔離** | ❌ | ✅ |
| **メモリ制限** | ❌ | ✅ |
| **CPU制限** | ❌ | ✅ |
| **実装難易度** | 易 | 難 |
| **オーバーヘッド** | 低 | 高 |
| **セキュリティ** | 中 | 高 |
| **推奨環境** | MVP | プロダクション |

---

## 4. 認証・認可

### 4.1 認証（MVP: なし、将来: API Key）

**将来実装**:
```typescript
// API Key認証
export async function authenticateRequest(req: Request): Promise<User> {
  const apiKey = req.headers.get('Authorization')?.replace('Bearer ', '');

  if (!apiKey) {
    throw new UnauthorizedError('API key required');
  }

  const user = await getUserByApiKey(apiKey);

  if (!user) {
    throw new UnauthorizedError('Invalid API key');
  }

  return user;
}
```

### 4.2 認可（リソースアクセス制御）

**原則**: ユーザーは自身が作成したエージェントのみ管理可能

```typescript
export async function authorizeAgentAccess(
  user: User,
  agentId: string,
  operation: 'read' | 'write' | 'delete'
): Promise<void> {
  const agent = await storage.findById(agentId);

  if (!agent) {
    throw new NotFoundError('Agent not found');
  }

  // Adminロールは全エージェントにアクセス可能
  if (user.role === 'admin') {
    return;
  }

  // 所有者チェック
  if (agent.userId !== user.id) {
    throw new ForbiddenError('You do not have permission to access this agent');
  }

  // 操作別の権限チェック（将来拡張）
}
```

---

## 5. 入力バリデーション

### 5.1 Zodスキーマ

```typescript
import { z } from 'zod';

// エージェント作成リクエスト
export const CreateAgentSchema = z.object({
  agentId: z.string()
    .min(3, 'Agent ID must be at least 3 characters')
    .max(50, 'Agent ID must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Agent ID must be alphanumeric'),

  displayName: z.string()
    .min(1, 'Display name is required')
    .max(100),

  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(500),

  instructions: z.string()
    .min(10, 'Instructions must be at least 10 characters')
    .max(5000),

  model: z.string().optional(),

  tools: z.array(z.object({
    name: z.string().regex(/^[a-zA-Z0-9_]+$/),
    description: z.string(),
    parameters: z.array(z.object({
      name: z.string(),
      zodType: z.enum(['string', 'number', 'boolean', 'enum', 'object', 'array']),
      zodOptions: z.array(z.string()).optional(),
      description: z.string(),
      optional: z.boolean().optional(),
    })),
    implementation: z.string()
      .max(10000, 'Tool implementation must be less than 10000 characters'),
  })).optional(),

  testExamples: z.array(z.object({
    input: z.string(),
    description: z.string(),
    expectedBehavior: z.string(),
  })).optional(),
});
```

### 5.2 SQLインジェクション対策

**常にパラメータ化クエリを使用**:
```typescript
// ✅ 安全
const result = await db.execute({
  sql: `SELECT * FROM dynamic_agents WHERE id = ?`,
  args: [agentId],
});

// ❌ 危険（絶対に使用しない）
const result = await db.execute({
  sql: `SELECT * FROM dynamic_agents WHERE id = '${agentId}'`,
});
```

### 5.3 XSS対策

```typescript
// 出力エスケープ（必要に応じて）
import { escapeHtml } from 'html-escaper';

export function sanitizeOutput(text: string): string {
  return escapeHtml(text);
}
```

---

## 6. レート制限

### 6.1 実装

```typescript
import rateLimit from 'express-rate-limit';

// エージェント作成のレート制限
export const createAgentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1時間
  max: 10,                    // 10リクエスト/時間
  message: 'Too many agent creation requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// エージェント実行のレート制限
export const executeAgentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1時間
  max: 100,                   // 100リクエスト/時間
  message: 'Too many execution requests, please try again later',
});

// 使用例
app.post('/api/v2/dynamic-agents', createAgentLimiter, createAgentHandler);
app.post('/api/agents/:id/execute', executeAgentLimiter, executeAgentHandler);
```

### 6.2 レート制限設定

| エンドポイント | 制限 | 理由 |
|--------------|------|------|
| `POST /api/v2/dynamic-agents` | 10 req/hour | リソース保護 |
| `POST /api/agents/:id/execute` | 100 req/hour | LLMコスト制限 |
| `GET /api/v2/dynamic-agents` | 1000 req/hour | 読み取りは緩め |

---

## 7. 監査ログ

### 7.1 ログ記録

```typescript
export async function logAudit(params: {
  agentId: string;
  operation: 'create' | 'update' | 'delete' | 'execute';
  userId?: string;
  status: 'success' | 'failure';
  errorMessage?: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  await auditStorage.create({
    id: generateUuid(),
    ...params,
    createdAt: new Date().toISOString(),
  });
}
```

### 7.2 監査ログ検索

```typescript
// 特定エージェントの操作履歴
const logs = await auditStorage.findByAgentId(agentId);

// 特定ユーザーの操作履歴
const logs = await auditStorage.findByUserId(userId);

// 失敗した操作の検索
const logs = await auditStorage.findByStatus('failure');
```

---

## 8. セキュリティベストプラクティス

### 8.1 最小権限の原則

- サンドボックスには最小限のAPIのみ提供
- ユーザーは自身のエージェントのみアクセス
- データベースユーザーは最小限の権限

### 8.2 防御的プログラミング

```typescript
// 常にエラーハンドリング
try {
  const result = await toolExecutor.execute(params);
  return result;
} catch (error) {
  logger.error('Tool execution failed', { error, params });
  throw new ToolExecutionError('Tool execution failed', { cause: error });
}

// タイムアウト保護
const result = await Promise.race([
  toolExecutor.execute(params),
  timeout(5000),
]);

// 入力サニタイゼーション
function sanitizeInput(input: string): string {
  return input.trim().slice(0, 10000);
}
```

### 8.3 依存関係管理

```bash
# 定期的なセキュリティ監査
npm audit

# 自動更新（Dependabot）
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
```

---

## 9. セキュリティテスト

### 9.1 脆弱性テスト

**サンドボックスエスケープテスト**:
```typescript
describe('Sandbox Security', () => {
  it('should prevent access to require()', async () => {
    const implementation = `
      const fs = require('fs');
      return fs.readFileSync('/etc/passwd', 'utf8');
    `;

    await expect(executor.execute({})).rejects.toThrow();
  });

  it('should prevent access to process', async () => {
    const implementation = `
      return process.env;
    `;

    await expect(executor.execute({})).rejects.toThrow();
  });

  it('should enforce timeout', async () => {
    const implementation = `
      while(true) {}
    `;

    await expect(executor.execute({})).rejects.toThrow(TimeoutError);
  });
});
```

**SQLインジェクションテスト**:
```typescript
describe('SQL Injection', () => {
  it('should prevent SQL injection in agentId', async () => {
    const maliciousId = "'; DROP TABLE dynamic_agents; --";

    const response = await request(app)
      .get(`/api/v2/dynamic-agents/${maliciousId}`)
      .expect(404);

    // テーブルが削除されていないことを確認
    const agents = await storage.findAll();
    expect(agents).toBeDefined();
  });
});
```

### 9.2 ペネトレーションテスト

**チェックリスト**:
- [ ] サンドボックスエスケープ
- [ ] SQLインジェクション
- [ ] XSS
- [ ] CSRF
- [ ] レート制限バイパス
- [ ] 認証バイパス
- [ ] 権限昇格

---

## 10. インシデントレスポンス

### 10.1 検知

**アラート条件**:
- ツール実行エラー > 10/分
- サンドボックスタイムアウト > 5/分
- 同一IPからのレート制限超過
- 監査ログの異常パターン

### 10.2 対応手順

```
1. 検知: アラート受信
   ↓
2. 隔離: フィーチャーフラグをOFF
   export ENABLE_DYNAMIC_AGENTS=false
   ↓
3. 調査: 監査ログ、エラーログ確認
   ↓
4. 修正: 脆弱性パッチ適用
   ↓
5. 検証: テスト環境で検証
   ↓
6. 復旧: フィーチャーフラグをON
```

---

## 11. コンプライアンス

### 11.1 GDPR対応（該当する場合）

- ユーザーデータの削除権
- データエクスポート機能
- 監査ログの保持期間管理

### 11.2 SOC 2対応（該当する場合）

- アクセス制御
- 監査ログ
- 変更管理
- インシデントレスポンス

---

**Next Steps**: [06-implementation-guide.md](./06-implementation-guide.md) で実装ガイドを確認してください。
