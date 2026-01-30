/**
 * マルチエージェントシステム統合サンプル
 *
 * LiteLLM統合とマルチエージェント・オーケストレーターの使用例
 * 動的エージェント自動生成システムを含む
 *
 * 環境変数:
 *   LITELLM_API_KEY      - LiteLLM API Key
 *   LITELLM_BASE_URL     - LiteLLM Base URL (default: http://localhost:4000)
 *   LITELLM_DEFAULT_MODEL - デフォルトモデル (default: gpt-4o-mini)
 *   SUPERVISOR_MODEL     - Supervisorモデル (default: gpt-4o)
 *   ORCHESTRATOR_MODEL   - Orchestratorモデル (default: gpt-4o)
 *   PROPOSAL_CONFIDENCE_THRESHOLD - 提案のconfidence閾値 (default: 0.7)
 *   AUTO_EXECUTE_AFTER_CREATE - 作成後に元リクエスト自動実行 (default: true)
 */

// 環境変数を読み込み
import * as dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { DynamicSystem } from './dynamic/dynamicSystem';
import { DynamicAgentManager } from './dynamic/managers/DynamicAgentManager';
import { LiteLLMService } from './services/LiteLLMService';
import { SupervisorAgent } from './agents/SupervisorAgent';
import { AgentGeneratorAgent } from './agents/AgentGeneratorAgent';
import { AgentOrchestrator } from './orchestrator/AgentOrchestrator';
import { createDynamicAgentsRouter } from './dynamic/api/dynamicAgentsRouter';
import { createOrchestratorRouter } from './orchestrator/orchestratorRouter';

