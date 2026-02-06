/**
 * チャット統合サンプル
 * チャット経由でエージェント管理を可能にする統合例
 */

import { DynamicSystem } from './dynamic/dynamicSystem';
import { FEATURE_FLAGS } from './dynamic/utils/featureFlags';
import { SupervisorAgent } from './agents/SupervisorAgent';
import { AgentGeneratorAgent } from './agents/AgentGeneratorAgent';

/**
 * チャット統合サーバー起動
 */
async function startChatIntegratedServer() {
  console.log('Starting chat-integrated server...');

  // ========================================
  // メモリ初期化
  // ========================================
  // const memory = new Memory({ dbPath: './memory.db' });
  const memory = { initialized: true }; // 開発用モック

  // ========================================
  // 動的エージェントシステムの初期化
  // ========================================
  let dynamicSystem: DynamicSystem | null = null;
  let dynamicAgents: Record<string, any> = {};

  if (FEATURE_FLAGS.ENABLE_DYNAMIC_AGENTS) {
    console.log('Initializing dynamic agent system...');
    dynamicSystem = new DynamicSystem(memory);
    dynamicAgents = await dynamicSystem.initialize();
    console.log(`Loaded ${Object.keys(dynamicAgents).length} dynamic agents`);
  }

  // ========================================
  // 静的エージェントの初期化
  // ========================================

  // Supervisorエージェント（チャットのメインエージェント）
  const supervisor = dynamicSystem
    ? new SupervisorAgent(memory, dynamicSystem.getManager())
    : new SupervisorAgent(memory);

  // AgentGeneratorエージェント（エージェント作成支援）
  const agentGenerator = dynamicSystem
    ? new AgentGeneratorAgent(memory, dynamicSystem.getManager())
    : null;

  // 静的エージェント
  const staticAgents: Record<string, any> = {
    supervisor,
  };

  if (agentGenerator) {
    staticAgents.agentGenerator = agentGenerator;
  }

  console.log(`Initialized ${Object.keys(staticAgents).length} static agents`);

  // ========================================
  // 全エージェントの統合
  // ========================================
  const allAgents = { ...staticAgents, ...dynamicAgents };

  console.log(`
========================================
Agent System Status
========================================
Static Agents: ${Object.keys(staticAgents).length}
Dynamic Agents: ${Object.keys(dynamicAgents).length}
Total Agents: ${Object.keys(allAgents).length}
========================================
  `);

  // エージェント一覧を表示
  console.log('Available Agents:');
  for (const [id, agent] of Object.entries(allAgents)) {
    const info = agent.getInfo?.() || {};
    console.log(`  - ${id}: ${info.displayName || id}`);
  }

  // ========================================
  // VoltAgent初期化
  // ========================================
  // const voltAgent = new VoltAgent({
  //   agents: allAgents,
  //   memory,
  //   defaultAgent: 'supervisor', // デフォルトはSupervisor
  // });

  // ========================================
  // チャットエンドポイント設定例
  // ========================================

  // const app = express();
  // app.use(express.json());

  /**
   * チャットエンドポイント
   * POST /api/chat
   */
  // app.post('/api/chat', async (req, res) => {
  //   const { message, agentId = 'supervisor' } = req.body;
  //
  //   try {
  //     // 指定されたエージェントを取得（デフォルトはSupervisor）
  //     const agent = allAgents[agentId];
  //
  //     if (!agent) {
  //       return res.status(404).json({
  //         error: `Agent '${agentId}' not found`,
  //       });
  //     }
  //
  //     // エージェント実行
  //     const result = await agent.run(message);
  //
  //     res.json({
  //       success: true,
  //       agentId,
  //       output: result.output,
  //       toolCalls: result.toolCalls || [],
  //     });
  //   } catch (error: any) {
  //     res.status(500).json({
  //       error: error.message,
  //     });
  //   }
  // });

  /**
   * エージェント一覧エンドポイント
   * GET /api/agents
   */
  // app.get('/api/agents', async (req, res) => {
  //   const agentList = Object.entries(allAgents).map(([id, agent]) => {
  //     const info = agent.getInfo?.() || {};
  //     return {
  //       id,
  //       displayName: info.displayName || id,
  //       description: info.description || '',
  //       type: info.isDynamic ? 'dynamic' : 'static',
  //       tools: info.tools || [],
  //     };
  //   });
  //
  //   res.json({
  //     success: true,
  //     agents: agentList,
  //     total: agentList.length,
  //   });
  // });

  // ========================================
  // 使用例デモ
  // ========================================
  console.log('\n========================================');
  console.log('Usage Examples');
  console.log('========================================\n');

  // 例1: エージェント一覧の取得
  console.log('Example 1: List all agents');
  console.log('User: "どんなエージェントが使えますか？"');
  const result1 = await supervisor.run('どんなエージェントが使えますか？');
  console.log('Supervisor:', result1.output?.substring(0, 200) + '...\n');

  // 例2: エージェント作成（AgentGenerator経由）
  if (agentGenerator) {
    console.log('Example 2: Create a new agent');
    console.log('User: "計算エージェントを作成したい"');
    const result2 = await agentGenerator.run('計算エージェントを作成したい');
    console.log('AgentGenerator:', result2.output?.substring(0, 200) + '...\n');
  }

  // ========================================
  // サーバー起動
  // ========================================
  // const PORT = process.env.PORT || 3001;
  // app.listen(PORT, () => {
  //   console.log(`\n========================================`);
  //   console.log(`Server is running on http://localhost:${PORT}`);
  //   console.log(`========================================\n`);
  //   console.log(`Try these endpoints:`);
  //   console.log(`  POST /api/chat - Send a chat message`);
  //   console.log(`  GET /api/agents - List all agents`);
  //   console.log(`\nExample chat requests:`);
  //   console.log(`  "エージェント一覧を表示して"`);
  //   console.log(`  "weatherAgentについて教えて"`);
  //   console.log(`  "新しいエージェントを作成したい"`);
  // });

  console.log('Chat integration setup complete!\n');

  // シャットダウンハンドラー
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    if (dynamicSystem) {
      await dynamicSystem.shutdown();
    }
    process.exit(0);
  });
}

// サーバー起動
startChatIntegratedServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
