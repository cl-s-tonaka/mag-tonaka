/**
 * 動的エージェントAPI Router
 * /api/v2/dynamic-agents エンドポイント
 */

import type { DynamicAgentManager } from '../managers/DynamicAgentManager';
import type { ApiResponse } from '../types/dynamicAgent.types';
import { validateCreateAgentRequest, validateUpdateAgentRequest } from './validators';
import { createErrorResponse, getHttpStatus } from './errorHandlers';
import { logger } from '../utils/logger';
import { randomUUID } from 'crypto';
import { FEATURE_FLAGS } from '../utils/featureFlags';

/**
 * 開発モード用のモックレスポンスを生成
 */
function generateMockResponse(agentId: string, message: string): string {
  const responses: Record<string, string[]> = {
    'greeting-agent': [
      `Hello! Welcome to the Dynamic Agent System. How can I help you today?`,
      `Hi there! I'm the Greeting Agent. Nice to meet you!`,
      `Welcome! I'm here to help you get started. What would you like to know?`,
    ],
    'code-assistant': [
      `I'd be happy to help you with your coding question! Here's my analysis:\n\n${message}\n\nLet me know if you need more details.`,
      `Great question about coding! Here's what I suggest:\n\n1. First, consider the problem scope\n2. Break it down into smaller parts\n3. Implement step by step\n\nWould you like me to elaborate?`,
    ],
    'data-analyst': [
      `Based on your query about "${message}", here's my analysis:\n\n- Data patterns suggest interesting trends\n- Statistical significance is notable\n- Recommend further investigation\n\nShall I dive deeper into any aspect?`,
      `Interesting data question! Let me analyze:\n\n1. First, we need to understand the data structure\n2. Then apply appropriate statistical methods\n3. Finally, visualize the results\n\nWhat specific insights are you looking for?`,
    ],
    'writing-assistant': [
      `I'd be happy to help with your writing! Here are my suggestions:\n\n- Consider your audience\n- Keep sentences clear and concise\n- Use active voice when possible\n\nWould you like me to review specific text?`,
      `Great topic! Here's how I'd approach writing about "${message}":\n\n1. Start with a compelling hook\n2. Develop your main points\n3. End with a strong conclusion\n\nShall I draft something?`,
    ],
    'research-agent': [
      `I'll research "${message}" for you. Here's what I found:\n\n- Multiple perspectives exist on this topic\n- Key sources suggest...\n- Further investigation recommended\n\nWould you like more detailed findings?`,
      `Interesting research topic! Based on my analysis:\n\n1. The main consensus is...\n2. Some debate exists around...\n3. Recent developments include...\n\nWhat aspect interests you most?`,
    ],
  };

  const agentResponses = responses[agentId] || [
    `Thank you for your message: "${message}"\n\nI'm currently running in development mode without an LLM connection. In production, I would provide a more detailed response based on my instructions.`,
  ];

  return agentResponses[Math.floor(Math.random() * agentResponses.length)];
}

/**
 * Express Router を作成（簡易実装）
 *
 * 注意: この実装は Express.js を前提としています。
 * 実際の使用には Express パッケージが必要です。
 */
