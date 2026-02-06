/**
 * 動的エージェントシステム - テストサーバー
 */

// 環境変数を最初に読み込む
import 'dotenv/config';

// フィーチャーフラグのデフォルト設定（.envで未設定の場合）
if (!process.env.ENABLE_DYNAMIC_AGENTS) {
  process.env.ENABLE_DYNAMIC_AGENTS = 'true';
}

import express from 'express';
import { DynamicSystem } from './dynamic/dynamicSystem';
import { createDynamicAgentsRouter } from './dynamic/api/dynamicAgentsRouter';

const app = express();
app.use(express.json());

async function startServer() {
  console.log('Starting server...');

  const memory = { initialized: true };

  // 動的システム初期化
  const dynamicSystem = new DynamicSystem(memory);
  await dynamicSystem.initialize();

  // APIルーター取得
  const routes = createDynamicAgentsRouter(dynamicSystem.getManager());

  // エンドポイント登録
  app.post('/api/v2/dynamic-agents', routes.createAgent);
  app.get('/api/v2/dynamic-agents', routes.listAgents);
  app.get('/api/v2/dynamic-agents/:id', routes.getAgent);
  app.put('/api/v2/dynamic-agents/:id', routes.updateAgent);
  app.delete('/api/v2/dynamic-agents/:id', routes.deleteAgent);
  app.post('/api/v2/dynamic-agents/:id/run', routes.runAgent);
  app.post('/api/v2/dynamic-agents/:id/chat', routes.chatWithAgent);

  // ヘルスチェック
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  const PORT = process.env.PORT || 4310;
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('Endpoints:');
    console.log('  GET    /api/v2/dynamic-agents');
    console.log('  POST   /api/v2/dynamic-agents');
    console.log('  GET    /api/v2/dynamic-agents/:id');
    console.log('  PUT    /api/v2/dynamic-agents/:id');
    console.log('  DELETE /api/v2/dynamic-agents/:id');
    console.log('  POST   /api/v2/dynamic-agents/:id/run');
    console.log('  POST   /api/v2/dynamic-agents/:id/chat');
  });

  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await dynamicSystem.shutdown();
    process.exit(0);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