async function main() {
  console.log('🚀 Starting Multi-Agent System...\n');

  // ===============================================
  // 1. LiteLLMサービスの初期化
  // ===============================================
  console.log('📡 Initializing LiteLLM Service...');

  const llmService = new LiteLLMService({
    apiKey: process.env.LITELLM_API_KEY || 'your-api-key',
    baseUrl: process.env.LITELLM_BASE_URL || 'http://localhost:4000',
    defaultModel: process.env.LITELLM_DEFAULT_MODEL || 'gpt-4o-mini',
  });

  // 接続テスト
  const connectionTest = await llmService.testConnection();
  if (connectionTest.success) {
    console.log(`✅ LLM Connection successful (model: ${connectionTest.model})\n`);
  } else {
    console.warn(`⚠️ LLM Connection failed: ${connectionTest.message}`);
    console.warn('   Continuing without LLM (mock mode)...\n');
  }

  // ===============================================
  // 2. 動的エージェントシステムの初期化
  // ===============================================
  console.log('🔧 Initializing Dynamic Agent System...');

  const dynamicSystem = new DynamicSystem({});
  const dynamicAgents = await dynamicSystem.initialize();
  const agentManager = dynamicSystem.getManager();

  console.log(`✅ Loaded ${Object.keys(dynamicAgents).length} dynamic agents\n`);

  // ===============================================
  // 3. 静的エージェントの初期化
  // ===============================================
  console.log('🤖 Initializing Static Agents...');

  const supervisor = new SupervisorAgent({}, agentManager, llmService);
  console.log('  ✅ Supervisor Agent initialized');

  const agentGenerator = new AgentGeneratorAgent({}, agentManager);
  console.log('  ✅ Agent Generator Agent initialized\n');

  // ===============================================
  // 4. オーケストレーターの初期化
  // ===============================================
  console.log('🎯 Initializing Agent Orchestrator...');

  const orchestrator = new AgentOrchestrator(agentManager, llmService, undefined, {
    confidenceThreshold: parseFloat(process.env.PROPOSAL_CONFIDENCE_THRESHOLD || '0.7'),
    autoExecuteAfterCreate: process.env.AUTO_EXECUTE_AFTER_CREATE !== 'false',
  });

  // 静的エージェントを登録
  orchestrator.registerStaticAgent('supervisor', supervisor);
  orchestrator.registerStaticAgent('agentGenerator', agentGenerator);

  // AgentGeneratorAgentをオーケストレーターに設定
  orchestrator.setAgentGenerator(agentGenerator);

  console.log('✅ Orchestrator initialized with dynamic agent auto-generation support\n');

  // ===============================================
  // 5. サンプルエージェントの作成
  // ===============================================
  console.log('📦 Creating sample agents...\n');

  // 天気エージェント
  try {
    await agentManager.createAgent({
      agentId: 'weather-agent',
      displayName: 'Weather Agent',
      description: '天気情報を取得するエージェント',
      instructions: `あなたは天気情報を提供するエージェントです。
ユーザーの質問に対して、天気に関する情報を提供してください。
ツールを使って天気データを取得できます。`,
      model: 'gpt-4o-mini',
      tools: [
        {
          name: 'getWeather',
          description: '指定した都市の天気を取得',
          parameters: [
            { name: 'city', zodType: 'string', description: '都市名' },
          ],
          implementation: `
            // シミュレーションデータを返す
            const weatherData = {
              'Tokyo': { temp: 22, condition: '晴れ', humidity: 45 },
              '東京': { temp: 22, condition: '晴れ', humidity: 45 },
              'Osaka': { temp: 24, condition: '曇り', humidity: 60 },
              '大阪': { temp: 24, condition: '曇り', humidity: 60 },
              'Sapporo': { temp: 15, condition: '雨', humidity: 80 },
              '札幌': { temp: 15, condition: '雨', humidity: 80 },
            };
            const city = params.city;
            return weatherData[city] || { temp: 20, condition: '不明', humidity: 50, city: city };
          `,
        },
      ],
    });
    console.log('  ✅ Weather Agent created');
  } catch (e: any) {
    console.log(`  ℹ️ Weather Agent: ${e.message}`);
  }

  // 翻訳エージェント
  try {
    await agentManager.createAgent({
      agentId: 'translator-agent',
      displayName: 'Translator Agent',
      description: 'テキストを翻訳するエージェント',
      instructions: `あなたは翻訳エージェントです。
ユーザーが指定した言語にテキストを翻訳してください。
日本語、英語、中国語、韓国語に対応しています。`,
      model: 'gpt-4o-mini',
      tools: [],
    });
    console.log('  ✅ Translator Agent created');
  } catch (e: any) {
    console.log(`  ℹ️ Translator Agent: ${e.message}`);
  }

  // 計算エージェント
  try {
    await agentManager.createAgent({
      agentId: 'calculator-agent',
      displayName: 'Calculator Agent',
      description: '数学的な計算を行うエージェント',
      instructions: `あなたは計算エージェントです。
数学的な計算や問題を解決してください。
四則演算、方程式、統計計算などに対応しています。`,
      model: 'gpt-4o-mini',
      tools: [
        {
          name: 'calculate',
          description: '数式を計算',
          parameters: [
            { name: 'expression', zodType: 'string', description: '計算式' },
          ],
          implementation: `
            try {
              const expression = params.expression;
              // 安全な計算（evalを使用しない）
              const result = Function('"use strict";return (' + expression + ')')();
              return { result, expression };
            } catch (e) {
              return { error: '計算できませんでした', expression: params.expression };
            }
          `,
        },
      ],
    });
    console.log('  ✅ Calculator Agent created');
  } catch (e: any) {
    console.log(`  ℹ️ Calculator Agent: ${e.message}`);
  }

  console.log('');

  // ===============================================
  // 6. Express サーバーの設定
  // ===============================================
  const app = express();
  app.use(express.json());

  // APIルーターを設定
  const agentRoutes = createDynamicAgentsRouter(agentManager);
  const orchestratorRoutes = createOrchestratorRouter(orchestrator);

  // エージェント管理API
  app.post('/api/v2/dynamic-agents', agentRoutes.createAgent);
  app.get('/api/v2/dynamic-agents', agentRoutes.listAgents);
  app.get('/api/v2/dynamic-agents/:id', agentRoutes.getAgent);
  app.put('/api/v2/dynamic-agents/:id', agentRoutes.updateAgent);
  app.delete('/api/v2/dynamic-agents/:id', agentRoutes.deleteAgent);
  app.post('/api/v2/dynamic-agents/:id/run', agentRoutes.runAgent);
  app.post('/api/v2/dynamic-agents/:id/chat', agentRoutes.chatWithAgent);

  // オーケストレーターAPI
  app.post('/api/v2/orchestrator/process', orchestratorRoutes.processRequest);
  app.post('/api/v2/orchestrator/route', orchestratorRoutes.analyzeRoute);
  app.post('/api/v2/orchestrator/parallel', orchestratorRoutes.runParallel);
  app.post('/api/v2/orchestrator/pipeline', orchestratorRoutes.runPipeline);
  app.get('/api/v2/orchestrator/config', orchestratorRoutes.getConfig);
  app.delete('/api/v2/orchestrator/history', orchestratorRoutes.clearHistory);

  // ヘルスチェック
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      llmConnected: connectionTest.success,
      agentCount: agentManager.getAllAgents().length,
      features: {
        dynamicAgentGeneration: true,
        proposalWorkflow: true,
      },
    });
  });

  // サーバー起動
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log('===============================================');
    console.log(`🌐 Server running on http://localhost:${PORT}`);
    console.log('===============================================\n');
    console.log('📚 Available Endpoints:\n');
    console.log('  Agent Management:');
    console.log('    POST   /api/v2/dynamic-agents          - Create agent');
    console.log('    GET    /api/v2/dynamic-agents          - List agents');
    console.log('    GET    /api/v2/dynamic-agents/:id      - Get agent');
    console.log('    PUT    /api/v2/dynamic-agents/:id      - Update agent');
    console.log('    DELETE /api/v2/dynamic-agents/:id      - Delete agent');
    console.log('    POST   /api/v2/dynamic-agents/:id/run  - Run agent');
    console.log('    POST   /api/v2/dynamic-agents/:id/chat - Chat with agent\n');
    console.log('  Orchestrator:');
    console.log('    POST   /api/v2/orchestrator/process    - Process request (with auto-generation)');
    console.log('    POST   /api/v2/orchestrator/route      - Analyze routing');
    console.log('    POST   /api/v2/orchestrator/parallel   - Run parallel');
    console.log('    POST   /api/v2/orchestrator/pipeline   - Run pipeline');
    console.log('    GET    /api/v2/orchestrator/config     - Get config');
    console.log('    DELETE /api/v2/orchestrator/history    - Clear history\n');
    console.log('===============================================\n');
  });

  // ===============================================
  // 7. 使用例（デモンストレーション）
  // ===============================================
  console.log('📝 Example Usage:\n');

  console.log('1. エージェント一覧取得:');
  console.log('   curl http://localhost:3001/api/v2/dynamic-agents\n');

  console.log('2. エージェント実行:');
  console.log('   curl -X POST http://localhost:3001/api/v2/dynamic-agents/weather-agent/run \\');
  console.log('     -H "Content-Type: application/json" \\');
  console.log('     -d \'{"task": "東京の天気を教えて"}\'\n');

  console.log('3. オーケストレーター経由でリクエスト処理:');
  console.log('   curl -X POST http://localhost:3001/api/v2/orchestrator/process \\');
  console.log('     -H "Content-Type: application/json" \\');
  console.log('     -d \'{"message": "今日の東京の天気は？"}\'\n');

  console.log('4. 動的エージェント自動生成フロー:');
  console.log('   # Step 1: 対応不可なリクエストを送信');
  console.log('   curl -X POST http://localhost:3001/api/v2/orchestrator/process \\');
  console.log('     -H "Content-Type: application/json" \\');
  console.log('     -d \'{"message": "株価を分析して", "sessionId": "test-session"}\'\n');
  console.log('   # Step 2: 提案を承認');
  console.log('   curl -X POST http://localhost:3001/api/v2/orchestrator/process \\');
  console.log('     -H "Content-Type: application/json" \\');
  console.log('     -d \'{"message": "はい", "sessionId": "test-session"}\'\n');

  console.log('5. 並列実行:');
  console.log('   curl -X POST http://localhost:3001/api/v2/orchestrator/parallel \\');
  console.log('     -H "Content-Type: application/json" \\');
  console.log('     -d \'{"tasks": [');
  console.log('       {"agentId": "weather-agent", "task": "東京の天気"},');
  console.log('       {"agentId": "translator-agent", "task": "Hello を日本語に翻訳"}');
  console.log('     ]}\'\n');

  console.log('6. パイプライン実行:');
  console.log('   curl -X POST http://localhost:3001/api/v2/orchestrator/pipeline \\');
  console.log('     -H "Content-Type: application/json" \\');
  console.log('     -d \'{"pipeline": [');
  console.log('       {"agentId": "weather-agent", "taskTemplate": "{{input}}の天気を教えて"},');
  console.log('       {"agentId": "translator-agent", "taskTemplate": "{{input}}を英語に翻訳して"}');
  console.log('     ], "initialInput": "東京"}\'\n');

  console.log('===============================================\n');
}

main().catch(console.error);