export function createDynamicAgentsRouter(manager: DynamicAgentManager): any {
  // 実際の実装では Express Router を使用
  // const router = express.Router();

  const routes = {
    /**
     * POST /api/v2/dynamic-agents
     * エージェントを作成
     */
    createAgent: async (req: any, res: any) => {
      const requestId = randomUUID();
      logger.info('POST /api/v2/dynamic-agents', { requestId });

      try {
        // リクエストバリデーション
        const request = validateCreateAgentRequest(req.body);

        // エージェント作成
        const agent = await manager.createAgent(request);

        // レスポンス
        const response: ApiResponse = {
          success: true,
          data: {
            agentId: request.agentId,
            displayName: request.displayName,
            status: 'active',
            version: 1,
            createdAt: new Date().toISOString(),
          },
        };

        res.status(201).json(response);
      } catch (error: any) {
        const errorResponse = createErrorResponse(error, requestId);
        const status = getHttpStatus(errorResponse.error!.code);
        res.status(status).json(errorResponse);
      }
    },

    /**
     * GET /api/v2/dynamic-agents
     * エージェント一覧を取得
     */
    listAgents: async (req: any, res: any) => {
      const requestId = randomUUID();
      logger.info('GET /api/v2/dynamic-agents', { requestId });

      try {
        // クエリパラメータ
        const status = req.query.status;
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;

        // エージェント一覧取得（簡易実装）
        const agents = manager.getAllAgents();

        // レスポンス
        const response: ApiResponse = {
          success: true,
          data: {
            agents: agents.map((agent: any) => ({
              agentId: agent.name,
              displayName: agent.getInfo?.().displayName || agent.name,
              description: agent.getInfo?.().description || '',
              status: 'active',
              version: 1,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })),
            pagination: {
              total: agents.length,
              limit,
              offset,
              hasMore: false,
            },
          },
        };

        res.status(200).json(response);
      } catch (error: any) {
        const errorResponse = createErrorResponse(error, requestId);
        const status = getHttpStatus(errorResponse.error!.code);
        res.status(status).json(errorResponse);
      }
    },

    /**
     * GET /api/v2/dynamic-agents/:id
     * エージェント詳細を取得
     */
    getAgent: async (req: any, res: any) => {
      const requestId = randomUUID();
      const agentId = req.params.id;
      logger.info('GET /api/v2/dynamic-agents/:id', { requestId, agentId });

      try {
        // エージェント取得
        const agent = manager.getAgent(agentId);

        if (!agent) {
          throw new Error(`Agent with ID '${agentId}' not found`);
        }

        // レスポンス
        const info = agent.getInfo?.() || {};
        const response: ApiResponse = {
          success: true,
          data: {
            agentId: agent.name,
            displayName: info.displayName || agent.name,
            description: info.description || '',
            instructions: agent.instructions || '',
            model: agent.model || 'openai/gpt-4o-mini',
            status: 'active',
            version: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tools: info.tools || [],
            testExamples: [],
          },
        };

        res.status(200).json(response);
      } catch (error: any) {
        const errorResponse = createErrorResponse(error, requestId);
        const status = getHttpStatus(errorResponse.error!.code);
        res.status(status).json(errorResponse);
      }
    },

    /**
     * PUT /api/v2/dynamic-agents/:id
     * エージェントを更新
     */
    updateAgent: async (req: any, res: any) => {
      const requestId = randomUUID();
      const agentId = req.params.id;
      logger.info('PUT /api/v2/dynamic-agents/:id', { requestId, agentId });

      try {
        // リクエストバリデーション
        const request = validateUpdateAgentRequest(req.body);

        // エージェント更新
        const agent = await manager.updateAgent(agentId, request);

        // レスポンス
        const response: ApiResponse = {
          success: true,
          data: {
            agentId,
            version: 2,
            updatedAt: new Date().toISOString(),
          },
        };

        res.status(200).json(response);
      } catch (error: any) {
        const errorResponse = createErrorResponse(error, requestId);
        const status = getHttpStatus(errorResponse.error!.code);
        res.status(status).json(errorResponse);
      }
    },

    /**
     * DELETE /api/v2/dynamic-agents/:id
     * エージェントを削除
     */
    deleteAgent: async (req: any, res: any) => {
      const requestId = randomUUID();
      const agentId = req.params.id;
      logger.info('DELETE /api/v2/dynamic-agents/:id', { requestId, agentId });

      try {
        // エージェント削除
        await manager.deleteAgent(agentId);

        // レスポンス
        const response: ApiResponse = {
          success: true,
          data: {
            message: `Agent '${agentId}' deleted successfully`,
          },
        };

        res.status(200).json(response);
      } catch (error: any) {
        const errorResponse = createErrorResponse(error, requestId);
        const status = getHttpStatus(errorResponse.error!.code);
        res.status(status).json(errorResponse);
      }
    },

    /**
     * POST /api/v2/dynamic-agents/:id/run
     * エージェントを実行（プロンプト実行）
     */
    runAgent: async (req: any, res: any) => {
      const requestId = randomUUID();
      const agentId = req.params.id;
      logger.info('POST /api/v2/dynamic-agents/:id/run', { requestId, agentId });

      try {
        // エージェント取得
        const agent = manager.getAgent(agentId);

        if (!agent) {
          throw new Error(`Agent with ID '${agentId}' not found`);
        }

        // リクエストボディからタスクとコンテキストを取得
        const { task, context } = req.body;

        if (!task || typeof task !== 'string') {
          throw new Error('task is required and must be a string');
        }

        let output: string;
        let toolCalls: unknown[] = [];
        let model = agent.model;

        // 開発モードではモックレスポンスを使用
        if (FEATURE_FLAGS.ENABLE_DEV_MODE) {
          logger.info('Using mock response (dev mode)', { agentId });
          output = generateMockResponse(agentId, task);
        } else {
          // エージェントを実行
          const result = await agent.run(task, context);
          output = result.output;
          toolCalls = result.toolCalls || [];
          model = result.model || agent.model;
        }

        // レスポンス
        const response: ApiResponse = {
          success: true,
          data: {
            agentId,
            output,
            toolCalls,
            model,
            executedAt: new Date().toISOString(),
          },
        };

        res.status(200).json(response);
      } catch (error: any) {
        const errorResponse = createErrorResponse(error, requestId);
        const status = getHttpStatus(errorResponse.error!.code);
        res.status(status).json(errorResponse);
      }
    },

    /**
     * POST /api/v2/dynamic-agents/:id/chat
     * エージェントとチャット（会話履歴を維持）
     */
    chatWithAgent: async (req: any, res: any) => {
      const requestId = randomUUID();
      const agentId = req.params.id;
      logger.info('POST /api/v2/dynamic-agents/:id/chat', { requestId, agentId });

      try {
        // エージェント取得
        const agent = manager.getAgent(agentId);

        if (!agent) {
          throw new Error(`Agent with ID '${agentId}' not found`);
        }

        // リクエストボディからメッセージを取得
        const { message, clearHistory } = req.body;

        if (!message || typeof message !== 'string') {
          throw new Error('message is required and must be a string');
        }

        // 履歴クリアが要求された場合
        if (clearHistory && agent.clearHistory) {
          agent.clearHistory();
        }

        let output: string;
        let toolCalls: unknown[] = [];

        // 開発モードではモックレスポンスを使用
        if (FEATURE_FLAGS.ENABLE_DEV_MODE) {
          logger.info('Using mock response (dev mode)', { agentId });
          output = generateMockResponse(agentId, message);
        } else {
          // エージェントを実行
          const result = await agent.run(message);
          output = result.output;
          toolCalls = result.toolCalls || [];
        }

        // レスポンス
        const response: ApiResponse = {
          success: true,
          data: {
            agentId,
            response: output,
            toolCalls,
            conversationHistory: agent.getHistory?.() || [],
          },
        };

        res.status(200).json(response);
      } catch (error: any) {
        const errorResponse = createErrorResponse(error, requestId);
        const status = getHttpStatus(errorResponse.error!.code);
        res.status(status).json(errorResponse);
      }
    },
  };

  return routes;
}

export default createDynamicAgentsRouter;
