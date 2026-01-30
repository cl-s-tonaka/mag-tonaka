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

        // エージェントを実行
        const result = await agent.run(task, context);

        // レスポンス
        const response: ApiResponse = {
          success: true,
          data: {
            agentId,
            output: result.output,
            toolCalls: result.toolCalls || [],
            model: result.model || agent.model,
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

        // エージェントを実行
        const result = await agent.run(message);

        // レスポンス
        const response: ApiResponse = {
          success: true,
          data: {
            agentId,
            response: result.output,
            toolCalls: result.toolCalls || [],
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
