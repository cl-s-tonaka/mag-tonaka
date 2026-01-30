/**
 * サーバーエントリーポイント（サンプル実装）
 *
 * このファイルは動的エージェントシステムの統合例を示します。
 * 実際のプロジェクトでは、既存の index.ts に以下のコードを統合してください。
 */

import { DynamicSystem } from './dynamic/dynamicSystem';
import { FEATURE_FLAGS } from './dynamic/utils/featureFlags';
import { createDynamicAgentsRouter } from './dynamic/api/dynamicAgentsRouter';

/**
 * サーバー起動
 */
async function startServer() {
  console.log('Starting server...');

  // ========================================
  // 既存システムの初期化（例）
  // ========================================

  // メモリ初期化（VoltAgent用）
  // const memory = new Memory({ dbPath: './memory.db' });

  // 開発用モック
  const memory = { initialized: true };

  // 静的エージェント（既存）
  const staticAgents = {
    // chat: new ChatAgent(memory),
    // admin: new AdminAgent(memory),
    // agentGenerator: new AgentGeneratorAgent(memory),
  };

  console.log(`Initialized ${Object.keys(staticAgents).length} static agents`);

  // ========================================
  // 動的エージェントシステムの統合
  // ========================================

  let dynamicAgents: Record<string, any> = {};
  let dynamicSystem: DynamicSystem | null = null;

  if (FEATURE_FLAGS.ENABLE_DYNAMIC_AGENTS) {
    console.log('Dynamic agents feature is enabled');

    try {
      // 動的システム初期化
      dynamicSystem = new DynamicSystem(memory);
      dynamicAgents = await dynamicSystem.initialize();

      console.log(`Initialized ${Object.keys(dynamicAgents).length} dynamic agents`);
    } catch (error: any) {
      console.error('Failed to initialize dynamic agents:', error.message);
      // 動的システムの失敗で全体を止めない
    }
  } else {
    console.log('Dynamic agents feature is disabled');
  }

  // ========================================
  // VoltAgent初期化
  // ========================================

  // 全エージェントを統合
  const allAgents = { ...staticAgents, ...dynamicAgents };

  console.log(`Total agents: ${Object.keys(allAgents).length}`);

  // const voltAgent = new VoltAgent({
  //   agents: allAgents,
  //   memory,
  //   // 他の設定...
  // });

  // ========================================
  // Express サーバー設定
  // ========================================

  // const express = require('express');
  // const app = express();
  // app.use(express.json());

  // 既存APIエンドポイント
  // app.get('/api/agents', (req, res) => { ... });
  // app.post('/api/agents/:id/execute', (req, res) => { ... });

  // 動的エージェントAPIエンドポイント（フィーチャーフラグ制御）
  if (FEATURE_FLAGS.ENABLE_DYNAMIC_AGENTS && dynamicSystem) {
    console.log('Registering dynamic agents API endpoints');

    const dynamicRouter = createDynamicAgentsRouter(dynamicSystem.getManager());

    // app.post('/api/v2/dynamic-agents', dynamicRouter.createAgent);
    // app.get('/api/v2/dynamic-agents', dynamicRouter.listAgents);
    // app.get('/api/v2/dynamic-agents/:id', dynamicRouter.getAgent);
    // app.put('/api/v2/dynamic-agents/:id', dynamicRouter.updateAgent);
    // app.delete('/api/v2/dynamic-agents/:id', dynamicRouter.deleteAgent);
  }

  // ========================================
  // サーバー起動
  // ========================================

  const PORT = process.env.PORT || 4310;

  // app.listen(PORT, () => {
  //   console.log(`Server is running on http://localhost:${PORT}`);
  //   console.log(`- Static agents: ${Object.keys(staticAgents).length}`);
  //   console.log(`- Dynamic agents: ${Object.keys(dynamicAgents).length}`);
  // });

  console.log('Server initialization complete');

  // シャットダウンハンドラー
  process.on('SIGINT', async () => {
    console.log('Shutting down server...');

    if (dynamicSystem) {
      await dynamicSystem.shutdown();
    }

    process.exit(0);
  });
}

// サーバー起動
startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
